// src/editor/LevelSerializer.js

/**
 * LevelSerializer handles importing and exporting level definitions as JSON data files.
 * Allows new levels, props, and encounters to be authored without modifying engine code.
 * Conforms to EDD Chapter 20 (Editor Architecture & Developer Toolchain).
 */
export class LevelSerializer {
  /**
   * Validates a level data object against the schema.
   * @param {Object} levelData
   * @returns {{ valid: boolean, errors: string[] }}
   */
  static validate(levelData) {
    const errors = [];
    if (!levelData || typeof levelData !== 'object') {
      return { valid: false, errors: ['Level data must be a valid JSON object'] };
    }
    if (!levelData.id || typeof levelData.id !== 'string') {
      errors.push('Missing or invalid "id" field');
    }
    if (!levelData.name || typeof levelData.name !== 'string') {
      errors.push('Missing or invalid "name" field');
    }
    if (!Array.isArray(levelData.entities)) {
      errors.push('Level must contain an "entities" array');
    }
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Exports the live ECS and World state into a Level JSON data object.
   * @param {import('../framework/core/Framework.js').Framework} framework
   * @param {string} [levelId='custom_level']
   * @param {string} [levelName='Custom Level']
   * @returns {Object} Level JSON schema object
   */
  static exportLevel(framework, levelId = 'custom_level', levelName = 'Custom Level') {
    const ecs = framework.serviceRegistry.get('ecs')?.ecsManager;
    const playerService = framework.serviceRegistry.get('player');
    const gameplayService = framework.serviceRegistry.get('gameplay');

    const playerPos = playerService?.getPlayerPosition() || { x: 0, y: 1.7, z: 5 };
    const playerOrient = playerService?.controller?.getOrientation?.() || { yaw: 0, pitch: 0 };

    const exportedEntities = [];

    if (ecs) {
      const transformStore = ecs.getStore('Transform');
      const meshStore = ecs.getStore('Mesh');
      const colliderStore = ecs.getStore('Collider');
      const interactStore = ecs.getStore('Interactable');
      const aiStore = ecs.getStore('AI');

      const allIds = ecs.entities ? Array.from(ecs.entities) : [];
      for (const eid of allIds) {
        if (eid === 1000) continue; // Skip player (tracked in playerSpawn)

        const entityData = {
          id: eid,
          components: {}
        };

        if (transformStore?.has(eid)) {
          const t = transformStore.get(eid);
          entityData.components.Transform = {
            position: { x: t.position.x, y: t.position.y, z: t.position.z },
            rotation: { x: t.rotation.x, y: t.rotation.y, z: t.rotation.z },
            scale: { x: t.scale.x, y: t.scale.y, z: t.scale.z }
          };
        }

        if (meshStore?.has(eid)) {
          const m = meshStore.get(eid);
          entityData.components.Mesh = {
            meshId: m.meshId,
            size: m.size ? { x: m.size.x, y: m.size.y, z: m.size.z } : { x: 1, y: 1, z: 1 },
            color: m.color || 0x00ffcc
          };
        }

        if (colliderStore?.has(eid)) {
          const c = colliderStore.get(eid);
          entityData.components.Collider = {
            shape: c.shape || 'box',
            size: c.size ? { x: c.size.x, y: c.size.y, z: c.size.z } : { x: 1, y: 1, z: 1 },
            isTrigger: Boolean(c.isTrigger)
          };
        }

        if (interactStore?.has(eid)) {
          const i = interactStore.get(eid);
          entityData.components.Interactable = {
            prompt: i.prompt,
            actionId: i.actionId,
            radius: i.radius,
            isOneShot: Boolean(i.isOneShot)
          };
        }

        if (aiStore?.has(eid)) {
          const a = aiStore.get(eid);
          entityData.components.AI = {
            role: a.role,
            state: a.state,
            patrolRadius: a.patrolRadius || 10
          };
        }

        exportedEntities.push(entityData);
      }
    }

    const mission = gameplayService?.missionManager ? {
      title: gameplayService.missionManager.missionTitle,
      objectives: gameplayService.missionManager.objectives.map(o => ({
        id: o.id,
        title: o.title,
        description: o.description
      }))
    } : null;

    return {
      version: 1,
      id: levelId,
      name: levelName,
      playerSpawn: {
        position: { x: playerPos.x, y: playerPos.y, z: playerPos.z },
        rotation: { yaw: playerOrient.yaw, pitch: playerOrient.pitch }
      },
      environment: {
        fogColor: '#0a0a14',
        fogNear: 20,
        fogFar: 80,
        ambientLightColor: '#222233',
        ambientIntensity: 0.6
      },
      entities: exportedEntities,
      mission
    };
  }

  /**
   * Imports a level JSON object and instantiates all entities into the ECS and World.
   * Completely data-driven: no engine source code changes needed to load new levels!
   * @param {Object} levelData
   * @param {import('../framework/core/Framework.js').Framework} framework
   * @returns {boolean} True if successfully loaded
   */
  static importLevel(levelData, framework) {
    const val = this.validate(levelData);
    if (!val.valid) {
      console.error('[LevelSerializer] Validation failed:', val.errors);
      return false;
    }

    const ecs = framework.serviceRegistry.get('ecs')?.ecsManager;
    const playerService = framework.serviceRegistry.get('player');
    const gameplayService = framework.serviceRegistry.get('gameplay');

    if (!ecs) {
      console.error('[LevelSerializer] ECS manager not available');
      return false;
    }

    // 1. Clear existing non-player entities
    const allIds = ecs.entities ? Array.from(ecs.entities) : [];
    for (const eid of allIds) {
      if (eid !== 1000) {
        ecs.destroyEntity(eid);
      }
    }

    // 2. Set Player spawn position and orientation
    if (levelData.playerSpawn && playerService?.controller) {
      const sp = levelData.playerSpawn.position;
      const rot = levelData.playerSpawn.rotation;
      if (sp && playerService.controller.setPosition) {
        playerService.controller.setPosition(sp.x, sp.y, sp.z);
      }
      if (rot && playerService.controller.setOrientation) {
        playerService.controller.setOrientation(rot.yaw || 0, rot.pitch || 0);
      }
    }

    // 3. Instantiate level entities
    for (const ent of levelData.entities) {
      const eid = ent.id || ecs.createEntity();
      if (!ecs.entities.has(eid)) {
        ecs.createEntity(eid);
      }

      const comps = ent.components || {};

      if (comps.Transform) {
        ecs.addComponent(eid, 'Transform');
        const t = ecs.getComponent(eid, 'Transform');
        if (t && comps.Transform.position) {
          t.position.x = comps.Transform.position.x;
          t.position.y = comps.Transform.position.y;
          t.position.z = comps.Transform.position.z;
        }
      }

      if (comps.Mesh) {
        ecs.addComponent(eid, 'Mesh');
        const m = ecs.getComponent(eid, 'Mesh');
        if (m) {
          m.meshId = comps.Mesh.meshId || 'cube';
          if (comps.Mesh.size) {
            m.size = { ...comps.Mesh.size };
          }
          if (comps.Mesh.color) {
            m.color = comps.Mesh.color;
          }
        }
      }

      if (comps.Collider) {
        ecs.addComponent(eid, 'Collider');
        const c = ecs.getComponent(eid, 'Collider');
        if (c) {
          c.shape = comps.Collider.shape || 'box';
          if (comps.Collider.size) {
            c.size = { ...comps.Collider.size };
          }
          c.isTrigger = Boolean(comps.Collider.isTrigger);
        }
      }

      if (comps.Interactable) {
        ecs.addComponent(eid, 'Interactable');
        const i = ecs.getComponent(eid, 'Interactable');
        if (i) {
          i.prompt = comps.Interactable.prompt || 'Press [E] to Interact';
          i.actionId = comps.Interactable.actionId || `act_${eid}`;
          i.radius = comps.Interactable.radius || 2.5;
          i.isOneShot = Boolean(comps.Interactable.isOneShot);
        }
      }

      if (comps.AI) {
        ecs.addComponent(eid, 'AI');
        const a = ecs.getComponent(eid, 'AI');
        if (a) {
          a.role = comps.AI.role || 'patrol';
          a.state = comps.AI.state || 'patrol';
          a.patrolRadius = comps.AI.patrolRadius || 10;
        }
      }
    }

    // 4. Configure Mission if defined
    if (levelData.mission && gameplayService?.missionManager) {
      gameplayService.missionManager.missionTitle = levelData.mission.title || 'New Sector';
      if (Array.isArray(levelData.mission.objectives)) {
        gameplayService.missionManager.objectives = levelData.mission.objectives.map(o => ({
          id: o.id,
          title: o.title,
          description: o.description || '',
          completed: false
        }));
      }
    }

    // 5. Emit event & update UI
    if (framework.eventBus) {
      framework.eventBus.publish('level:loaded', this, {
        levelId: levelData.id,
        levelName: levelData.name
      });
    }

    const ui = framework.serviceRegistry.get('ui');
    if (ui) {
      ui.showNotification(`SECTOR LOADED: ${levelData.name}`);
      ui.uiManager?.refreshMissionList();
    }

    console.log(`[LevelSerializer] Successfully loaded level "${levelData.name}" (${levelData.id}) with ${levelData.entities.length} entities.`);
    return true;
  }
}
