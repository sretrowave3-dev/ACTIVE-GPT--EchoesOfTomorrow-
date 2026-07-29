/**
 * Owns runtime asset objects.
 * Maintains reference counts and supports automatic unloading when count reaches zero.
 * No public method exposes the raw resource directly to gameplay.
 */
export class AssetCache {
  constructor() {
    /** @type {Map<string, { resource: *, refCount: number }>} */
    this._cache = new Map();
  }

  /**
   * Insert a runtime asset with an initial reference count of 1.
   * @param {string} id
   * @param {*} resource
   * @throws {Error} if id already exists.
   */
  insert(id, resource) {
    if (this._cache.has(id)) {
      throw new Error(`Asset "${id}" already cached.`);
    }
    this._cache.set(id, { resource, refCount: 1 });
  }

  /**
   * Remove an asset from the cache, regardless of reference count.
   * @param {string} id
   */
  remove(id) {
    this._cache.delete(id);
  }

  /**
   * Retrieve the runtime resource. This is **internal** – callers outside
   * of the asset system must not use it.
   * @param {string} id
   * @returns {*|undefined}
   * @private
   */
  _getResource(id) {
    const entry = this._cache.get(id);
    return entry ? entry.resource : undefined;
  }

  /**
   * Check if an asset is cached.
   * @param {string} id
   * @returns {boolean}
   */
  contains(id) {
    return this._cache.has(id);
  }

  /**
   * Increment reference count.
   * @param {string} id
   */
  retain(id) {
    const entry = this._cache.get(id);
    if (entry) entry.refCount++;
  }

  /**
   * Decrement reference count. Returns the new count.
   * @param {string} id
   * @returns {number}
   */
  release(id) {
    const entry = this._cache.get(id);
    if (!entry) return 0;
    entry.refCount = Math.max(0, entry.refCount - 1);
    return entry.refCount;
  }

  /**
   * Returns the current reference count.
   * @param {string} id
   * @returns {number}
   */
  getRefCount(id) {
    const entry = this._cache.get(id);
    return entry ? entry.refCount : 0;
  }

  clear() {
    this._cache.clear();
  }
}