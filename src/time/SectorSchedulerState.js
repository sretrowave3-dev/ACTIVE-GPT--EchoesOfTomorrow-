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
}