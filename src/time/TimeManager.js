<<<<<<< HEAD
// src/time/TimeManager.js

import { WorldClock } from './WorldClock.js';
import { SchedulerState } from './SchedulerState.js';
import { EventScheduler } from './EventScheduler.js';
import { ScheduledEvent } from './ScheduledEvent.js';

/**
 * Public façade for the entire Time System.
 *
 * Owns and wires together the WorldClock, SchedulerState, and EventScheduler.
 * External systems interact with the Time System exclusively through this class.
 */
export class TimeManager {
  /**
   * @param {function(ScheduledEvent): boolean} validator – validates an event before execution
   * @param {function(ScheduledEvent): void} dispatcher – executes the event (e.g. publishes to EventBus)
   */
  constructor(validator, dispatcher) {
    this._clock = new WorldClock();
    this._state = new SchedulerState();
    this._scheduler = new EventScheduler(this._clock, this._state, validator, dispatcher);
  }

  /**
   * Advance simulation time and process due events.
   *
   * @param {number} deltaTime – real‑time delta in seconds.
   */
  update(deltaTime) {
    this._clock.advance(deltaTime);
    this._scheduler.update();
  }

  /**
   * Register a new scheduled event.
   *
   * The event must already be populated with its dependencies, validators,
   * fire time, priority, payload, etc.  The manager assigns identity and
   * queues it if ready.
   *
   * @param {ScheduledEvent} event
   * @returns {number} The assigned event ID.
   */
  scheduleEvent(event) {
    return this._state.registerEvent(event);
  }

  /**
   * Cancel a previously scheduled event.
   *
   * @param {number} eventId
   */
  cancelEvent(eventId) {
    const event = this._state.getEvent(eventId);
    if (event) {
      // Advance lifecycle to Cancelled (only if not already terminal).
      if (event.state !== 'Cancelled' && event.state !== 'Completed') {
        event.cancel();
      }
      this._state.removeEvent(eventId);
    }
  }

  /** Pause the simulation clock. */
  pause() {
    this._clock.pause();
  }

  /** Resume the simulation clock. */
  resume() {
    this._clock.resume();
  }

  /** Reset the entire Time System to initial state. */
  reset() {
    this._clock.reset();
    this._state.clear();
  }

  /**
   * @returns {number} Current simulation time in seconds.
   */
  getCurrentTime() {
    return this._clock.getCurrentTime();
  }

  /**
   * Expose the underlying clock (read‑only).
   * @returns {WorldClock}
   */
  getClock() {
    return this._clock;
  }

  /**
   * Expose the underlying scheduler state (read‑only).
   * @returns {SchedulerState}
   */
  getSchedulerState() {
    return this._state;
  }
=======
// src/time/TimeManager.js

import { WorldClock } from './WorldClock.js';
import { SchedulerState } from './SchedulerState.js';
import { EventScheduler } from './EventScheduler.js';
import { ScheduledEvent } from './ScheduledEvent.js';

/**
 * Public façade for the entire Time System.
 *
 * Owns and wires together the WorldClock, SchedulerState, and EventScheduler.
 * External systems interact with the Time System exclusively through this class.
 */
export class TimeManager {
  /**
   * @param {function(ScheduledEvent): boolean} validator – validates an event before execution
   * @param {function(ScheduledEvent): void} dispatcher – executes the event (e.g. publishes to EventBus)
   */
  constructor(validator, dispatcher) {
    this._clock = new WorldClock();
    this._state = new SchedulerState();
    this._scheduler = new EventScheduler(this._clock, this._state, validator, dispatcher);
  }

  /**
   * Advance simulation time and process due events.
   *
   * @param {number} deltaTime – real‑time delta in seconds.
   */
  update(deltaTime) {
    this._clock.advance(deltaTime);
    this._scheduler.update();
  }

  /**
   * Register a new scheduled event.
   *
   * The event must already be populated with its dependencies, validators,
   * fire time, priority, payload, etc.  The manager assigns identity and
   * queues it if ready.
   *
   * @param {ScheduledEvent} event
   * @returns {number} The assigned event ID.
   */
  scheduleEvent(event) {
    return this._state.registerEvent(event);
  }

  /**
   * Cancel a previously scheduled event.
   *
   * @param {number} eventId
   */
  cancelEvent(eventId) {
    const event = this._state.getEvent(eventId);
    if (event) {
      // Advance lifecycle to Cancelled (only if not already terminal).
      if (event.state !== 'Cancelled' && event.state !== 'Completed') {
        event.cancel();
      }
      this._state.removeEvent(eventId);
    }
  }

  /** Pause the simulation clock. */
  pause() {
    this._clock.pause();
  }

  /** Resume the simulation clock. */
  resume() {
    this._clock.resume();
  }

  /** Reset the entire Time System to initial state. */
  reset() {
    this._clock.reset();
    this._state.clear();
  }

  /**
   * @returns {number} Current simulation time in seconds.
   */
  getCurrentTime() {
    return this._clock.getCurrentTime();
  }

  /**
   * Expose the underlying clock (read‑only).
   * @returns {WorldClock}
   */
  getClock() {
    return this._clock;
  }

  /**
   * Expose the underlying scheduler state (read‑only).
   * @returns {SchedulerState}
   */
  getSchedulerState() {
    return this._state;
  }
>>>>>>> 2f42efe7e19574d94df56c89784f42d3d4e2c85a
}