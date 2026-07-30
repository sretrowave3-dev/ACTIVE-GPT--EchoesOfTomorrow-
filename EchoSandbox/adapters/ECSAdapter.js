/**
 * Echo Sandbox — ECS Adapter
 *
 * Queries ECS state and provides structured data
 * about the Entity Component System.
 */

import { EngineAdapter } from './EngineAdapter.js';

export class ECSAdapter extends EngineAdapter {
    constructor(framework) {
        super(framework);
        this._ecs = null;
        this._initECS();
    }

    /**
     * Initialize ECS reference.
     * @private
     */
    _initECS() {
        const ecsService = this.getService('ecs');
        if (ecsService && ecsService.ecsManager) {
            this._ecs = ecsService.ecsManager;
        }
    }

    /**
     * Get ECS status.
     * @returns {Object} ECS status
     */
    getStatus() {
        if (!this._ecs) {
            this._initECS();
        }
        return {
            ready: !!this._ecs,
            entityCount: this.getEntityCount(),
            componentCount: this.getComponentCount(),
            systemCount: this.getSystemCount(),
            componentTypes: this.getComponentTypes()
        };
    }

    /**
     * Get entity count.
     * @returns {number} Number of entities
     */
    getEntityCount() {
        if (!this._ecs) return 0;
        return this._ecs._entities?.size || 0;
    }

    /**
     * Get component types.
     * @returns {Array} Component type names
     */
    getComponentTypes() {
        if (!this._ecs) return [];
        return Array.from(this._ecs._componentTypeIds?.keys() || []);
    }

    /**
     * Get component count.
     * @returns {number} Number of components
     */
    getComponentCount() {
        if (!this._ecs) return 0;
        let count = 0;
        for (const store of this._ecs._stores || []) {
            count += store.count?.() || 0;
        }
        return count;
    }

    /**
     * Get system count.
     * @returns {number} Number of systems
     */
    getSystemCount() {
        const ecsService = this.getService('ecs');
        if (!ecsService || !ecsService.scheduler) return 0;
        return ecsService.scheduler.systems?.length || 0;
    }

    /**
     * Get system list.
     * @returns {Array} System information
     */
    getSystems() {
        const ecsService = this.getService('ecs');
        if (!ecsService || !ecsService.scheduler) return [];

        return (ecsService.scheduler.systems || []).map(system => ({
            name: system.constructor.name,
            enabled: system.isEnabled ? system.isEnabled() : true,
            priority: system.priority || 0
        }));
    }

    /**
     * Get entities with a specific component.
     * @param {string} componentName - Component name
     * @returns {Array} Entity IDs
     */
    getEntitiesWithComponent(componentName) {
        if (!this._ecs) return [];

        const typeId = this._ecs.getTypeId(componentName);
        if (typeId === undefined) return [];

        const store = this._ecs.getStore(typeId);
        if (!store) return [];

        const entities = [];
        store.forEach((entityId) => {
            entities.push(entityId);
        });
        return entities;
    }

    /**
     * Refresh ECS reference.
     * @returns {Object} ECS manager instance
     */
    refresh() {
        this._initECS();
        return this._ecs;
    }
}

