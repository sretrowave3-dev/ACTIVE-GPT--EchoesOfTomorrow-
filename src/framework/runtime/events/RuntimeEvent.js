/**
 * src/framework/runtime/events/RuntimeEvent.js
 *
 * Echo Engine — Runtime Event
 *
 * Immutable event data container using private fields.
 * Event properties cannot be modified after construction.
 *
 * Immutability Policy:
 * - Shallow immutability: Event properties (type, payload, timestamp, id) are frozen.
 * - Payload is shallow-frozen; nested objects remain mutable.
 * - Subsystems are responsible for deep immutability if required.
 */

import { RuntimeError } from '../errors/RuntimeError.js';
import { MissingDependencyError } from '../errors/MissingDependencyError.js';

export class RuntimeEvent {
    /**
     * @param {string} type - Event type
     * @param {*} payload - Event payload (shallow-frozen)
     * @param {Object} services - Required services
     * @param {Clock} services.clock - Clock for timestamps
     * @param {IDGenerator} services.idGenerator - ID generator for event IDs
     * @param {Object} [options] - Event options
     * @param {*} [options.source] - Event source
     * @param {number} [options.priority] - Event priority (higher = more important)
     * @param {string} [options.category] - Event category
     * @param {boolean} [options.cancelable] - Whether the event can be canceled
     * @throws {MissingDependencyError} If clock or idGenerator is missing
     * @throws {RuntimeError} If type is invalid
     */
    constructor(type, payload = null, services = {}, options = {}) {
        if (typeof type !== 'string' || type.length === 0) {
            throw new RuntimeError('Event type must be a non-empty string');
        }
        if (!services.clock || typeof services.clock.now !== 'function') {
            throw new MissingDependencyError('RuntimeEvent requires a Clock with now() method');
        }
        if (!services.idGenerator || typeof services.idGenerator.generate !== 'function') {
            throw new MissingDependencyError('RuntimeEvent requires an IDGenerator with generate() method');
        }

        // Shallow-freeze payload
        const frozenPayload = payload !== null && typeof payload === 'object'
            ? Object.freeze(Array.isArray(payload) ? [...payload] : { ...payload })
            : payload;

        // Private fields (truly immutable)
        this.#type = type;
        this.#payload = frozenPayload;
        this.#source = options.source || null;
        this.#timestamp = services.clock.now();
        this.#id = services.idGenerator.generate('event');
        this.#priority = options.priority ?? 0;          
        this.#category = options.category || 'general';
        this.#cancelable = options.cancelable ?? false;
    }

    // ─── Private Fields ─────────────────────────────────────────────

    /** @type {string} */
    #type;
    /** @type {*} */
    #payload;
    /** @type {*} */
    #source;
    /** @type {number} */
    #timestamp;
    /** @type {string} */
    #id;
    /** @type {number} */
    #priority;
    /** @type {string} */
    #category;
    /** @type {boolean} */
    #cancelable;

    // ─── Read-Only Getters ──────────────────────────────────────────

    /** @returns {string} Event type */
    get type() {
        return this.#type;
    }

    /** @returns {*} Event payload (read-only) */
    get payload() {
        return this.#payload;
    }

    /** @returns {*} Event source */
    get source() {
        return this.#source;
    }

    /** @returns {number} Timestamp in milliseconds */
    get timestamp() {
        return this.#timestamp;
    }

    /** @returns {string} Unique event ID */
    get id() {
        return this.#id;
    }

    /** @returns {number} Event priority (higher = more important) */
    get priority() {
        return this.#priority;
    }

    /** @returns {string} Event category */
    get category() {
        return this.#category;
    }

    /** @returns {boolean} Whether the event can be canceled */
    get cancelable() {
        return this.#cancelable;
    }
}