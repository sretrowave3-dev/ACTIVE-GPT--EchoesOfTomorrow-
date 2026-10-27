// src/network/SnapshotInterpolator.js

/**
 * @fileoverview SnapshotInterpolator provides jitter-free smooth state interpolation
 * and dead-reckoning extrapolation for remote replicated entities, matching AAA engine
 * network standards (Unreal Engine replication smoothing / Source engine interpolation).
 */

/**
 * @typedef {Object} EntitySnapshot
 * @property {number} timestamp - Server world timestamp in milliseconds when snapshot was recorded.
 * @property {number} sequence - Sequence number of the authoritative state packet.
 * @property {[number, number, number]} position - [x, y, z] coordinates.
 * @property {[number, number, number, number]} rotation - [x, y, z, w] quaternion.
 * @property {[number, number, number]} [velocity] - [vx, vy, vz] velocity vector.
 */

export class SnapshotInterpolator {
  /**
   * @param {Object} [options]
   * @param {number} [options.renderDelayMs=100] - Render delay window (interpolation buffer delay).
   * @param {number} [options.maxExtrapolationMs=250] - Maximum dead-reckoning extrapolation limit.
   * @param {number} [options.bufferLifetimeMs=1500] - Age threshold after which old snapshots are pruned.
   */
  constructor(options = {}) {
    this.renderDelayMs = options.renderDelayMs ?? 100;
    this.maxExtrapolationMs = options.maxExtrapolationMs ?? 250;
    this.bufferLifetimeMs = options.bufferLifetimeMs ?? 1500;

    /** @type {Map<string, EntitySnapshot[]>} Map from netId to ordered snapshot buffer. */
    this._buffers = new Map();
  }

  /**
   * Add a new authoritative snapshot for an entity.
   * @param {string} netId - Unique network entity identifier.
   * @param {EntitySnapshot} snapshot
   */
  pushSnapshot(netId, snapshot) {
    if (!this._buffers.has(netId)) {
      this._buffers.set(netId, []);
    }

    const buffer = this._buffers.get(netId);

    // Ensure monotonically increasing timestamp order
    if (buffer.length > 0 && snapshot.timestamp <= buffer[buffer.length - 1].timestamp) {
      // Discard out-of-order or duplicate older snapshot
      return;
    }

    buffer.push({
      timestamp: snapshot.timestamp,
      sequence: snapshot.sequence ?? 0,
      position: [...snapshot.position],
      rotation: [...(snapshot.rotation || [0, 0, 0, 1])],
      velocity: [...(snapshot.velocity || [0, 0, 0])]
    });

    // Prune old snapshots beyond buffer lifetime
    const oldestAllowed = snapshot.timestamp - this.bufferLifetimeMs;
    while (buffer.length > 2 && buffer[0].timestamp < oldestAllowed) {
      buffer.shift();
    }
  }

  /**
   * Remove an entity's snapshot buffer when destroyed or despawned.
   * @param {string} netId
   */
  removeEntity(netId) {
    this._buffers.delete(netId);
  }

  /**
   * Interpolate or extrapolate the transform for a given entity at a specific simulation time.
   * @param {string} netId
   * @param {number} currentServerTimeMs - Authoritative current server time estimate.
   * @returns {{ position: [number, number, number], rotation: [number, number, number, number], velocity: [number, number, number], isExtrapolating: boolean }|null}
   */
  sample(netId, currentServerTimeMs) {
    const buffer = this._buffers.get(netId);
    if (!buffer || buffer.length === 0) {
      return null;
    }

    // Target render time delayed by interpolation buffer
    const targetTime = currentServerTimeMs - this.renderDelayMs;

    // Only 1 snapshot available: return directly
    if (buffer.length === 1) {
      const snap = buffer[0];
      return {
        position: [...snap.position],
        rotation: [...snap.rotation],
        velocity: [...snap.velocity],
        isExtrapolating: false
      };
    }

    const oldest = buffer[0];
    const newest = buffer[buffer.length - 1];

    // Case 1: Target time is older than our oldest snapshot in the buffer
    if (targetTime <= oldest.timestamp) {
      return {
        position: [...oldest.position],
        rotation: [...oldest.rotation],
        velocity: [...oldest.velocity],
        isExtrapolating: false
      };
    }

    // Case 2: Target time is newer than newest snapshot (buffer starvation / lag spike)
    if (targetTime > newest.timestamp) {
      const extrapolationDt = (targetTime - newest.timestamp) / 1000.0;
      const clampedDt = Math.min(extrapolationDt, this.maxExtrapolationMs / 1000.0);

      // Dead-reckoning: Pos = Pos_new + Vel * dt
      const pos = [
        newest.position[0] + newest.velocity[0] * clampedDt,
        newest.position[1] + newest.velocity[1] * clampedDt,
        newest.position[2] + newest.velocity[2] * clampedDt
      ];

      return {
        position: pos,
        rotation: [...newest.rotation],
        velocity: [...newest.velocity],
        isExtrapolating: true
      };
    }

    // Case 3: Target time is within the buffer window -> interpolate between S_prev and S_next
    let prev = buffer[0];
    let next = buffer[1];

    for (let i = 0; i < buffer.length - 1; i++) {
      if (buffer[i].timestamp <= targetTime && targetTime <= buffer[i + 1].timestamp) {
        prev = buffer[i];
        next = buffer[i + 1];
        break;
      }
    }

    const span = next.timestamp - prev.timestamp;
    const alpha = span > 0 ? (targetTime - prev.timestamp) / span : 0;

    // Linear interpolation for position
    const position = [
      prev.position[0] + (next.position[0] - prev.position[0]) * alpha,
      prev.position[1] + (next.position[1] - prev.position[1]) * alpha,
      prev.position[2] + (next.position[2] - prev.position[2]) * alpha
    ];

    // Linear interpolation for velocity
    const velocity = [
      prev.velocity[0] + (next.velocity[0] - prev.velocity[0]) * alpha,
      prev.velocity[1] + (next.velocity[1] - prev.velocity[1]) * alpha,
      prev.velocity[2] + (next.velocity[2] - prev.velocity[2]) * alpha
    ];

    // NLERP (Normalized Linear Interpolation) for Quaternions with shortest path
    const rotation = this._nlerpQuaternion(prev.rotation, next.rotation, alpha);

    return {
      position,
      rotation,
      velocity,
      isExtrapolating: false
    };
  }

  /**
   * Normalized linear interpolation for quaternions [x, y, z, w].
   * Takes the shortest angular path on the 4D hypersphere.
   * @param {[number, number, number, number]} q1
   * @param {[number, number, number, number]} q2
   * @param {number} t
   * @returns {[number, number, number, number]}
   * @private
   */
  _nlerpQuaternion(q1, q2, t) {
    let dot = q1[0] * q2[0] + q1[1] * q2[1] + q1[2] * q2[2] + q1[3] * q2[3];
    const sign = dot < 0 ? -1 : 1;

    let x = q1[0] + (q2[0] * sign - q1[0]) * t;
    let y = q1[1] + (q2[1] * sign - q1[1]) * t;
    let z = q1[2] + (q2[2] * sign - q1[2]) * t;
    let w = q1[3] + (q2[3] * sign - q1[3]) * t;

    const len = Math.sqrt(x * x + y * y + z * z + w * w);
    if (len > 0.00001) {
      const invLen = 1.0 / len;
      return [x * invLen, y * invLen, z * invLen, w * invLen];
    }
    return [0, 0, 0, 1];
  }

  /**
   * Clear all stored snapshot buffers.
   */
  clear() {
    this._buffers.clear();
  }
}
