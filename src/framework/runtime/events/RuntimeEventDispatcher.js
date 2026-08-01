/**
 * src/framework/runtime/events/RuntimeEventDispatcher.js
 *
 * Echo Engine — Runtime Event Dispatcher
 *
 * Coordinates event dispatch, including queuing and flushing.
 * Provides both immediate and queued event delivery.
 *
 * Design Principles:
 * - Single Responsibility: Event dispatch and queuing only
 * - Queue Management: Supports queued and immediate dispatch
 * - Flush Control: Explicit flush for queued events
 * - Logger Injection: Uses injected logger
 */

import { RuntimeEventBus } from './RuntimeEventBus.js';
import { RuntimeStateError } from '../errors/RuntimeStateError.js';

export class RuntimeEventDispatcher {
    /**
     * @param {Object} [logger] - Logger instance
     */
    constructor(logger = null) {
        /** @type {RuntimeEventBus} */
        this.#bus = new RuntimeEventBus(logger);

        /** @type {RuntimeEvent[]} */
        this.#queue = [];

        /** @type {boolean} */
        this.#initialized = false;

        /** @type {Object} */
        this.#logger = logger || console;
    }

    // ─── Private Fields ─────────────────────────────────────────────

    /** @type {RuntimeEventBus} */
    #bus;

    /** @type {RuntimeEvent[]} */
    #queue;

    /** @type {boolean} */
    #initialized;

    /** @type {Object} */
    #logger;

    // ─── Lifecycle ──────────────────────────────────────────────────

    /**
     * Initialize the dispatcher.
     */
    initialize() {
        if (this.#initialized) return;
        this.#initialized = true;
        this.#logger.debug('[RuntimeEventDispatcher] Initialized');
    }

    /**
     * Shutdown the dispatcher.
     */
    shutdown() {
        if (!this.#initialized) return;
        this.#bus.clear();
        this.#queue.length = 0;
        this.#initialized = false;
        this.#logger.debug('[RuntimeEventDispatcher] Shutdown');
    }

    // ─── Subscription ──────────────────────────────────────────────

    /**
     * Subscribe to an event type.
     * @param {string} type - Event type
     * @param {Function} listener - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(type, listener) {
        this.#ensureInitialized();
        return this.#bus.subscribe(type, listener);
    }

    /**
     * Unsubscribe from an event type.
     * @param {string} type - Event type
     * @param {Function} listener - Callback function
     */
    unsubscribe(type, listener) {
        this.#ensureInitialized();
        this.#bus.unsubscribe(type, listener);
    }

    /**
     * Check if an event type has subscribers.
     * @param {string} type - Event type
     * @returns {boolean}
     */
    hasSubscribers(type) {
        this.#ensureInitialized();
        return this.#bus.hasSubscribers(type);
    }

    // ─── Dispatch ───────────────────────────────────────────────────

    /**
     * Dispatch an event immediately.
     * @param {RuntimeEvent} event - Event to dispatch
     */
    dispatch(event) {
        this.#ensureInitialized();
        this.#bus.emit(event);
    }

    /**
     * Queue an event for later dispatch.
     * @param {RuntimeEvent} event - Event to queue
     */
    queue(event) {
        this.#ensureInitialized();
        this.#queue.push(event);
        this.#logger.debug(`[RuntimeEventDispatcher] Event queued: ${event.type}`);
    }

    /**
     * Flush all queued events.
     * @returns {number} Number of events flushed
     */
    flush() {
        this.#ensureInitialized();

        const events = this.#queue;
        this.#queue = [];

        if (events.length === 0) {
            return 0;
        }

        this.#logger.debug(`[RuntimeEventDispatcher] Flushing ${events.length} events`);

        for (const event of events) {
            this.#bus.emit(event);
        }

        return events.length;
    }

    /**
     * Get the number of queued events.
     * @returns {number} Queue length
     */
    queueLength() {
        this.#ensureInitialized();
        return this.#queue.length;
    }

    /**
     * Clear the event queue without dispatching.
     * @returns {number} Number of events cleared
     */
    clearQueue() {
        this.#ensureInitialized();
        const count = this.#queue.length;
        this.#queue = [];
        this.#logger.debug(`[RuntimeEventDispatcher] Cleared ${count} queued events`);
        return count;
    }

    // ─── Internal ───────────────────────────────────────────────────

    /**
     * Ensure the dispatcher is initialized.
     * @throws {RuntimeStateError} If not initialized
     * @private
     */
    #ensureInitialized() {
        if (!this.#initialized) {
            throw new RuntimeStateError('RuntimeEventDispatcher not initialized');
        }
    }
}