/**
 * Lightweight reference to an asset.
 * Stores only the asset id and a reference to the AssetManager,
 * fetching the current descriptor on demand.
 * Never owns the runtime resource.
 */
export class AssetHandle {
  /**
   * @param {string} assetId
   * @param {import('./AssetManager.js').AssetManager} manager
   */
  constructor(assetId, manager) {
    /** @private */
    this._assetId = assetId;
    /** @private */
    this._manager = manager;
  }

  /** @returns {string} */
  id() { return this._assetId; }

  /**
   * Returns the current descriptor, or null if the asset no longer exists.
   * @returns {import('./AssetDescriptor.js').AssetDescriptor|null}
   */
  descriptor() {
    return this._manager.find(this._assetId) || null;
  }

  /**
   * Returns true if the asset is still registered and its state is not 'Failed' or 'Unloaded'.
   * @returns {boolean}
   */
  isValid() {
    const desc = this.descriptor();
    if (!desc) return false;
    const state = desc.state;
    return state !== 'Failed' && state !== 'Unloaded';
  }
}