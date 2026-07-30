/**
 * Echo Sandbox — World Adapter
 *
 * Queries World state and provides structured data
 * about the world simulation.
 */

import { EngineAdapter } from './EngineAdapter.js';

export class WorldAdapter extends EngineAdapter {
    constructor(framework) {
        super(framework);
        this._world = null;
        this._initWorld();
    }

    /**
     * Initialize world reference.
     * @private
     */
    _initWorld() {
        const worldManager = this.getService('world');
        if (worldManager && worldManager.world) {
            this._world = worldManager.world;
        }
    }

    /**
     * Get world status.
     * @returns {Object} World status
     */
    getStatus() {
        if (!this._world) {
            this._initWorld();
        }
        return {
            ready: !!this._world,
            entityCount: this.getEntityCount(),
            sectorCount: this.getSectorCount(),
            cellCount: this.getCellCount(),
            streamingActive: this.isStreamingActive()
        };
    }

    /**
     * Get entity count.
     * @returns {number} Number of entities
     */
    getEntityCount() {
        if (!this._world) return 0;
        return this._world.entityRegistry?._entities?.size || 0;
    }

    /**
     * Get sector count.
     * @returns {number} Number of sectors
     */
    getSectorCount() {
        if (!this._world) return 0;
        return this._world.sectorRegistry?._map?.size || 0;
    }

    /**
     * Get cell count.
     * @returns {number} Number of cells
     */
    getCellCount() {
        if (!this._world) return 0;
        return this._world.cellRegistry?._map?.size || 0;
    }

    /**
     * Check if streaming is active.
     * @returns {boolean} True if streaming manager is active
     */
    isStreamingActive() {
        if (!this._world) return false;
        return !!this._world.streamingManager;
    }

    /**
     * Get all entities (limited).
     * @param {number} limit - Maximum number of entities
     * @returns {Array} Entity data
     */
    getEntities(limit = 100) {
        if (!this._world) return [];

        const entities = [];
        const registry = this._world.entityRegistry;
        if (!registry) return [];

        let count = 0;
        for (const [id, entity] of registry._entities || []) {
            if (count >= limit) break;
            entities.push({
                id: id,
                generation: entity.generation,
                state: entity.state || 'active',
                transform: entity.transform || null
            });
            count++;
        }
        return entities;
    }

    /**
     * Get entity by ID.
     * @param {number} entityId - Entity ID
     * @returns {Object|null} Entity data or null
     */
    getEntity(entityId) {
        if (!this._world) return null;
        const registry = this._world.entityRegistry;
        if (!registry) return null;

        const entity = registry._entities?.get(entityId);
        if (!entity) return null;

        return {
            id: entityId,
            generation: entity.generation,
            state: entity.state || 'active',
            transform: entity.transform || null,
            cellId: entity.cellId || null
        };
    }

    /**
     * Refresh world reference.
     * @returns {World} World instance
     */
    refresh() {
        this._initWorld();
        return this._world;
    }
}

