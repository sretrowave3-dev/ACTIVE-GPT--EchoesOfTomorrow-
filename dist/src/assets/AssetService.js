import { Service } from '../framework/services/Service.js';
import { AssetManager } from './AssetManager.js';

export class AssetService extends Service {
  constructor(framework) {
    super('assets', framework);
    /** @type {AssetManager|null} @private */
    this._assetManager = null;
  }

  async initialize() {
    this._assetManager = new AssetManager();   // loaders are built inside
  }

  update(delta) {
    if (this._assetManager) {
      this._assetManager.update(delta);
    }
  }

  get assetManager() {
    return this._assetManager;
  }

  async shutdown() {
    if (this._assetManager) {
      await this._assetManager.clear();
      this._assetManager = null;
    }
  }
}