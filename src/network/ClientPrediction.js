// src/network/ClientPrediction.js

/**
 * @fileoverview ClientPrediction implements client-side movement prediction and
 * authoritative server reconciliation, matching the industry-standard algorithm
 * in Unreal Engine's CharacterMovementComponent and Valve's Source engine.
 */

/**
 * @typedef {Object} InputCommand
 * @property {number} sequence - Monotonic sequence ID for this input command.
 * @property {number} dt - Delta time for this input tick in seconds.
 * @property {Object} inputs - Input states (e.g. forward, right, jump, sprint, crouch).
 * @property {[number, number, number]} predictedPosition - Resulting position after client simulation.
 * @property {[number, number, number]} predictedVelocity - Resulting velocity after client simulation.
 */

/**
 * @typedef {Object} ServerStateUpdate
 * @property {number} lastProcessedSequence - The sequence number of the last input processed by the server.
 * @property {[number, number, number]} position - Authoritative server position.
 * @property {[number, number, number]} velocity - Authoritative server velocity.
 * @property {number} [timestamp] - Server timestamp.
 */

export class ClientPrediction {
  /**
   * @param {Object} [options]
   * @param {number} [options.reconciliationThreshold=0.04] - Distance error threshold in units before triggering replay.
   * @param {number} [options.maxBufferedInputs=120] - Maximum history length to prevent unbounded growth.
   */
  constructor(options = {}) {
    this.reconciliationThreshold = options.reconciliationThreshold ?? 0.04;
    this.maxBufferedInputs = options.maxBufferedInputs ?? 120;

    this.currentSequence = 0;
    /** @type {InputCommand[]} */
    this.unacknowledgedInputs = [];

    /** Current predicted state of the local autonomous actor */
    this.predictedState = {
      position: [0, 0, 0],
      velocity: [0, 0, 0]
    };

    this.stats = {
      predictionsMade: 0,
      reconciliationsTriggered: 0,
      inputsReplayed: 0,
      maxObservedError: 0
    };
  }

  /**
   * Reset prediction state to an initial transform.
   * @param {[number, number, number]} position
   * @param {[number, number, number]} [velocity=[0, 0, 0]]
   */
  reset(position, velocity = [0, 0, 0]) {
    this.currentSequence = 0;
    this.unacknowledgedInputs.length = 0;
    this.predictedState.position = [...position];
    this.predictedState.velocity = [...velocity];
  }

  /**
   * Client-side prediction step. Predicts character movement immediately
   * and stores the unacknowledged input command.
   *
   * @param {Object} inputs - Active input values (forward, right, jump, etc.).
   * @param {number} dt - Delta time in seconds.
   * @param {(state: { position: [number, number, number], velocity: [number, number, number] }, inputs: Object, dt: number) => void} simulationStepFn
   * @returns {InputCommand} The input command packet to send to the server.
   */
  predict(inputs, dt, simulationStepFn) {
    this.currentSequence++;
    this.stats.predictionsMade++;

    // Execute local kinematic simulation step
    simulationStepFn(this.predictedState, inputs, dt);

    /** @type {InputCommand} */
    const command = {
      sequence: this.currentSequence,
      dt,
      inputs: { ...inputs },
      predictedPosition: [...this.predictedState.position],
      predictedVelocity: [...this.predictedState.velocity]
    };

    this.unacknowledgedInputs.push(command);

    // Keep buffer bounded
    if (this.unacknowledgedInputs.length > this.maxBufferedInputs) {
      this.unacknowledgedInputs.shift();
    }

    return command;
  }

  /**
   * Reconcile client state with authoritative server update.
   * If server position diverges beyond threshold, client rolls back and replays remaining inputs.
   *
   * @param {ServerStateUpdate} serverState
   * @param {(state: { position: [number, number, number], velocity: [number, number, number] }, inputs: Object, dt: number) => void} simulationStepFn
   * @returns {{ reconciled: boolean, errorDistance: number, replayedCount: number }}
   */
  reconcile(serverState, simulationStepFn) {
    const ackSeq = serverState.lastProcessedSequence;

    // Find the historical command corresponding to the server's acknowledged sequence
    const ackIndex = this.unacknowledgedInputs.findIndex(cmd => cmd.sequence === ackSeq);

    if (ackIndex === -1) {
      // The acknowledged input is either already pruned or out of order
      return { reconciled: false, errorDistance: 0, replayedCount: 0 };
    }

    const acknowledgedCmd = this.unacknowledgedInputs[ackIndex];

    // Calculate Euclidean distance between predicted position and authoritative server position
    const dx = serverState.position[0] - acknowledgedCmd.predictedPosition[0];
    const dy = serverState.position[1] - acknowledgedCmd.predictedPosition[1];
    const dz = serverState.position[2] - acknowledgedCmd.predictedPosition[2];
    const errorDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (errorDistance > this.stats.maxObservedError) {
      this.stats.maxObservedError = errorDistance;
    }

    // Prune all acknowledged inputs up to and including ackIndex
    this.unacknowledgedInputs.splice(0, ackIndex + 1);

    // Check if error exceeds tolerance threshold
    if (errorDistance > this.reconciliationThreshold) {
      this.stats.reconciliationsTriggered++;

      // Roll back predicted state to authoritative server state
      this.predictedState.position = [...serverState.position];
      this.predictedState.velocity = [...serverState.velocity];

      // Replay all remaining unacknowledged inputs from the corrected server baseline
      const replayedCount = this.unacknowledgedInputs.length;
      for (let i = 0; i < replayedCount; i++) {
        const cmd = this.unacknowledgedInputs[i];
        simulationStepFn(this.predictedState, cmd.inputs, cmd.dt);

        // Update the cached predicted transform for this replayed command
        cmd.predictedPosition = [...this.predictedState.position];
        cmd.predictedVelocity = [...this.predictedState.velocity];
      }

      this.stats.inputsReplayed += replayedCount;

      return {
        reconciled: true,
        errorDistance,
        replayedCount
      };
    }

    // Prediction was accurate within threshold; no replay required
    return {
      reconciled: false,
      errorDistance,
      replayedCount: 0
    };
  }

  /**
   * @returns {Object} Diagnostic performance metrics for client prediction.
   */
  getStats() {
    return {
      ...this.stats,
      bufferedInputCount: this.unacknowledgedInputs.length,
      currentSequence: this.currentSequence
    };
  }
}
