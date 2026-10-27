import { AssetState } from './AssetState.js';

/**
 * Immutable asset metadata.
 * Holds only descriptive information; no runtime resource.
 */
export class AssetDescriptor {
  /**
   * @param {string} id
   * @param {import('./AssetType.js').AssetType} type
   * @param {string} path
   * @param {Object} [options]
   * @param {number} [options.version=1]
   * @param {string} [options.hash='']
   * @param {string} [options.state=AssetState.REGISTERED]
   */
  constructor(id, type, path, options = {}) {
    /** @readonly */
    this._id = id;
    /** @readonly */
    this._type = type;
    /** @readonly */
    this._path = path;
    /** @readonly */
    this._version = options.version ?? 1;
    /** @readonly */
    this._hash = options.hash ?? '';
    /** @readonly */
    this._state = options.state ?? AssetState.REGISTERED;
    Object.freeze(this);
  }

  get id() { return this._id; }
  get type() { return this._type; }
  get path() { return this._path; }
  get version() { return this._version; }
  get hash() { return this._hash; }
  get state() { return this._state; }

  /**
   * Create a new descriptor with a different state.
   * @param {string} newState
   * @returns {AssetDescriptor}
   */
  withState(newState) {
    return new AssetDescriptor(this._id, this._type, this._path, {
      version: this._version,
      hash: this._hash,
      state: newState,
    });
  }
}