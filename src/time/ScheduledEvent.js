<<<<<<< HEAD
// src/time/ScheduledEvent.js

/**
 * Immutable scheduled event data. Lifecycle state is the only mutable property.
 * id and sequenceNumber are assigned by SchedulerState upon registration.
 */
export const EventState = Object.freeze({
  CREATED: 'Created',
  QUEUED: 'Queued',
  VALIDATED: 'Validated',
  EXECUTED: 'Executed',
  COMPLETED: 'Completed',
  VALIDATION_FAILED: 'ValidationFailed',
  CANCELLED: 'Cancelled'
});

export class ScheduledEvent {
  /**
   * @param {number} fireTime
   * @param {number} priority
   * @param {string} eventType
   * @param {*} payload
   * @param {Object} [options]
   * @param {string} [options.source='unknown']
   * @param {string|null} [options.sectorId=null]
   * @param {number[]} [options.dependencies=[]]
   * @param {string[]} [options.validatorIds=[]]
   */
  constructor(fireTime, priority, eventType, payload, options = {}) {
    if (!Number.isFinite(fireTime)) {
      throw new TypeError(`fireTime must be a finite number, got ${fireTime}`);
    }
    if (!Number.isInteger(priority)) {
      throw new TypeError(`priority must be an integer, got ${priority}`);
    }
    if (typeof eventType !== 'string' || eventType.length === 0) {
      throw new TypeError(`eventType must be a non‑empty string, got "${eventType}"`);
    }
    this.fireTime = fireTime;
    this.priority = priority;
    this.eventType = eventType;
    this.payload = payload;
    /** Assigned by SchedulerState later. */
    this.id = -1;
    /** Assigned by SchedulerState later. */
    this.sequenceNumber = -1;
    this.source = options.source || 'unknown';
    this.sectorId = options.sectorId || null;
    this.dependencies = Object.freeze([...(options.dependencies ?? [])]);
    this.validatorIds = Object.freeze([...(options.validatorIds ?? [])]);
    this.state = EventState.CREATED;
  }

  queue() { this._transitionTo(EventState.QUEUED); }
  validate() { this._transitionTo(EventState.VALIDATED); }
  execute() { this._transitionTo(EventState.EXECUTED); }
  complete() { this._transitionTo(EventState.COMPLETED); }
  cancel() { this._transitionTo(EventState.CANCELLED); }
  validationFailed() { this._transitionTo(EventState.VALIDATION_FAILED); }

  _transitionTo(nextState) {
    const allowed = VALID_STATE_TRANSITIONS[this.state];
    if (!allowed || !allowed.has(nextState)) {
      throw new Error(
        `Invalid state transition for event ${this.id}: ${this.state} → ${nextState}`
      );
    }
    this.state = nextState;
  }

  /**
   * Serialize event metadata into a plain object.
   * @returns {object}
   */
  serialize() {
    return {
      id: this.id,
      sequenceNumber: this.sequenceNumber,
      fireTime: this.fireTime,
      priority: this.priority,
      eventType: this.eventType,
      payload: this.payload,
      source: this.source,
      sectorId: this.sectorId,
      dependencies: [...this.dependencies],
      validatorIds: [...this.validatorIds],
      state: this.state
    };
  }

  /**
   * Create a new event from serialized data. ID, sequenceNumber, and state are restored.
   * @param {object} data
   * @returns {ScheduledEvent}
   */
  static deserialize(data) {
    const event = new ScheduledEvent(data.fireTime, data.priority, data.eventType, data.payload, {
      source: data.source,
      sectorId: data.sectorId,
      dependencies: data.dependencies,
      validatorIds: data.validatorIds
    });
    event.id = data.id;
    event.sequenceNumber = data.sequenceNumber;
    event.state = data.state; // direct set (bypass transition validation because it's a restore)
    return event;
  }
}

const VALID_STATE_TRANSITIONS = Object.freeze({
  [EventState.CREATED]: new Set([EventState.QUEUED, EventState.CANCELLED]),
  [EventState.QUEUED]: new Set([EventState.VALIDATED, EventState.CANCELLED]),
  [EventState.VALIDATED]: new Set([EventState.EXECUTED, EventState.VALIDATION_FAILED, EventState.CANCELLED]),
  [EventState.EXECUTED]: new Set([EventState.COMPLETED, EventState.CANCELLED]),
  [EventState.COMPLETED]: new Set([]),
  [EventState.VALIDATION_FAILED]: new Set([]),
  [EventState.CANCELLED]: new Set([])
=======
// src/time/ScheduledEvent.js

/**
 * Immutable scheduled event data. Lifecycle state is the only mutable property.
 * id and sequenceNumber are assigned by SchedulerState upon registration.
 */
export const EventState = Object.freeze({
  CREATED: 'Created',
  QUEUED: 'Queued',
  VALIDATED: 'Validated',
  EXECUTED: 'Executed',
  COMPLETED: 'Completed',
  VALIDATION_FAILED: 'ValidationFailed',
  CANCELLED: 'Cancelled'
});

export class ScheduledEvent {
  /**
   * @param {number} fireTime
   * @param {number} priority
   * @param {string} eventType
   * @param {*} payload
   * @param {Object} [options]
   * @param {string} [options.source='unknown']
   * @param {string|null} [options.sectorId=null]
   * @param {number[]} [options.dependencies=[]]
   * @param {string[]} [options.validatorIds=[]]
   */
  constructor(fireTime, priority, eventType, payload, options = {}) {
    if (!Number.isFinite(fireTime)) {
      throw new TypeError(`fireTime must be a finite number, got ${fireTime}`);
    }
    if (!Number.isInteger(priority)) {
      throw new TypeError(`priority must be an integer, got ${priority}`);
    }
    if (typeof eventType !== 'string' || eventType.length === 0) {
      throw new TypeError(`eventType must be a non‑empty string, got "${eventType}"`);
    }
    this.fireTime = fireTime;
    this.priority = priority;
    this.eventType = eventType;
    this.payload = payload;
    /** Assigned by SchedulerState later. */
    this.id = -1;
    /** Assigned by SchedulerState later. */
    this.sequenceNumber = -1;
    this.source = options.source || 'unknown';
    this.sectorId = options.sectorId || null;
    this.dependencies = Object.freeze([...(options.dependencies ?? [])]);
    this.validatorIds = Object.freeze([...(options.validatorIds ?? [])]);
    this.state = EventState.CREATED;
  }

  queue() { this._transitionTo(EventState.QUEUED); }
  validate() { this._transitionTo(EventState.VALIDATED); }
  execute() { this._transitionTo(EventState.EXECUTED); }
  complete() { this._transitionTo(EventState.COMPLETED); }
  cancel() { this._transitionTo(EventState.CANCELLED); }
  validationFailed() { this._transitionTo(EventState.VALIDATION_FAILED); }

  _transitionTo(nextState) {
    const allowed = VALID_STATE_TRANSITIONS[this.state];
    if (!allowed || !allowed.has(nextState)) {
      throw new Error(
        `Invalid state transition for event ${this.id}: ${this.state} → ${nextState}`
      );
    }
    this.state = nextState;
  }

  /**
   * Serialize event metadata into a plain object.
   * @returns {object}
   */
  serialize() {
    return {
      id: this.id,
      sequenceNumber: this.sequenceNumber,
      fireTime: this.fireTime,
      priority: this.priority,
      eventType: this.eventType,
      payload: this.payload,
      source: this.source,
      sectorId: this.sectorId,
      dependencies: [...this.dependencies],
      validatorIds: [...this.validatorIds],
      state: this.state
    };
  }

  /**
   * Create a new event from serialized data. ID, sequenceNumber, and state are restored.
   * @param {object} data
   * @returns {ScheduledEvent}
   */
  static deserialize(data) {
    const event = new ScheduledEvent(data.fireTime, data.priority, data.eventType, data.payload, {
      source: data.source,
      sectorId: data.sectorId,
      dependencies: data.dependencies,
      validatorIds: data.validatorIds
    });
    event.id = data.id;
    event.sequenceNumber = data.sequenceNumber;
    event.state = data.state; // direct set (bypass transition validation because it's a restore)
    return event;
  }
}

const VALID_STATE_TRANSITIONS = Object.freeze({
  [EventState.CREATED]: new Set([EventState.QUEUED, EventState.CANCELLED]),
  [EventState.QUEUED]: new Set([EventState.VALIDATED, EventState.CANCELLED]),
  [EventState.VALIDATED]: new Set([EventState.EXECUTED, EventState.VALIDATION_FAILED, EventState.CANCELLED]),
  [EventState.EXECUTED]: new Set([EventState.COMPLETED, EventState.CANCELLED]),
  [EventState.COMPLETED]: new Set([]),
  [EventState.VALIDATION_FAILED]: new Set([]),
  [EventState.CANCELLED]: new Set([])
>>>>>>> 2f42efe7e19574d94df56c89784f42d3d4e2c85a
});