// src/framework/services/UIService.js
import { Service } from './Service.js';
import { UIManager } from '../../ui/UIManager.js';

/**
 * UIService coordinates HUD presentation, user alerts, mission tracking,
 * and system pause modals.
 * Conforms to EDD Chapter 21 (User Interface & UX Framework).
 */
export class UIService extends Service {
  /**
   * @param {import('../core/Framework.js').Framework} framework
   */
  constructor(framework) {
    super('ui', framework);
    /** @type {UIManager|null} */
    this.uiManager = null;
  }

  /** @override */
  async initialize() {
    this.uiManager = new UIManager(this.framework);
    this.uiManager.initialize();
  }

  /** @override */
  async start() {
    console.log('[UIService] Started with active HUD overlay and pause menu.');
    if (this.uiManager) {
      this.uiManager.refreshMissionList();
    }
  }

  /**
   * Called per frame during the 'ui' phase of the FrameScheduler.
   * @param {number} delta
   */
  update(delta) {
    // Synchronize latest player vitals if needed
    const playerService = this.framework.serviceRegistry.get('player');
    if (playerService && this.uiManager) {
      const vitals = playerService.getVitals();
      if (vitals) {
        this.uiManager.updateHealth(vitals.health, vitals.maxHealth);
        this.uiManager.updateStamina(vitals.stamina, vitals.maxStamina);
      }
    }
  }

  /**
   * Displays a prominent in-game notification banner.
   * @param {string} message
   * @param {number} [durationMs=3500]
   */
  showNotification(message, durationMs = 3500) {
    if (this.uiManager) {
      this.uiManager.showNotification(message, durationMs);
    }
  }

  /**
   * Toggle pause menu visibility.
   * @param {boolean} [forceState]
   */
  togglePause(forceState) {
    if (this.uiManager) {
      this.uiManager.togglePauseMenu(forceState);
    }
  }

  /** @override */
  async shutdown() {
    if (this.uiManager) {
      this.uiManager.destroy();
      this.uiManager = null;
    }
  }
}
