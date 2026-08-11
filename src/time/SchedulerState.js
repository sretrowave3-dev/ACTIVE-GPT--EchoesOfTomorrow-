// src/time/SchedulerState.js

import { ReadyQueue } from './ReadyQueue.js';
import { DependencyGraph } from './DependencyGraph.js';
import { ScheduledEvent } from './ScheduledEvent.js';

export class SchedulerState {
  constructor() {
    this._readyQueue = new ReadyQueue();
    this._dependencyGraph = new DependencyGraph();
    this._events = new Map();
    this._nextEventId = 1;
    this._nextSequenceNumber = 1;
  }

  registerEvent(event) {
    const id = this._nextEventId++;
    event.id = id;
    event.sequenceNumber = this._nextSequenceNumber++;
    this._events.set(id, event);
    this._dependencyGraph.addEvent(event);
    event.queue();
    if (!this._dependencyGraph.hasUnresolvedDependencies(id)) {
      this._readyQueue.enqueue(event);
    }
    return id;
  }

  removeEvent(eventId) {
    const event = this._events.get(eventId);
    if (!event) return;
    this._readyQueue.remove(eventId);
    this._dependencyGraph.removeEvent(eventId);
    this._events.delete(eventId);
  }

  markCompleted(eventId) {
    const event = this._events.get(eventId);
    if (!event) return [];
    const readyIds = this._dependencyGraph.markCompleted(eventId);
    for (const id of readyIds) {
      const readyEvent = this._events.get(id);
      if (readyEvent) {
        this._readyQueue.enqueue(readyEvent);
      }
    }
    return readyIds;
  }

  getEvent(eventId) {
    return this._events.get(eventId);
  }

  contains(eventId) {
    return this._events.has(eventId);
  }

  getReadyQueue() {
    return this._readyQueue;
  }

  getDependencyGraph() {
    return this._dependencyGraph;
  }

  clear() {
    this._readyQueue.clear();
    this._dependencyGraph.clear();
    this._events.clear();
    this._nextEventId = 1;
    this._nextSequenceNumber = 1;
  }

  eventCount() {
    return this._events.size;
  }

  getReadyQueueSize() {
    return this._readyQueue.size();
  }

  getUnresolvedDependencyCount() {
    return this._dependencyGraph.getUnresolvedDependencyCount();
  }

  // ---- serialization ----

  /**
   * Serialize complete state using subcomponent serialization.
   * @returns {object}
   */
  serialize() {
    const eventsData = [];
    for (const [, event] of this._events) {
      eventsData.push(event.serialize());
    }
    return {
      nextEventId: this._nextEventId,
      nextSequenceNumber: this._nextSequenceNumber,
      events: eventsData,
      readyQueue: this._readyQueue.serialize(),
      dependencyGraph: this._dependencyGraph.serialize()
    };
  }

  /**
   * Deserialize and restore state from a plain object.
   * @param {object} data
   */
  deserialize(data) {
    this.clear();
    this._nextEventId = data.nextEventId;
    this._nextSequenceNumber = data.nextSequenceNumber;

    // Reconstruct events
    const eventsById = new Map();
    for (const raw of data.events) {
      const event = ScheduledEvent.deserialize(raw);
      eventsById.set(event.id, event);
    }
    this._events = eventsById;

    // Restore ready queue
    this._readyQueue.deserialize(data.readyQueue, eventsById);

    // Restore dependency graph
    this._dependencyGraph.deserialize(data.dependencyGraph);
  }
}