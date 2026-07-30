/**
 * Echo Sandbox — Memory Monitor
 *
 * Tracks memory usage including JS heap, asset memory,
 * and entity memory consumption.
 */

export class MemoryMonitor {
    constructor(framework, state) {
        this.framework = framework;
        this.state = state;
        this._running = false;
        this._intervalId = null;
        this._updateInterval = 2000; // ms
        this._peakMemory = 0;
        this._history = [];
        this._maxHistory = 60; // Last 60 samples
    }

    /**
     * Start monitoring.
     */
    start() {
        if (this._running) return;
        this._running = true;

        // Immediate update
        this._update();

        // Periodic updates
        this._intervalId = setInterval(() => {
            if (this._running) {
                this._update();
            }
        }, this._updateInterval);
    }

    /**
     * Stop monitoring.
     */
    stop() {
        this._running = false;
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
    }

    /**
     * Update memory metrics.
     * @private
     */
    _update() {
        // Get heap size (if available)
        let heapUsed = 0;
        let heapTotal = 0;

        if (performance.memory) {
            heapUsed = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
            heapTotal = Math.round(performance.memory.totalJSHeapSize / (1024 * 1024));
        }

        // Estimate asset memory (from asset manager)
        let assetMemory = 0;
        const assetService = this.framework.serviceRegistry.get('assets');
        if (assetService && assetService.assetManager) {
            const cache = assetService.assetManager._cache;
            if (cache && cache._cache) {
                // Rough estimate: each cached asset ~100KB
                assetMemory = cache._cache.size * 0.1;
            }
        }

        // Estimate entity memory
        let entityMemory = 0;
        const worldManager = this.framework.serviceRegistry.get('world');
        if (worldManager && worldManager.world) {
            const entities = worldManager.world.entityRegistry?._entities;
            if (entities) {
                entityMemory = entities.size * 0.05; // ~50KB per entity
            }
        }

        const totalUsed = Math.round(heapUsed + assetMemory + entityMemory);
        const totalAvailable = heapTotal || totalUsed + 100;

        // Track peak
        if (totalUsed > this._peakMemory) {
            this._peakMemory = totalUsed;
        }

        // Store history
        this._history.push({
            timestamp: Date.now(),
            heapUsed: heapUsed,
            heapTotal: heapTotal,
            assetMemory: Math.round(assetMemory),
            entityMemory: Math.round(entityMemory),
            total: totalUsed
        });
        if (this._history.length > this._maxHistory) {
            this._history.shift();
        }

        // Update state
        this.state.setValue('memory', {
            used: totalUsed,
            total: totalAvailable,
            peak: this._peakMemory,
            heap: heapUsed,
            assets: Math.round(assetMemory),
            entities: Math.round(entityMemory)
        });

        // Update stats
        this.state.setValue('stats.memory', totalUsed);

        // Emit memory update event
        this.state._notifyObservers('memory', {
            used: totalUsed,
            total: totalAvailable,
            peak: this._peakMemory,
            heap: heapUsed,
            assets: Math.round(assetMemory),
            entities: Math.round(entityMemory)
        });
    }

    /**
     * Get current memory usage.
     * @returns {Object} Memory usage
     */
    getCurrentMemory() {
        return this.state.getValue('memory') || {
            used: 0,
            total: 0,
            peak: 0
        };
    }

    /**
     * Get memory history.
     * @param {number} limit - Maximum entries
     * @returns {Array} History entries
     */
    getHistory(limit = 30) {
        return this._history.slice(-limit);
    }

    /**
     * Get memory summary.
     * @returns {Object} Memory summary
     */
    getSummary() {
        const current = this.getCurrentMemory();
        return {
            current: current,
            peak: this._peakMemory,
            historyCount: this._history.length
        };
    }

    /**
     * Manual update.
     */
    update() {
        this._update();
    }
}

