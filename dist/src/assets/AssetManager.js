import { AssetRegistry } from './AssetRegistry.js';
import { AssetCache } from './AssetCache.js';
import { AssetHandle } from './AssetHandle.js';
import { AssetType } from './AssetType.js';
import { TextureLoader } from './loaders/TextureLoader.js';
import { ModelLoader } from './loaders/ModelLoader.js';
import { MaterialLoader } from './loaders/MaterialLoader.js';
import { ShaderLoader } from './loaders/ShaderLoader.js';
import { AudioLoader } from './loaders/AudioLoader.js';
import { FontLoader } from './loaders/FontLoader.js';
import { VideoLoader } from './loaders/VideoLoader.js';

/**
 * Public API of the Asset System.
 * Owns registry, cache, and loaders. Coordinates all asset operations.
 */
export class AssetManager {
  constructor() {
    this._registry = new AssetRegistry();
    this._cache = new AssetCache();
    /** @type {Map<string, import('./AssetLoader.js').AssetLoader>} */
    this._loaders = new Map();

    // Register all built-in loaders
    this._addLoader(new TextureLoader());
    this._addLoader(new ModelLoader());
    this._addLoader(new MaterialLoader());
    this._addLoader(new ShaderLoader());
    this._addLoader(new AudioLoader());
    this._addLoader(new FontLoader());
    this._addLoader(new VideoLoader());
  }

  /**
   * Register an asset descriptor (metadata only).
   * @param {import('./AssetDescriptor.js').AssetDescriptor} descriptor
   */
  register(descriptor) {
    this._registry.register(descriptor);
  }

  /**
   * Unregister an asset. If loaded, the resource is unloaded first.
   * @param {string} id
   */
  async unregister(id) {
    const descriptor = this._registry.find(id);
    if (descriptor && this._cache.contains(id)) {
      await this._unloadInternal(id, descriptor.type);
    }
    this._registry.unregister(id);
  }

  /**
   * Load an asset by id. Returns a handle.
   * @param {string} id
   * @returns {Promise<AssetHandle>}
   */
  async load(id) {
    const descriptor = this._registry.find(id);
    if (!descriptor) throw new Error(`Asset "${id}" not registered.`);

    if (this._cache.contains(id)) {
      this._cache.retain(id);
      return new AssetHandle(id, this);
    }

    const loader = this._loaders.get(descriptor.type);
    if (!loader) throw new Error(`No loader for type "${descriptor.type}".`);

    // Update state to Loading (immutable – we will eventually update descriptor via registry)
    // For now we just load.
    const resource = await loader.load(descriptor);
    this._cache.insert(id, resource);
    return new AssetHandle(id, this);
  }

  /**
   * Explicitly unload an asset (ignoring reference count).
   * @param {string} id
   */
  async unload(id) {
    const descriptor = this._registry.find(id);
    if (!descriptor || !this._cache.contains(id)) return;
    await this._unloadInternal(id, descriptor.type);
  }

  /**
   * Reload an asset (unload and load again).
   * @param {string} id
   * @returns {Promise<AssetHandle>}
   */
  async reload(id) {
    await this.unload(id);
    return this.load(id);
  }

  /**
   * Get a handle for a registered asset (does not affect reference count).
   * @param {string} id
   * @returns {AssetHandle|undefined}
   */
  get(id) {
    const descriptor = this._registry.find(id);
    if (!descriptor) return undefined;
    return new AssetHandle(id, this);
  }

  /**
   * Find the current descriptor for an asset.
   * @param {string} id
   * @returns {import('./AssetDescriptor.js').AssetDescriptor|undefined}
   */
  find(id) {
    return this._registry.find(id);
  }

  /**
   * Check whether an asset id is registered.
   * @param {string} id
   * @returns {boolean}
   */
  contains(id) {
    return this._registry.contains(id);
  }

  /**
   * Release a reference to an asset. If the reference count reaches zero,
   * the asset is automatically unloaded.
   * @param {string} id
   */
  async release(id) {
    const descriptor = this._registry.find(id);
    if (!descriptor || !this._cache.contains(id)) return;

    const newCount = this._cache.release(id);
    if (newCount <= 0) {
      await this._unloadInternal(id, descriptor.type);
    }
  }

  /**
   * Per-frame update (placeholder for streaming queues).
   * @param {number} delta
   */
  update(delta) {
    // TODO: process pending async loads, streaming
  }

  /**
   * Clear all assets and descriptors.
   */
  async clear() {
    // Unload all cached assets first
    for (const id of this._cache._cache.keys()) {
      const descriptor = this._registry.find(id);
      if (descriptor) {
        await this._unloadInternal(id, descriptor.type);
      }
    }
    this._cache.clear();
    this._registry.clear();
  }

  // ---- private ----

  /**
   * Register a loader, ensuring no duplicate for the same type.
   * @param {import('./AssetLoader.js').AssetLoader} loader
   */
  _addLoader(loader) {
    // Determine the type(s) the loader supports. Each loader may support multiple types.
    // For our built-in loaders, each supports exactly one type.
    // We'll check by iterating over all AssetType values.
    const supported = Object.values(AssetType).filter(type => loader.supports(type));
    if (supported.length === 0) {
      throw new Error(`Loader does not support any known asset type.`);
    }
    for (const type of supported) {
      if (this._loaders.has(type)) {
        throw new Error(`Loader for type "${type}" already registered.`);
      }
      this._loaders.set(type, loader);
    }
  }

  /**
   * Internal unload – calls the loader's unload and removes from cache.
   * @param {string} id
   * @param {string} type
   */
  async _unloadInternal(id, type) {
    const resource = this._cache._getResource(id);
    if (!resource) return;
    const loader = this._loaders.get(type);
    if (loader) {
      await loader.unload(resource);
    }
    this._cache.remove(id);
  }
}