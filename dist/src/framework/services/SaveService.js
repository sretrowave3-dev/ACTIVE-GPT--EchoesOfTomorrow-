// src/framework/services/SaveService.js
import { Service } from './Service.js';
import { SaveManager } from '../../persistence/SaveManager.js';

/**
 * SaveService orchestrates persistent save states, quick-saving (F5),
 * and quick-loading (F9) for the Echo Engine runtime.
 * Conforms to EDD Chapter 23 (Persistence & Save System).
 */
export class SaveService extends Service {
  /**
   * @param {import('../core/Framework.js').Framework} framework
   */
  constructor(framework) {
    super('save', framework);
    /** @type {SaveManager|null} */
    this.saveManager = null;
    this._onKeyDown = this._onKeyDown.bind(this);
  }

  /** @override */
  async initialize() {
    this.saveManager = new SaveManager(this.framework);

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this._onKeyDown);
    }
  }

  /** @override */
  async start() {
    console.log('[SaveService] Started with active snapshot serialization and quick-save/load triggers.');
  }

  /**
   * Handles keyboard shortcuts for quick saving and loading.
   * @param {KeyboardEvent} e
   * @private
   */
  _onKeyDown(e) {
    if (e.code === 'F5') {
      e.preventDefault();
      this.quickSave();
    } else if (e.code === 'F9') {
      e.preventDefault();
      this.quickLoad();
    }
  }

  /**
   * Execute a quick save to the default slot.
   * @returns {boolean}
   */
  quickSave() {
    if (!this.saveManager) return false;
    const success = this.saveManager.saveToStorage('quicksave');
    if (success) {
      console.log('[SaveService] Quick Save completed successfully.');
    }
    return success;
  }

  /**
   * Execute a quick load from the default slot.
   * @returns {boolean}
   */
  quickLoad() {
    if (!this.saveManager) return false;
    const success = this.saveManager.loadFromStorage('quicksave');
    if (success) {
      console.log('[SaveService] Quick Load completed successfully.');
    }
    return success;
  }

  /**
   * Save game state to a specified named slot.
   * @param {string} slot
   * @returns {boolean}
   */
  saveGame(slot) {
    return this.saveManager ? this.saveManager.saveToStorage(slot) : false;
  }

  /**
   * Load game state from a specified named slot.
   * @param {string} slot
   * @returns {boolean}
   */
  loadGame(slot) {
    return this.saveManager ? this.saveManager.loadFromStorage(slot) : false;
  }

  /** @override */
  async shutdown() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this._onKeyDown);
    }
    this.saveManager = null;
  }
}
