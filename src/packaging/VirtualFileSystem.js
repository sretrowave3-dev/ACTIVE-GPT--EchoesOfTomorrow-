// src/packaging/VirtualFileSystem.js

/**
 * VirtualFileSystem (VFS) abstracts asset resolution through URI schemes
 * (e.g. 'vfs://levels/sector_omega.json'), providing mount routing, fallback paths,
 * and memory bundle caching.
 * Conforms to EDD Chapter 25 §6 (Virtual File System).
 */
export class VirtualFileSystem {
  constructor() {
    /** @type {Map<string, string>} Mount table scheme/prefix -> physical path */
    this.mounts = new Map([
      ['vfs://levels/', './assets/levels/'],
      ['vfs://audio/', './assets/audio/'],
      ['vfs://textures/', './assets/textures/'],
      ['vfs://assets/', './assets/'],
      ['vfs://', './']
    ]);

    /** @type {Map<string, any>} In-memory file cache */
    this.cache = new Map();
  }

  /**
   * Mounts a virtual path prefix to a target physical path.
   * @param {string} virtualPrefix
   * @param {string} physicalPrefix
   */
  mount(virtualPrefix, physicalPrefix) {
    this.mounts.set(virtualPrefix, physicalPrefix);
  }

  /**
   * Resolves a virtual URI to a physical path.
   * @param {string} uri
   * @returns {string} Resolved physical path or original URI
   */
  resolvePath(uri) {
    if (!uri || typeof uri !== 'string') return uri;

    for (const [vPrefix, pPrefix] of this.mounts.entries()) {
      if (uri.startsWith(vPrefix)) {
        return uri.replace(vPrefix, pPrefix);
      }
    }
    return uri;
  }

  /**
   * Stores pre-packaged data directly in the VFS cache.
   * @param {string} uri
   * @param {any} data
   */
  store(uri, data) {
    this.cache.set(uri, data);
  }

  /**
   * Reads data from cache or fetches from resolved physical path.
   * @param {string} uri
   * @param {'json'|'text'|'arrayBuffer'} [format='json']
   * @returns {Promise<any>}
   */
  async read(uri, format = 'json') {
    if (this.cache.has(uri)) {
      return this.cache.get(uri);
    }

    const resolved = this.resolvePath(uri);
    if (typeof fetch !== 'undefined') {
      const res = await fetch(resolved);
      if (!res.ok) throw new Error(`VFS fetch failed: ${resolved} (${res.status})`);

      let data;
      if (format === 'json') data = await res.json();
      else if (format === 'text') data = await res.text();
      else data = await res.arrayBuffer();

      this.cache.set(uri, data);
      return data;
    }

    return null;
  }

  /**
   * Checks if URI exists in the in-memory cache.
   * @param {string} uri
   * @returns {boolean}
   */
  has(uri) {
    return this.cache.has(uri);
  }

  /**
   * Clears in-memory VFS cache.
   */
  clearCache() {
    this.cache.clear();
  }
}
