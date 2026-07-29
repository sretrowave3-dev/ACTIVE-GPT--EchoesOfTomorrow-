<<<<<<< HEAD
// src/time/SectorSchedulerState.js

import { SchedulerState } from './SchedulerState.js';

/**
 * Lightweight wrapper that owns a SchedulerState for a single streamed
 * world sector.
 */
export class SectorSchedulerState {
  /**
   * @param {string} sectorId
   */
  constructor(sectorId) {
    /** @readonly */
    this.sectorId = sectorId;
    /** @type {SchedulerState} */
    this.schedulerState = new SchedulerState();
  }

  /**
   * Returns the underlying SchedulerState.
   * @returns {SchedulerState}
   */
  getState() {
    return this.schedulerState;
  }

  /**
   * Clear all events and reset.
   */
  clear() {
    this.schedulerState.clear();
  }
=======
// src/time/SectorSchedulerState.js

import { SchedulerState } from './SchedulerState.js';

/**
 * Lightweight wrapper that owns a SchedulerState for a single streamed
 * world sector.
 */
export class SectorSchedulerState {
  /**
   * @param {string} sectorId
   */
  constructor(sectorId) {
    /** @readonly */
    this.sectorId = sectorId;
    /** @type {SchedulerState} */
    this.schedulerState = new SchedulerState();
  }

  /**
   * Returns the underlying SchedulerState.
   * @returns {SchedulerState}
   */
  getState() {
    return this.schedulerState;
  }

  /**
   * Clear all events and reset.
   */
  clear() {
    this.schedulerState.clear();
  }
>>>>>>> 2f42efe7e19574d94df56c89784f42d3d4e2c85a
}