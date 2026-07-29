<<<<<<< HEAD
// src/time/EventScheduler.js

import { WorldClock } from './WorldClock.js';
import { SchedulerState } from './SchedulerState.js';

/**
 * Runtime execution engine for scheduled events.
 *
 * Owns references to the WorldClock, SchedulerState, a validator function,
 * and a dispatcher callback.  Its single responsibility is to process
 * events that are due each frame.
 *
 * Lifecycle transitions performed:
 *   Queued → Validated (event.validate())
 *   Validated → Executed (event.execute())
 *   Executed → Completed (event.complete())
 *
 * After successful completion, `SchedulerState.markCompleted()` is called
 * to resolve dependencies and unblock waiting events.
 *
 * Validation failures result in the event being cancelled and removed
 * from the SchedulerState.
 */
export class EventScheduler {
  /**
   * @param {WorldClock} clock
   * @param {SchedulerState} state
   * @param {function(import('./ScheduledEvent.js').ScheduledEvent): boolean} validator
   * @param {function(import('./ScheduledEvent.js').ScheduledEvent): void} dispatcher
   */
  constructor(clock, state, validator, dispatcher) {
    this._clock = clock;
    this._state = state;
    this._validator = validator;
    this._dispatcher = dispatcher;
  }

  /**
   * Process all events in the ready queue whose fire time is ≤ current time.
   * Should be called once per simulation frame.
   */
  update() {
    const currentTime = this._clock.getCurrentTime();
    const readyQueue = this._state.getReadyQueue();

    while (true) {
      const event = readyQueue.peek();
      if (!event || event.fireTime > currentTime) {
        break;
      }

      readyQueue.dequeue();

      // Validate the event.
      event.validate();
      if (!this._validator(event)) {
        event.validationFailed();
        this._state.removeEvent(event.id);
        continue;
      }

      // Execute.
      event.execute();
      this._dispatcher(event);

      // Complete and resolve dependencies.
      event.complete();
      this._state.markCompleted(event.id);
    }
  }
=======
// src/time/EventScheduler.js

import { WorldClock } from './WorldClock.js';
import { SchedulerState } from './SchedulerState.js';

/**
 * Runtime execution engine for scheduled events.
 *
 * Owns references to the WorldClock, SchedulerState, a validator function,
 * and a dispatcher callback.  Its single responsibility is to process
 * events that are due each frame.
 *
 * Lifecycle transitions performed:
 *   Queued → Validated (event.validate())
 *   Validated → Executed (event.execute())
 *   Executed → Completed (event.complete())
 *
 * After successful completion, `SchedulerState.markCompleted()` is called
 * to resolve dependencies and unblock waiting events.
 *
 * Validation failures result in the event being cancelled and removed
 * from the SchedulerState.
 */
export class EventScheduler {
  /**
   * @param {WorldClock} clock
   * @param {SchedulerState} state
   * @param {function(import('./ScheduledEvent.js').ScheduledEvent): boolean} validator
   * @param {function(import('./ScheduledEvent.js').ScheduledEvent): void} dispatcher
   */
  constructor(clock, state, validator, dispatcher) {
    this._clock = clock;
    this._state = state;
    this._validator = validator;
    this._dispatcher = dispatcher;
  }

  /**
   * Process all events in the ready queue whose fire time is ≤ current time.
   * Should be called once per simulation frame.
   */
  update() {
    const currentTime = this._clock.getCurrentTime();
    const readyQueue = this._state.getReadyQueue();

    while (true) {
      const event = readyQueue.peek();
      if (!event || event.fireTime > currentTime) {
        break;
      }

      readyQueue.dequeue();

      // Validate the event.
      event.validate();
      if (!this._validator(event)) {
        event.validationFailed();
        this._state.removeEvent(event.id);
        continue;
      }

      // Execute.
      event.execute();
      this._dispatcher(event);

      // Complete and resolve dependencies.
      event.complete();
      this._state.markCompleted(event.id);
    }
  }
>>>>>>> 2f42efe7e19574d94df56c89784f42d3d4e2c85a
}