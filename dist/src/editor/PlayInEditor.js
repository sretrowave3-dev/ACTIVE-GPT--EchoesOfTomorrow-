// src/editor/PlayInEditor.js

/**
 * @fileoverview PlayInEditor (PIE) manages editor simulation states:
 * Edit, Play, Pause, Eject, and Stop. Provides world state snapshotting and
 * clean state restoration matching Unreal Engine's PIE workflow.
 */

export const PIEState = {
  EDIT: 'EDIT',
  PLAY: 'PLAY',
  PAUSE: 'PAUSE',
  EJECT: 'EJECT'
};

export class PlayInEditor {
  /**
   * @param {import('../framework/core/Framework.js').Framework} framework
   */
  constructor(framework) {
    this.framework = framework;
    this.state = PIEState.EDIT;

    /** @type {Object|null} Snapshot of world state taken before entering Play mode */
    this._worldSnapshot = null;

    /** @type {((oldState: string, newState: string) => void)|null} */
    this.onStateChanged = null;

    this.simulatedFrameCount = 0;
  }

  /**
   * @returns {string} Current PIE state.
   */
  getState() {
    return this.state;
  }

  /**
   * @returns {boolean} Whether simulation is running (Play or Eject).
   */
  isSimulating() {
    return this.state === PIEState.PLAY || this.state === PIEState.EJECT;
  }

  /**
   * @returns {boolean} Whether player controls are active.
   */
  isPlayerControlled() {
    return this.state === PIEState.PLAY;
  }

  /**
   * Start Play-In-Editor simulation from Edit mode.
   * Snapshots current scene/ECS transforms so they can be restored upon Stop.
   */
  play() {
    if (this.state === PIEState.EDIT) {
      this._captureSnapshot();
      this._transitionTo(PIEState.PLAY);
    } else if (this.state === PIEState.PAUSE) {
      this._transitionTo(PIEState.PLAY);
    }
  }

  /**
   * Pause simulation time.
   */
  pause() {
    if (this.state === PIEState.PLAY || this.state === PIEState.EJECT) {
      this._transitionTo(PIEState.PAUSE);
    }
  }

  /**
   * Step single simulation frame while paused.
   * @param {number} [dt=0.0166]
   */
  stepFrame(dt = 0.0166) {
    if (this.state === PIEState.PAUSE) {
      this.simulatedFrameCount++;
      const timeService = this.framework.getService('time');
      if (timeService && timeService.step) {
        timeService.step(dt);
      }
    }
  }

  /**
   * Eject from player character (Unreal F8 Eject).
   * Unbinds player controls and unlocks editor fly camera while simulation continues ticking.
   */
  eject() {
    if (this.state === PIEState.PLAY) {
      this._transitionTo(PIEState.EJECT);
    } else if (this.state === PIEState.EJECT) {
      // Re-possess player
      this._transitionTo(PIEState.PLAY);
    }
  }

  /**
   * Stop simulation and restore world state snapshot back to Edit mode.
   */
  stop() {
    if (this.state !== PIEState.EDIT) {
      this._restoreSnapshot();
      this._transitionTo(PIEState.EDIT);
    }
  }

  /**
   * Internal state transition.
   * @private
   */
  _transitionTo(newState) {
    const oldState = this.state;
    this.state = newState;

    if (this.framework.eventBus) {
      this.framework.eventBus.publish('editor:pie_state_changed', { oldState, newState });
    }

    if (this.onStateChanged) {
      this.onStateChanged(oldState, newState);
    }
  }

  /**
   * Capture pristine snapshot of world state.
   * @private
   */
  _captureSnapshot() {
    const ecs = this.framework.getService('ecs');
    if (!ecs) return;

    this._worldSnapshot = {
      timestamp: Date.now(),
      entities: {}
    };

    const entities = ecs.getAllEntities ? ecs.getAllEntities() : [];
    for (const ent of entities) {
      const id = typeof ent === 'object' ? ent.id : ent;
      const transform = ecs.getComponent ? ecs.getComponent(id, 'TransformComponent') : null;
      if (transform) {
        this._worldSnapshot.entities[id] = {
          position: transform.position ? { ...transform.position } : null,
          rotation: transform.rotation ? { ...transform.rotation } : null
        };
      }
    }
  }

  /**
   * Restore captured world state snapshot upon stopping PIE.
   * @private
   */
  _restoreSnapshot() {
    if (!this._worldSnapshot) return;

    const ecs = this.framework.getService('ecs');
    if (ecs && ecs.getComponent) {
      for (const [id, saved] of Object.entries(this._worldSnapshot.entities)) {
        const transform = ecs.getComponent(id, 'TransformComponent');
        if (transform) {
          if (saved.position && transform.position) {
            transform.position.x = saved.position.x;
            transform.position.y = saved.position.y;
            transform.position.z = saved.position.z;
          }
          if (saved.rotation && transform.rotation) {
            transform.rotation.x = saved.rotation.x;
            transform.rotation.y = saved.rotation.y;
            transform.rotation.z = saved.rotation.z;
          }
        }
      }
    }

    this._worldSnapshot = null;
  }
}
