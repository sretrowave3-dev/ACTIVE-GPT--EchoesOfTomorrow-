// src/time/WorldClock.js

/**
 * Owns the simulation clock for the Time System.
 *
 * Provides deterministic advancement of simulation time, pause/resume,
 * and direct time setting (e.g. for loading saves).
 * The clock does **not** know about events, queues, or scheduling.
 */
export class WorldClock {
  constructor(initialTime = 0) {
    /** Current simulation time (seconds). */
    this._currentTime = initialTime;
    /** Whether the clock is currently paused. */
    this._paused = false;
  }

  /**
   * Advance the simulation time by a delta, if not paused.
   *
   * @param {number} deltaTime – real‑time delta in seconds (must be ≥ 0).
   */
  advance(deltaTime) {
    if (!this._paused && deltaTime > 0) {
      this._currentTime += deltaTime;
    }
  }

  /**
   * Return the current simulation time.
   *
   * @returns {number}
   */
  getCurrentTime() {
    return this._currentTime;
  }

  /**
   * Set the simulation time to a specific value (e.g. for loading a save).
   *
   * @param {number} time
   */
  setCurrentTime(time) {
    this._currentTime = time;
  }

  /**
   * Pause the clock – subsequent calls to `advance` will have no effect.
   */
  pause() {
    this._paused = true;
  }

  /**
   * Resume the clock.
   */
  resume() {
    this._paused = false;
  }

  /**
   * Check whether the clock is currently paused.
   *
   * @returns {boolean}
   */
  isPaused() {
    return this._paused;
  }

  /**
   * Reset the clock to time zero and unpause.
   */
  reset() {
    this._currentTime = 0;
    this._paused = false;
  }
}