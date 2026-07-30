/**
 * Echo Sandbox — Framework Adapter
 *
 * Queries Framework state and provides structured data
 * about the engine's core runtime.
 */

import { EngineAdapter } from './EngineAdapter.js';

export class FrameworkAdapter extends EngineAdapter {
    constructor(framework) {
        super(framework);
        this._serviceNames = [
            'world', 'ecs', 'scene', 'assets',
            'render', 'input', 'audio', 'ui',
            'player'
        ];
    }

    /**
     * Get framework status.
     * @returns {Object} Framework status
     */
    getStatus() {
        return {
            running: true,
            state: this.framework.stateMachine?.state || 'Unknown',
            services: this._getServiceStatuses(),
            clock: {
                delta: this.framework.clock?.deltaTime || 0,
                elapsed: this.framework.clock?.elapsedTime || 0,
                frame: this.framework.clock?.frameCount || 0
            }
        };
    }

    /**
     * Get service statuses.
     * @returns {Object} Service status map
     * @private
     */
    _getServiceStatuses() {
        const statuses = {};
        for (const name of this._serviceNames) {
            const service = this.getService(name);
            statuses[name] = {
                exists: !!service,
                name: name
            };
        }
        return statuses;
    }

    /**
     * Get event bus statistics.
     * @returns {Object} Event bus stats
     */
    getEventBusStats() {
        const eventBus = this.getEventBus();
        return {
            queueLength: eventBus?.getQueueLength?.() || 0,
            listeners: eventBus?._listeners?.size || 0
        };
    }

    /**
     * Get service count.
     * @returns {number} Number of registered services
     */
    getServiceCount() {
        return this._serviceNames.filter(name => this.hasService(name)).length;
    }

    /**
     * Check if all core services are available.
     * @returns {Object} Core service availability
     */
    checkCoreServices() {
        const core = ['world', 'ecs', 'scene', 'assets'];
        const results = {};
        for (const name of core) {
            results[name] = this.hasService(name);
        }
        results.allReady = Object.values(results).every(v => v === true);
        return results;
    }
}

