/**
 * src/framework/runtime/events/RuntimeEventBus.js
 *
 * Echo Engine — Runtime Event Bus
 *
 * Lightweight event bus for internal runtime communication.
 * Handles subscription, unsubscription, and event emission.
 *
 * Design Principles:
 * - Single Responsibility: Event distribution only
 * - Logger Injection: Uses injected logger, not console
 * - Error Isolation: Listener errors are caught and logged
 * - No Memory Leaks: Proper unsubscribe support
 */

import { RuntimeError } from '../errors/RuntimeError.js';

export class RuntimeEventBus {
    /**
     * @param {Object} [logger] - Logger instance with error/warn/info/debug methods
     */
    constructor(logger = null) {
        /** @type {Map<string, Set<Function>>} */
        this.#listeners = new Map();

        /** @type {Object} */
        this.#logger = logger || console;
    }

    // ─── Private Fields ─────────────────────────────────────────────

    /** @type {Map<string, Set<Function>>} */
    #listeners;

    /** @type {Object} */
    #logger;

    // ─── Public API ─────────────────────────────────────────────────

    /**
     * Subscribe to an event type.
     * @param {string} type - Event type
     * @param {Function} listener - Callback function
     * @returns {Function} Unsubscribe function
     * @throws {RuntimeError} If type is invalid or listener is not a function
     */
    subscribe(type, listener) {
        if (typeof type !== 'string' || type.length === 0) {
            throw new RuntimeError('Event type must be a non-empty string');
        }
        if (typeof listener !== 'function') {
            throw new RuntimeError('Listener must be a function');
        }

        if (!this.#listeners.has(type)) {
            this.#listeners.set(type, new Set());
        }

        this.#listeners.get(type).add(listener);

        // Return unsubscribe function
        return () => this.unsubscribe(type, listener);
    }

    /**
     * Unsubscribe from an event type.
     * @param {string} type - Event type
     * @param {Function} listener - Callback function
     */
    unsubscribe(type, listener) {
        const set = this.#listeners.get(type);
        if (set) {
            set.delete(listener);
            if (set.size === 0) {
                this.#listeners.delete(type);
            }
        }
    }

    /**
     * Emit an event to all subscribers.
     * @param {RuntimeEvent} event - Event to emit
     */
    emit(event) {
        const listeners = this.#listeners.get(event.type);
        if (!listeners) {
            return;
        }

        for (const listener of listeners) {
            try {
                listener(event);
            } catch (error) {
                this.#logger.error(
                    `[EventBus] Listener error for event type '${event.type}':`,
                    error
                );
                // Continue with other listeners
            }
        }
    }

    /**
     * Check if an event type has subscribers.
     * @param {string} type - Event type
     * @returns {boolean} True if there are subscribers
     */
    hasSubscribers(type) {
        const set = this.#listeners.get(type);
        return set !== undefined && set.size > 0;
    }

    /**
     * Get the number of subscribers for an event type.
     * @param {string} type - Event type
     * @returns {number} Number of subscribers
     */
    subscriberCount(type) {
        const set = this.#listeners.get(type);
        return set ? set.size : 0;
    }

    /**
     * Clear all listeners.
     */
    clear() {
        this.#listeners.clear();
        this.#logger.debug('[EventBus] All listeners cleared');
    }

    /**
     * Clear listeners for a specific event type.
     * @param {string} type - Event type
     */
    clearType(type) {
        if (this.#listeners.has(type)) {
            this.#listeners.delete(type);
            this.#logger.debug(`[EventBus] Cleared listeners for type: ${type}`);
        }
    }
}