// src/persistence/SaveManager.js

/**
 * SaveManager coordinates state serialization, schema validation,
 * and snapshot restoration across game systems.
 * Conforms to EDD Chapter 23 (Persistence & Save System).
 */
export class SaveManager {
  /**
   * @param {import('../framework/core/Framework.js').Framework} framework
   */
  constructor(framework) {
    this.framework = framework;
    this.schemaVersion = 1;
    this.storagePrefix = 'echo_save_';
    /** @type {Map<string, string>} Fallback memory storage for headless environments */
    this._memoryStore = new Map();
  }

  /**
   * Serializes current engine state into a structured snapshot.
   * @param {string} [slot='quicksave']
   * @returns {Object}
   */
  createSnapshot(slot = 'quicksave') {
    const playerService = this.framework.serviceRegistry.get('player');
    const gameplayService = this.framework.serviceRegistry.get('gameplay');
    const timeService = this.framework.serviceRegistry.get('time');

    let playerState = null;
    if (playerService) {
      const pos = playerService.getPlayerPosition();
      const orient = playerService.controller?.getOrientation?.() || { yaw: 0, pitch: 0 };
      const vitals = playerService.getVitals?.() || { health: 100, maxHealth: 100, stamina: 100, maxStamina: 100 };
      playerState = {
        position: pos ? { x: pos.x, y: pos.y, z: pos.z } : { x: 0, y: 1.7, z: 5 },
        orientation: { yaw: orient.yaw, pitch: orient.pitch },
        health: vitals.health,
        maxHealth: vitals.maxHealth,
        stamina: vitals.stamina,
        maxStamina: vitals.maxStamina
      };
    }

    let missionState = null;
    if (gameplayService && gameplayService.missionManager) {
      const mm = gameplayService.missionManager;
      missionState = {
        missionTitle: mm.missionTitle,
        objectives: mm.objectives.map(o => ({
          id: o.id,
          title: o.title,
          completed: o.completed
        }))
      };
    }

    const snapshot = {
      version: this.schemaVersion,
      slot: slot,
      timestamp: new Date().toISOString(),
      worldTime: timeService?.clock?.elapsedTime || 0,
      player: playerState,
      mission: missionState
    };

    return snapshot;
  }

  /**
   * Restores simulation state from a snapshot object.
   * @param {Object} snapshot
   * @returns {boolean} True if restoration succeeded
   */
  applySnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') {
      console.error('[SaveManager] Cannot apply empty or invalid snapshot');
      return false;
    }

    if (snapshot.version !== this.schemaVersion) {
      console.warn(`[SaveManager] Snapshot version mismatch: expected ${this.schemaVersion}, got ${snapshot.version}`);
    }

    // 1. Restore Player state
    if (snapshot.player) {
      const playerService = this.framework.serviceRegistry.get('player');
      if (playerService) {
        if (snapshot.player.position && playerService.controller?.setPosition) {
          playerService.controller.setPosition(
            snapshot.player.position.x,
            snapshot.player.position.y,
            snapshot.player.position.z
          );
        }
        if (snapshot.player.orientation && playerService.controller?.setOrientation) {
          playerService.controller.setOrientation(
            snapshot.player.orientation.yaw,
            snapshot.player.orientation.pitch
          );
        }
        if (typeof snapshot.player.health === 'number' && typeof snapshot.player.stamina === 'number' && playerService.setVitals) {
          playerService.setVitals(snapshot.player.health, snapshot.player.stamina);
        }
      }
    }

    // 2. Restore Mission state
    if (snapshot.mission) {
      const gameplayService = this.framework.serviceRegistry.get('gameplay');
      if (gameplayService && gameplayService.missionManager) {
        const mm = gameplayService.missionManager;
        if (snapshot.mission.missionTitle) {
          mm.missionTitle = snapshot.mission.missionTitle;
        }
        if (Array.isArray(snapshot.mission.objectives)) {
          for (const savedObj of snapshot.mission.objectives) {
            const targetObj = mm.objectives.find(o => o.id === savedObj.id);
            if (targetObj) {
              targetObj.completed = Boolean(savedObj.completed);
            }
          }
        }
      }
    }

    // 3. Emit persistence:loaded event
    if (this.framework.eventBus) {
      this.framework.eventBus.publish('persistence:loaded', this, {
        slot: snapshot.slot,
        timestamp: snapshot.timestamp,
        snapshot
      });
    }

    return true;
  }

  /**
   * Save a snapshot to storage.
   * @param {string} [slot='quicksave']
   * @returns {boolean} True if successfully written
   */
  saveToStorage(slot = 'quicksave') {
    try {
      const snapshot = this.createSnapshot(slot);
      const json = JSON.stringify(snapshot);
      const key = `${this.storagePrefix}${slot}`;

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, json);
      } else {
        this._memoryStore.set(key, json);
      }

      if (this.framework.eventBus) {
        this.framework.eventBus.publish('persistence:saved', this, {
          slot,
          timestamp: snapshot.timestamp,
          snapshot
        });
      }

      return true;
    } catch (err) {
      console.error(`[SaveManager] Failed to save slot "${slot}":`, err);
      return false;
    }
  }

  /**
   * Load and apply a snapshot from storage.
   * @param {string} [slot='quicksave']
   * @returns {boolean} True if successfully loaded and applied
   */
  loadFromStorage(slot = 'quicksave') {
    try {
      const key = `${this.storagePrefix}${slot}`;
      let json = null;

      if (typeof localStorage !== 'undefined') {
        json = localStorage.getItem(key);
      } else {
        json = this._memoryStore.get(key) || null;
      }

      if (!json) {
        console.warn(`[SaveManager] No save data found for slot "${slot}"`);
        return false;
      }

      const snapshot = JSON.parse(json);
      return this.applySnapshot(snapshot);
    } catch (err) {
      console.error(`[SaveManager] Failed to load slot "${slot}":`, err);
      return false;
    }
  }

  /**
   * Checks whether save data exists for a given slot.
   * @param {string} slot
   * @returns {boolean}
   */
  hasSave(slot = 'quicksave') {
    const key = `${this.storagePrefix}${slot}`;
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key) !== null;
    }
    return this._memoryStore.has(key);
  }

  /**
   * Deletes saved data for a given slot.
   * @param {string} slot
   */
  deleteSave(slot = 'quicksave') {
    const key = `${this.storagePrefix}${slot}`;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
    this._memoryStore.delete(key);
  }
}
