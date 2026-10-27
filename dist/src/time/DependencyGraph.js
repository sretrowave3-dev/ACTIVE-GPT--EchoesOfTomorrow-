// src/time/DependencyGraph.js

/**
 * Tracks dependency relationships between scheduled events.
 * Does not perform scheduling or execution.
 */
export class DependencyGraph {
  constructor() {
    /** @type {Map<number, Set<number>>} waiting event id → set of unmet dependency ids */
    this._waiting = new Map();
    /** @type {Map<number, Set<number>>} dependency id → set of dependent event ids */
    this._dependents = new Map();
    /** @type {Set<number>} all event IDs known to the graph */
    this._knownIds = new Set();
    /** @type {Set<number>} event IDs that have been marked completed */
    this._completed = new Set();
  }

  /**
   * Register an event and its dependencies.
   * @param {import('./ScheduledEvent.js').ScheduledEvent} event
   */
  addEvent(event) {
    const eventId = event.id;
    if (this._knownIds.has(eventId)) {
      throw new Error(`Event ${eventId} already registered in DependencyGraph.`);
    }
    if (event.dependencies.includes(eventId)) {
      throw new Error(`Event ${eventId} cannot depend on itself.`);
    }
    for (const depId of event.dependencies) {
      if (!this._knownIds.has(depId)) {
        throw new Error(`Unknown dependency ${depId} referenced by event ${eventId}.`);
      }
    }

    this._knownIds.add(eventId);

    const unmet = new Set();
    for (const depId of event.dependencies) {
      if (!this._completed.has(depId)) {
        unmet.add(depId);
      }
      if (!this._dependents.has(depId)) {
        this._dependents.set(depId, new Set());
      }
      this._dependents.get(depId).add(eventId);
    }

    if (unmet.size > 0) {
      this._waiting.set(eventId, unmet);
    }
  }

  /**
   * Remove an event entirely (cancelled).
   * @param {number} eventId
   */
  removeEvent(eventId) {
    this._waiting.delete(eventId);

    for (const [, dependents] of this._dependents) {
      dependents.delete(eventId);
      // We do not delete the whole entry here for simplicity; markCompleted will clean up later.
    }

    this._completed.delete(eventId);
    this._knownIds.delete(eventId);
  }

  /**
   * Mark an event as completed. Returns IDs of newly unblocked events.
   * @param {number} eventId
   * @returns {number[]}
   */
  markCompleted(eventId) {
    this._completed.add(eventId);

    const newlyReady = [];
    const dependents = this._dependents.get(eventId);
    if (dependents) {
      for (const waitingId of dependents) {
        const unmet = this._waiting.get(waitingId);
        if (unmet) {
          unmet.delete(eventId);
          if (unmet.size === 0) {
            this._waiting.delete(waitingId);
            newlyReady.push(waitingId);
          }
        }
      }
      this._dependents.delete(eventId);
    }

    return newlyReady;
  }

  /**
   * Check if an event has unresolved dependencies.
   * @param {number} eventId
   * @returns {boolean}
   */
  hasUnresolvedDependencies(eventId) {
    return this._waiting.has(eventId);
  }

  /**
   * Get the current number of events that remain blocked by dependencies.
   * @returns {number}
   */
  getUnresolvedDependencyCount() {
    return this._waiting.size;
  }

  /**
   * Get IDs of events that depend on the given event.
   * @param {number} eventId
   * @returns {number[]}
   */
  getDependents(eventId) {
    const set = this._dependents.get(eventId);
    return set ? Array.from(set) : [];
  }

  clear() {
    this._waiting.clear();
    this._dependents.clear();
    this._knownIds.clear();
    this._completed.clear();
  }

  // ---- serialization ----

  /**
   * Serialize the entire graph state into a plain object.
   * @returns {object}
   */
  serialize() {
    const waiting = {};
    for (const [id, unmet] of this._waiting) {
      waiting[id] = Array.from(unmet);
    }
    const dependents = {};
    for (const [depId, deps] of this._dependents) {
      dependents[depId] = Array.from(deps);
    }
    return {
      waiting,
      dependents,
      completed: Array.from(this._completed),
      knownIds: Array.from(this._knownIds)
    };
  }

  /**
   * Restore graph state from a plain object.
   * @param {object} data
   */
  deserialize(data) {
    this.clear();
    this._knownIds = new Set(data.knownIds);
    this._completed = new Set(data.completed);

    for (const [idStr, unmetArr] of Object.entries(data.waiting)) {
      this._waiting.set(Number(idStr), new Set(unmetArr));
    }
    for (const [depIdStr, depArr] of Object.entries(data.dependents)) {
      this._dependents.set(Number(depIdStr), new Set(depArr));
    }
  }
}