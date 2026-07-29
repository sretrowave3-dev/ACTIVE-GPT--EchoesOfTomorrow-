import { Event } from './Event.js';

export class EventBus {
  constructor() {
    this._listeners = new Map();
    this._queue = [];
    this._head = 0;
  }

  subscribe(type, callback) {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, new Set());
    }

    this._listeners.get(type).add(callback);

    // Return unsubscribe function
    return () => this.unsubscribe(type, callback);
  }

  unsubscribe(type, callback) {
    const set = this._listeners.get(type);

    if (set) {
      set.delete(callback);

      if (set.size === 0) {
        this._listeners.delete(type);
      }
    }
  }

  publish(type, sender, payload = null) {
    this._queue.push(new Event(type, sender, payload));
  }

  dispatch() {
    while (this._head < this._queue.length) {
      const event = this._queue[this._head];
      this._head++;

      const listeners = this._listeners.get(event.type);

      if (listeners) {
        listeners.forEach(callback => {
          try {
            callback(event);
          } catch (err) {
            console.error(
              `EventBus listener error for type "${event.type}":`,
              err
            );
          }
        });
      }
    }

    // Reset queue after dispatch
    if (this._head > 0) {
      this._queue.length = 0;
      this._head = 0;
    }
  }

  getQueueLength() {
    return this._queue.length - this._head;
  }

  clear() {
    this._queue.length = 0;
    this._head = 0;
  }
}