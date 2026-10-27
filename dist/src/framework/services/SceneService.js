// src/framework/services/SceneService.js
import { Service } from './Service.js';
import { SceneManager } from '../../scene/SceneManager.js';

export class SceneService extends Service {
  /**
   * @param {import('../core/Framework.js').Framework} framework
   */
  constructor(framework) {
    super('scene', framework);
    /** @type {SceneManager|null} @private */
    this._sceneManager = null;
  }

  /** @override */
  async initialize() {
    this._sceneManager = new SceneManager();
  }

  /** @override */
  async start() {}

  /**
   * Forward per‑frame update to the scene manager.
   * @param {number} delta
   */
  update(delta) {
    if (this._sceneManager) {
      this._sceneManager.update(delta);
    }
  }

  /**
   * Read‑only access to the scene manager.
   * @returns {SceneManager|null}
   */
  get sceneManager() {
    return this._sceneManager;
  }

  /** @override */
  async shutdown() {
    if (this._sceneManager) {
      const current = this._sceneManager.current();
      if (current) {
        current.stop();
        current.unload();
        current.destroy();
      }
      this._sceneManager = null;
    }
  }
}