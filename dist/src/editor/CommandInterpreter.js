// src/editor/CommandInterpreter.js

/**
 * CommandInterpreter executes developer CLI commands inside the engine runtime.
 * Conforms to EDD Chapter 20 (Developer Tools & Console).
 */
export class CommandInterpreter {
  /**
   * @param {import('../framework/core/Framework.js').Framework} framework
   */
  constructor(framework) {
    this.framework = framework;
  }

  /**
   * Parses and executes a command string.
   * @param {string} commandStr
   * @returns {{ success: boolean, output: string }}
   */
  execute(commandStr) {
    if (!commandStr || !commandStr.trim()) {
      return { success: true, output: '' };
    }

    const tokens = commandStr.trim().split(/\s+/);
    const cmd = tokens[0].toLowerCase();
    const args = tokens.slice(1);

    switch (cmd) {
      case 'help':
        return {
          success: true,
          output: [
            'AVAILABLE COMMANDS:',
            '  help                      - Display this command reference',
            '  list                      - List all active entities in ECS',
            '  inspect <id>              - Show component details of an entity',
            '  tp <x> <y> <z>            - Teleport player to coordinates',
            '  spawn <type> [x] [y] [z]  - Spawn entity (type: box, drone, terminal)',
            '  kill <id>                 - Destroy entity by ID',
            '  haos [low|med|high|ultra|auto] - Query or set HAOS hardware tier',
            '  save [slot]               - Quick save state to slot',
            '  load [slot]               - Restore state from slot',
            '  clear                     - Clear console window'
          ].join('\n')
        };

      case 'list': {
        const ecs = this.framework.serviceRegistry.get('ecs')?.ecsManager;
        if (!ecs) return { success: false, output: 'ECS manager unavailable' };

        const entities = Array.from(ecs.entities || []);
        const lines = [`ACTIVE ECS ENTITIES (${entities.length}):`];
        for (const id of entities) {
          const comps = [];
          for (const [name, store] of ecs.stores.entries()) {
            if (store.has(id)) comps.push(name);
          }
          lines.push(`  ID ${id.toString().padStart(4, ' ')}: [${comps.join(', ')}]`);
        }
        return { success: true, output: lines.join('\n') };
      }

      case 'inspect': {
        const id = parseInt(args[0], 10);
        if (isNaN(id)) return { success: false, output: 'Usage: inspect <entityId>' };

        const ecs = this.framework.serviceRegistry.get('ecs')?.ecsManager;
        if (!ecs || !ecs.entities.has(id)) {
          return { success: false, output: `Entity ${id} not found` };
        }

        const lines = [`ENTITY #${id} INSPECTION:`];
        for (const [name, store] of ecs.stores.entries()) {
          if (store.has(id)) {
            lines.push(`  [Component: ${name}]`);
            const data = store.get(id);
            for (const [k, v] of Object.entries(data)) {
              if (typeof v === 'object' && v !== null) {
                lines.push(`    ${k}: ${JSON.stringify(v)}`);
              } else {
                lines.push(`    ${k}: ${v}`);
              }
            }
          }
        }
        return { success: true, output: lines.join('\n') };
      }

      case 'tp': {
        const x = parseFloat(args[0]);
        const y = parseFloat(args[1] || '1.7');
        const z = parseFloat(args[2]);

        if (isNaN(x) || isNaN(z)) {
          return { success: false, output: 'Usage: tp <x> [y] <z>' };
        }

        const playerService = this.framework.serviceRegistry.get('player');
        if (playerService?.controller?.setPosition) {
          playerService.controller.setPosition(x, y, z);
          return { success: true, output: `Player teleported to (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})` };
        }
        return { success: false, output: 'Player controller unavailable' };
      }

      case 'spawn': {
        const type = (args[0] || 'box').toLowerCase();
        const x = parseFloat(args[1] || '0');
        const y = parseFloat(args[2] || '1.0');
        const z = parseFloat(args[3] || '0');

        const ecs = this.framework.serviceRegistry.get('ecs')?.ecsManager;
        if (!ecs) return { success: false, output: 'ECS manager unavailable' };

        const id = ecs.createEntity();
        ecs.addComponent(id, 'Transform');
        ecs.addComponent(id, 'Mesh');
        ecs.addComponent(id, 'Collider');

        const transform = ecs.getComponent(id, 'Transform');
        if (transform) {
          transform.position.x = x;
          transform.position.y = y;
          transform.position.z = z;
        }

        const mesh = ecs.getComponent(id, 'Mesh');
        if (mesh) {
          mesh.meshId = type;
          mesh.size = { x: 1, y: 1, z: 1 };
        }

        return { success: true, output: `Spawned ${type} entity #${id} at (${x}, ${y}, ${z})` };
      }

      case 'kill': {
        const id = parseInt(args[0], 10);
        if (isNaN(id)) return { success: false, output: 'Usage: kill <entityId>' };
        if (id === 1000) return { success: false, output: 'Cannot kill player entity' };

        const ecs = this.framework.serviceRegistry.get('ecs')?.ecsManager;
        if (!ecs || !ecs.entities.has(id)) {
          return { success: false, output: `Entity #${id} does not exist` };
        }

        ecs.destroyEntity(id);
        return { success: true, output: `Destroyed entity #${id}` };
      }

      case 'haos': {
        const haos = this.framework.serviceRegistry.get('haos');
        if (!haos) return { success: false, output: 'HAOS service unavailable' };

        if (!args[0]) {
          const telemetry = haos.getTelemetry();
          return {
            success: true,
            output: [
              `HAOS STATUS:`,
              `  Active Tier: ${telemetry.activeProfile?.tier || 'UNKNOWN'}`,
              `  Target FPS:  ${telemetry.activeProfile?.targetFPS} FPS`,
              `  Auto-scaling: ${telemetry.isAutoScaling ? 'ENABLED' : 'DISABLED'}`,
              `  Avg FrameTime: ${telemetry.frameMetrics?.avgMs}ms (${telemetry.frameMetrics?.fps} FPS)`,
              `  Health State: ${telemetry.frameMetrics?.health}`
            ].join('\n')
          };
        }

        const sub = args[0].toUpperCase();
        if (sub === 'AUTO') {
          haos.setAutoScaling(true);
          return { success: true, output: 'HAOS automatic adaptation enabled' };
        } else if (['LOW', 'MEDIUM', 'HIGH', 'ULTRA'].includes(sub)) {
          haos.forceTier(sub);
          return { success: true, output: `HAOS forced to [${sub}] tier (Auto-scaling disabled)` };
        }
        return { success: false, output: 'Usage: haos [LOW|MEDIUM|HIGH|ULTRA|AUTO]' };
      }

      case 'save': {
        const slot = args[0] || 'quicksave';
        const saveService = this.framework.serviceRegistry.get('save');
        if (saveService) {
          const ok = saveService.saveGame(slot);
          return { success: ok, output: ok ? `Game state saved to [${slot}]` : `Failed to save [${slot}]` };
        }
        return { success: false, output: 'Save service unavailable' };
      }

      case 'load': {
        const slot = args[0] || 'quicksave';
        const saveService = this.framework.serviceRegistry.get('save');
        if (saveService) {
          const ok = saveService.loadGame(slot);
          return { success: ok, output: ok ? `Game state restored from [${slot}]` : `Failed to load [${slot}]` };
        }
        return { success: false, output: 'Save service unavailable' };
      }

      default:
        return { success: false, output: `Unknown command "${cmd}". Type "help" for a list of commands.` };
    }
  }
}
