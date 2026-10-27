// src/time/TimeSerializer.js

import { WorldClock } from './WorldClock.js';
import { SchedulerState } from './SchedulerState.js';

/**
 * Handles persistence of the Time System by orchestrating the serialization
 * of the WorldClock and SchedulerState.  No knowledge of internal structures
 * is required.
 */
export class TimeSerializer {
  /**
   * Serialize the entire Time System state.
   * @param {WorldClock} clock
   * @param {SchedulerState} state
   * @returns {object}
   */
  static serialize(clock, state) {
    return {
      clock: clock.serialize(),
      scheduler: state.serialize()
    };
  }

  /**
   * Deserialize and apply the data to the given clock and state.
   * @param {object} data
   * @param {WorldClock} clock
   * @param {SchedulerState} state
   */
  static deserialize(data, clock, state) {
    clock.deserialize(data.clock);
    state.deserialize(data.scheduler);
  }
}