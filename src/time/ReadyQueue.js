// src/time/ReadyQueue.js

/**
 * Deterministic, ordered container for ready-to-execute ScheduledEvent objects.
 *
 * Maintains events sorted by fireTime, priority, and sequenceNumber.
 * This is a pure data structure – no scheduling or lifecycle logic.
 */
export class ReadyQueue {
  constructor() {
    /** @type {import('./ScheduledEvent.js').ScheduledEvent[]} */
    this._events = [];
    /** @type {Map<number, import('./ScheduledEvent.js').ScheduledEvent>} */
    this._idMap = new Map();
  }

  /**
   * Insert an event while preserving sort order.
   * @param {import('./ScheduledEvent.js').ScheduledEvent} event
   */
  enqueue(event) {
    if (this._idMap.has(event.id)) {
      throw new Error(`Duplicate event id ${event.id} in ReadyQueue.`);
    }
    const index = this._binarySearchIndex(event);
    this._events.splice(index, 0, event);
    this._idMap.set(event.id, event);
  }

  /** Remove and return the next event. */
  dequeue() {
    if (this._events.length === 0) return null;
    const event = this._events.shift();
    this._idMap.delete(event.id);
    return event;
  }

  /** Peek at the next event without removing. */
  peek() {
    return this._events.length > 0 ? this._events[0] : null;
  }

  /** Remove a specific event by its id. */
  remove(eventId) {
    const index = this._events.findIndex(e => e.id === eventId);
    if (index !== -1) {
      this._events.splice(index, 1);
      this._idMap.delete(eventId);
    }
  }

  clear() {
    this._events.length = 0;
    this._idMap.clear();
  }

  size() {
    return this._events.length;
  }

  isEmpty() {
    return this._events.length === 0;
  }

  // ---- internal helpers ----

  _binarySearchIndex(event) {
    let low = 0;
    let high = this._events.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (this._compare(event, this._events[mid]) < 0) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }
    return low;
  }

  _compare(a, b) {
    if (a.fireTime !== b.fireTime) return a.fireTime - b.fireTime;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.sequenceNumber - b.sequenceNumber;
  }

  // ---- serialization ----

  /**
   * Serialize queue state: an array of event IDs in queue order.
   * @returns {number[]}
   */
  serialize() {
    return this._events.map(e => e.id);
  }

  /**
   * Restore queue from an ordered array of event IDs and a map of id→event.
   * @param {number[]} ids
   * @param {Map<number, import('./ScheduledEvent.js').ScheduledEvent>} eventsById
   */
  deserialize(ids, eventsById) {
    this.clear();
    for (const id of ids) {
      const event = eventsById.get(id);
      if (event) {
        this._events.push(event);
        this._idMap.set(id, event);
      }
    }
  }
}