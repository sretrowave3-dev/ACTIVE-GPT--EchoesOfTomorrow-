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
  constructor(clock, state, validator, dispatcher, diagnosticsCollector = null) {
    this._clock = clock;
    this._state = state;
    this._validator = validator;
    this._dispatcher = dispatcher;
    this._diagnostics = diagnosticsCollector;
  }

  /**
   * Process all events in the ready queue whose fire time is ≤ current time.
   * Should be called once per simulation frame.
   */
  update() {
    const currentTime = this._clock.getCurrentTime();
    const readyQueue = this._state.getReadyQueue();

    this._diagnostics?.setQueueSize(readyQueue.size());
    this._diagnostics?.setDependencyCount(this._state.getUnresolvedDependencyCount());
    this._diagnostics?.setSimulationTime(currentTime);

    while (true) {
      const event = readyQueue.peek();
      if (!event || event.fireTime > currentTime) {
        break;
      }

      readyQueue.dequeue();

      // Validate the event.
      event.validate();
      this._diagnostics?.recordValidated?.();
      if (!this._validator(event)) {
        event.validationFailed();
        this._diagnostics?.recordValidationFailed();
        this._state.removeEvent(event.id);
        continue;
      }

      // Execute.
      event.execute();
      this._diagnostics?.recordExecuted();
      this._dispatcher(event);

      // Complete and resolve dependencies.
      event.complete();
      this._diagnostics?.recordCompleted();
      this._state.markCompleted(event.id);
    }
  }
}