/**
 * Echo Sandbox — Time Adapter
 *
 * Queries Time state and provides structured data
 * about the engine's time system.
 */

import { EngineAdapter } from './EngineAdapter.js';

export class TimeAdapter extends EngineAdapter {
    constructor(framework) {
        super(framework);
        this._clock = null;
        this._initClock();
    }

    /**
     * Initialize clock reference.
     * @private
     */
    _initClock() {
        this._clock = this.getClock();
    }

    /**
     * Get time status.
     * @returns {Object} Time status
     */
    getStatus() {
        if (!this._clock) {
            this._initClock();
        }
        return {
            ready: !!this._clock,
            delta: this._clock?.deltaTime || 0,
            elapsed: this._clock?.elapsedTime || 0,
            frame: this._clock?.frameCount || 0,
            paused: this._clock?.isPaused ? this._clock.isPaused() : false
        };
    }

    /**
     * Get current frame time.
     * @returns {number} Current delta time
     */
    getDeltaTime() {
        return this._clock?.deltaTime || 0;
    }

    /**
     * Get elapsed time.
     * @returns {number} Total elapsed time
     */
    getElapsedTime() {
        return this._clock?.elapsedTime || 0;
    }

    /**
     * Get frame count.
     * @returns {number} Frame count
     */
    getFrameCount() {
        return this._clock?.frameCount || 0;
    }

    /**
     * Check if time is paused.
     * @returns {boolean} True if paused
     */
    isPaused() {
        return this._clock?.isPaused ? this._clock.isPaused() : false;
    }

    /**
     * Refresh clock reference.
     * @returns {GameClock} Clock instance
     */
    refresh() {
        this._initClock();
        return this._clock;
    }
}

