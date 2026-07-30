/**
 * Echo Sandbox — Engine Adapter Base
 *
 * Provides a generic interface for querying engine state
 * without directly accessing engine internals.
 */

export class EngineAdapter {
    constructor(framework) {
        this.framework = framework;
        this._cache = new Map();
        this._cacheTimeout = 100; // ms
        this._lastCacheClear = 0;
    }

    /**
     * Get the framework instance.
     * @returns {Framework} Framework instance
     */
    getFramework() {
        return this.framework;
    }

    /**
     * Get a service from the registry.
     * @param {string} name - Service name
     * @returns {Service|null} Service instance or null
     */
    getService(name) {
        try {
            return this.framework.serviceRegistry.get(name);
        } catch {
            return null;
        }
    }

    /**
     * Get service with cache.
     * @param {string} name - Service name
     * @returns {Service|null} Service instance or null
     */
    getServiceCached(name) {
        const now = Date.now();
        if (now - this._lastCacheClear > this._cacheTimeout) {
            this._cache.clear();
            this._lastCacheClear = now;
        }
        if (this._cache.has(name)) {
            return this._cache.get(name);
        }
        const service = this.getService(name);
        if (service) {
            this._cache.set(name, service);
        }
        return service;
    }

    /**
     * Get the event bus.
     * @returns {EventBus} EventBus instance
     */
    getEventBus() {
        return this.framework.eventBus;
    }

    /**
     * Get the game clock.
     * @returns {GameClock} GameClock instance
     */
    getClock() {
        return this.framework.clock;
    }

    /**
     * Check if a service exists.
     * @param {string} name - Service name
     * @returns {boolean} True if service exists
     */
    hasService(name) {
        try {
            return this.framework.serviceRegistry.get(name) !== undefined;
        } catch {
            return false;
        }
    }

    /**
     * Clear the cache.
     */
    clearCache() {
        this._cache.clear();
        this._lastCacheClear = 0;
    }
}

