/**
 * Echo Sandbox — Asset Adapter
 *
 * Queries Asset state and provides structured data
 * about the asset management system.
 */

import { EngineAdapter } from './EngineAdapter.js';

export class AssetAdapter extends EngineAdapter {
    constructor(framework) {
        super(framework);
        this._assetManager = null;
        this._initAssets();
    }

    /**
     * Initialize asset manager reference.
     * @private
     */
    _initAssets() {
        const assetService = this.getService('assets');
        if (assetService && assetService.assetManager) {
            this._assetManager = assetService.assetManager;
        }
    }

    /**
     * Get asset status.
     * @returns {Object} Asset status
     */
    getStatus() {
        if (!this._assetManager) {
            this._initAssets();
        }
        return {
            ready: !!this._assetManager,
            loadedCount: this.getLoadedCount(),
            cacheCount: this.getCacheCount(),
            loaders: this.getLoaders()
        };
    }

    /**
     * Get loaded asset count.
     * @returns {number} Number of loaded assets
     */
    getLoadedCount() {
        if (!this._assetManager) return 0;
        return this._assetManager._cache?._cache?.size || 0;
    }

    /**
     * Get cache count.
     * @returns {number} Cache size
     */
    getCacheCount() {
        if (!this._assetManager) return 0;
        return this._assetManager._cache?._cache?.size || 0;
    }

    /**
     * Get asset loaders.
     * @returns {Array} Loader information
     */
    getLoaders() {
        if (!this._assetManager) return [];
        const loaders = this._assetManager._loaders;
        if (!loaders) return [];

        return Array.from(loaders.entries()).map(([type, loader]) => ({
            type: type,
            name: loader.constructor.name
        }));
    }

    /**
     * Get asset registry entries.
     * @param {number} limit - Maximum entries
     * @returns {Array} Asset registry entries
     */
    getRegistryEntries(limit = 50) {
        if (!this._assetManager) return [];

        const registry = this._assetManager._registry;
        if (!registry) return [];

        const entries = [];
        for (const [id, descriptor] of registry._descriptors || []) {
            if (entries.length >= limit) break;
            entries.push({
                id: id,
                type: descriptor._type,
                path: descriptor._path,
                state: descriptor._state
            });
        }
        return entries;
    }

    /**
     * Get asset cache entries.
     * @returns {Array} Cache entries
     */
    getCacheEntries() {
        if (!this._assetManager) return [];

        const cache = this._assetManager._cache;
        if (!cache) return [];

        const entries = [];
        for (const [id, entry] of cache._cache || []) {
            entries.push({
                id: id,
                refCount: entry.refCount || 0
            });
        }
        return entries;
    }

    /**
     * Refresh asset manager reference.
     * @returns {Object} Asset manager instance
     */
    refresh() {
        this._initAssets();
        return this._assetManager;
    }
}

