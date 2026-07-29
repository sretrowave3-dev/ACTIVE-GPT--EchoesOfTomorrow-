<<<<<<< HEAD
// src/time/DiagnosticsCollector.js

/**
 * Passive collector of runtime statistics for the Time System.
 *
 * Tracks counts of scheduled, executed, completed, cancelled, and
 * validation‑failed events, as well as current queue sizes and
 * simulation time.  Provides a snapshot for debug overlays.
 *
 * Does NOT modify any scheduler state and does NOT contain scheduling logic.
 */
export class DiagnosticsCollector {
  constructor() {
    this._registered = 0;
    this._executed = 0;
    this._completed = 0;
    this._cancelled = 0;
    this._validationFailures = 0;
    this._queueSize = 0;
    this._dependencyCount = 0;
    this._simulationTime = 0;
  }

  /** Increment the registered event counter. */
  recordRegistered() {
    this._registered++;
  }

  /** Increment the executed event counter. */
  recordExecuted() {
    this._executed++;
  }

  /** Increment the completed event counter. */
  recordCompleted() {
    this._completed++;
  }

  /** Increment the cancelled event counter. */
  recordCancelled() {
    this._cancelled++;
  }

  /** Increment the validation failure counter. */
  recordValidationFailed() {
    this._validationFailures++;
  }

  /**
   * Set the current number of events in the ready queue.
   * @param {number} size
   */
  setQueueSize(size) {
    this._queueSize = size;
  }

  /**
   * Set the current number of waiting dependencies.
   * @param {number} count
   */
  setDependencyCount(count) {
    this._dependencyCount = count;
  }

  /**
   * Set the current simulation time (seconds).
   * @param {number} time
   */
  setSimulationTime(time) {
    this._simulationTime = time;
  }

  /**
   * Return a snapshot of all collected statistics.
   * @returns {{
   *   registered: number,
   *   executed: number,
   *   completed: number,
   *   cancelled: number,
   *   validationFailures: number,
   *   queueSize: number,
   *   dependencyCount: number,
   *   simulationTime: number
   * }}
   */
  getSnapshot() {
    return {
      registered: this._registered,
      executed: this._executed,
      completed: this._completed,
      cancelled: this._cancelled,
      validationFailures: this._validationFailures,
      queueSize: this._queueSize,
      dependencyCount: this._dependencyCount,
      simulationTime: this._simulationTime
    };
  }

  /** Reset all counters to zero. */
  reset() {
    this._registered = 0;
    this._executed = 0;
    this._completed = 0;
    this._cancelled = 0;
    this._validationFailures = 0;
    this._queueSize = 0;
    this._dependencyCount = 0;
    this._simulationTime = 0;
  }
=======
// src/time/DiagnosticsCollector.js

/**
 * Passive collector of runtime statistics for the Time System.
 *
 * Tracks counts of scheduled, executed, completed, cancelled, and
 * validation‑failed events, as well as current queue sizes and
 * simulation time.  Provides a snapshot for debug overlays.
 *
 * Does NOT modify any scheduler state and does NOT contain scheduling logic.
 */
export class DiagnosticsCollector {
  constructor() {
    this._registered = 0;
    this._executed = 0;
    this._completed = 0;
    this._cancelled = 0;
    this._validationFailures = 0;
    this._queueSize = 0;
    this._dependencyCount = 0;
    this._simulationTime = 0;
  }

  /** Increment the registered event counter. */
  recordRegistered() {
    this._registered++;
  }

  /** Increment the executed event counter. */
  recordExecuted() {
    this._executed++;
  }

  /** Increment the completed event counter. */
  recordCompleted() {
    this._completed++;
  }

  /** Increment the cancelled event counter. */
  recordCancelled() {
    this._cancelled++;
  }

  /** Increment the validation failure counter. */
  recordValidationFailed() {
    this._validationFailures++;
  }

  /**
   * Set the current number of events in the ready queue.
   * @param {number} size
   */
  setQueueSize(size) {
    this._queueSize = size;
  }

  /**
   * Set the current number of waiting dependencies.
   * @param {number} count
   */
  setDependencyCount(count) {
    this._dependencyCount = count;
  }

  /**
   * Set the current simulation time (seconds).
   * @param {number} time
   */
  setSimulationTime(time) {
    this._simulationTime = time;
  }

  /**
   * Return a snapshot of all collected statistics.
   * @returns {{
   *   registered: number,
   *   executed: number,
   *   completed: number,
   *   cancelled: number,
   *   validationFailures: number,
   *   queueSize: number,
   *   dependencyCount: number,
   *   simulationTime: number
   * }}
   */
  getSnapshot() {
    return {
      registered: this._registered,
      executed: this._executed,
      completed: this._completed,
      cancelled: this._cancelled,
      validationFailures: this._validationFailures,
      queueSize: this._queueSize,
      dependencyCount: this._dependencyCount,
      simulationTime: this._simulationTime
    };
  }

  /** Reset all counters to zero. */
  reset() {
    this._registered = 0;
    this._executed = 0;
    this._completed = 0;
    this._cancelled = 0;
    this._validationFailures = 0;
    this._queueSize = 0;
    this._dependencyCount = 0;
    this._simulationTime = 0;
  }
>>>>>>> 2f42efe7e19574d94df56c89784f42d3d4e2c85a
}