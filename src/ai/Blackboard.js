// src/ai/Blackboard.js

/**
 * Shared memory blackboard for AI decision making and perception coordination.
 * Conforms to EDD Chapter 16 §3 (Core Components).
 */
export class Blackboard {
  constructor() {
    /** @type {Map<string, any>} @private */
    this._data = new Map();
  }

  set(key, value) {
    this._data.set(key, value);
  }

  get(key, defaultValue = null) {
    return this._data.has(key) ? this._data.get(key) : defaultValue;
  }

  has(key) {
    return this._data.has(key);
  }

  delete(key) {
    return this._data.delete(key);
  }

  clear() {
    this._data.clear();
  }
}
