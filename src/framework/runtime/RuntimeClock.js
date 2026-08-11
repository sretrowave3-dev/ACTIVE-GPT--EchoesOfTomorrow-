/**
 * src/framework/runtime/RuntimeClock.js
 *
 * Echo Engine - Runtime Clock
 *
 * Authoritative, deterministic runtime timekeeper. The RuntimeKernel owns
 * sampling of real time and supplies frame deltas to this clock, keeping the
 * runtime clock suitable for replay and tests.
 */

import { RuntimeStateError } from './errors/RuntimeStateError.js';

/**
 * Returns a monotonic timestamp in milliseconds where the platform supports
 * it. The function is intentionally injectable to make clock construction
 * deterministic in tests.
 *
 * @returns {number} Monotonic timestamp in milliseconds
 */
function defaultTimeSource() {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now();
    }

    return Date.now();
}

/**
 * Tracks the runtime's logical time.
 *
 * `tick()` accepts seconds because RuntimeKernel distributes frame deltas in
 * seconds. `now()` returns milliseconds for compatibility with runtime event
 * timestamps. Logical time never moves backwards, even when the injected
 * source is not monotonic.
 */
export class RuntimeClock {
    /** @type {() => number} */
    #timeSource;
    /** @type {number|null} */
    #fixedDeltaTime;
    /** @type {number} */
    #maxDeltaTime;
    /** @type {boolean} */
    #initialized;
    /** @type {boolean} */
    #paused;
    /** @type {number} */
    #originTime;
    /** @type {number} */
    #elapsedTime;
    /** @type {number} */
    #deltaTime;
    /** @type {number} */
    #frameCount;
    /** @type {number} */
    #fixedAccumulator;

    /**
     * @param {Object} [options] - Clock configuration
     * @param {() => number} [options.timeSource] - Monotonic millisecond source
     * @param {number|null} [options.fixedDeltaTime=null] - Fixed step in seconds
     * @param {number} [options.maxDeltaTime=Infinity] - Largest accepted frame delta in seconds
     * @throws {TypeError} If an option is invalid
     */
    constructor({
        timeSource = defaultTimeSource,
        fixedDeltaTime = null,
        maxDeltaTime = Infinity
    } = {}) {
        if (typeof timeSource !== 'function') {
            throw new TypeError('RuntimeClock timeSource must be a function');
        }
        if (fixedDeltaTime !== null && (!Number.isFinite(fixedDeltaTime) || fixedDeltaTime <= 0)) {
            throw new TypeError('RuntimeClock fixedDeltaTime must be a positive finite number or null');
        }
        if (!(maxDeltaTime > 0) || Number.isNaN(maxDeltaTime)) {
            throw new TypeError('RuntimeClock maxDeltaTime must be greater than zero');
        }

        this.#timeSource = timeSource;
        this.#fixedDeltaTime = fixedDeltaTime;
        this.#maxDeltaTime = maxDeltaTime;
        this.#initialized = false;
        this.#paused = false;
        this.#originTime = 0;
        this.#elapsedTime = 0;
        this.#deltaTime = 0;
        this.#frameCount = 0;
        this.#fixedAccumulator = 0;
    }

    /**
     * Starts a fresh runtime time line.
     *
     * @returns {void}
     * @throws {RuntimeStateError} If the clock is already initialized
     */
    initialize() {
        if (this.#initialized) {
            throw new RuntimeStateError('RuntimeClock already initialized');
        }

        const originTime = this.#timeSource();
        if (!Number.isFinite(originTime)) {
            throw new RuntimeStateError('RuntimeClock timeSource must return a finite number');
        }

        this.#originTime = originTime;
        this.#elapsedTime = 0;
        this.#deltaTime = 0;
        this.#frameCount = 0;
        this.#fixedAccumulator = 0;
        this.#paused = false;
        this.#initialized = true;
    }

    /**
     * Stops the clock and clears frame-specific state. The instance can be
     * initialized again after shutdown.
     *
     * @returns {void}
     * @throws {RuntimeStateError} If the clock is not initialized
     */
    shutdown() {
        this.#assertInitialized();

        this.#initialized = false;
        this.#paused = false;
        this.#deltaTime = 0;
        this.#fixedAccumulator = 0;
    }

    /**
     * Advances logical time by one frame.
     *
     * @param {number} deltaTime - Frame delta in seconds
     * @returns {number} Applied frame delta in seconds
     * @throws {RuntimeStateError} If the clock is not initialized
     * @throws {TypeError} If deltaTime is negative or not finite
     */
    tick(deltaTime) {
        this.#assertInitialized();

        if (!Number.isFinite(deltaTime) || deltaTime < 0) {
            throw new TypeError('RuntimeClock deltaTime must be a finite non-negative number');
        }

        this.#frameCount += 1;
        this.#deltaTime = this.#paused ? 0 : Math.min(deltaTime, this.#maxDeltaTime);

        if (this.#deltaTime === 0) {
            return 0;
        }

        this.#elapsedTime += this.#deltaTime;
        if (this.#fixedDeltaTime !== null) {
            this.#fixedAccumulator += this.#deltaTime;
        }

        return this.#deltaTime;
    }

    /**
     * Pauses logical time. Frames are still counted, but their applied delta is zero.
     *
     * @returns {void}
     * @throws {RuntimeStateError} If the clock is not initialized
     */
    pause() {
        this.#assertInitialized();
        this.#paused = true;
        this.#deltaTime = 0;
    }

    /**
     * Resumes logical time advancement.
     *
     * @returns {void}
     * @throws {RuntimeStateError} If the clock is not initialized
     */
    resume() {
        this.#assertInitialized();
        this.#paused = false;
    }

    /**
     * Returns the current logical timestamp in milliseconds.
     *
     * @returns {number} Monotonic timestamp in milliseconds
     * @throws {RuntimeStateError} If the clock is not initialized
     */
    now() {
        this.#assertInitialized();
        return this.#originTime + (this.#elapsedTime * 1000);
    }

    /** @returns {number} Delta applied during the most recent frame in seconds */
    getDelta() {
        return this.#deltaTime;
    }

    /** @returns {number} Accumulated logical runtime time in seconds */
    getElapsedTime() {
        return this.#elapsedTime;
    }

    /** @returns {number} Number of ticks observed since initialization */
    getFrameCount() {
        return this.#frameCount;
    }

    /** @returns {boolean} True while paused */
    isPaused() {
        return this.#paused;
    }

    /** @returns {boolean} True after initialize and before shutdown */
    isInitialized() {
        return this.#initialized;
    }

    /**
     * Consumes accumulated fixed simulation steps.
     *
     * The caller chooses when to execute fixed updates, keeping simulation
     * policy outside the clock. The returned value is capped to prevent an
     * unbounded catch-up loop after a long stall.
     *
     * @param {number} [maxSteps=Infinity] - Maximum steps to consume
     * @returns {number} Number of fixed steps due
     * @throws {RuntimeStateError} If fixed timing is disabled or the clock is not initialized
     * @throws {TypeError} If maxSteps is not a positive integer or Infinity
     */
    consumeFixedSteps(maxSteps = Infinity) {
        this.#assertInitialized();

        if (this.#fixedDeltaTime === null) {
            throw new RuntimeStateError('RuntimeClock fixedDeltaTime is not configured');
        }
        if (!(maxSteps === Infinity || (Number.isInteger(maxSteps) && maxSteps > 0))) {
            throw new TypeError('RuntimeClock maxSteps must be a positive integer or Infinity');
        }

        const availableSteps = Math.floor((this.#fixedAccumulator + Number.EPSILON) / this.#fixedDeltaTime);
        const steps = Math.min(availableSteps, maxSteps);
        this.#fixedAccumulator -= steps * this.#fixedDeltaTime;

        // Avoid retaining insignificant floating-point residue as accumulated time.
        if (this.#fixedAccumulator < Number.EPSILON) {
            this.#fixedAccumulator = 0;
        }

        return steps;
    }

    /** @returns {number|null} Fixed step in seconds, or null when disabled */
    getFixedDeltaTime() {
        return this.#fixedDeltaTime;
    }

    /**
     * Ensures the instance is in its running lifecycle state.
     *
     * @returns {void}
     * @throws {RuntimeStateError} If the clock is not initialized
     * @private
     */
    #assertInitialized() {
        if (!this.#initialized) {
            throw new RuntimeStateError('RuntimeClock is not initialized');
        }
    }
}
