// src/framework/services/EditorService.js
import { Service } from './Service.js';
import { EditorDevOverlay } from '../../editor/EditorDevOverlay.js';
import { LevelSerializer } from '../../editor/LevelSerializer.js';

/**
 * EditorService coordinates the in-engine developer drawer, hierarchy inspection,
 * developer CLI commands, and data-driven level serialization pipeline.
 * Conforms to EDD Chapter 20 (Editor Architecture & Developer Toolchain).
 */
export class EditorService extends Service {
  /**
   * @param {import('../core/Framework.js').Framework} framework
   */
  constructor(framework) {
    super('editor', framework);
    /** @type {EditorDevOverlay|null} */
    this.overlay = null;
  }

  /** @override */
  async initialize() {
    this.overlay = new EditorDevOverlay(this.framework);
    this.overlay.initialize();
  }

  /** @override */
  async start() {
    console.log('[EditorService] Started with active developer overlay, ECS hierarchy inspector, and level serializer.');
  }

  /**
   * Toggle the developer drawer overlay.
   * @param {boolean} [forceState]
   */
  toggleEditor(forceState) {
    if (this.overlay) {
      this.overlay.toggle(forceState);
    }
  }

  /**
   * Execute a developer console command.
   * @param {string} cmd
   * @returns {{ success: boolean, output: string }}
   */
  executeCommand(cmd) {
    return this.overlay ? this.overlay.interpreter.execute(cmd) : { success: false, output: 'Editor unavailable' };
  }

  /**
   * Loads a level definition object into the live world without engine modifications.
   * @param {Object} levelData
   * @returns {boolean}
   */
  loadLevel(levelData) {
    return LevelSerializer.importLevel(levelData, this.framework);
  }

  /**
   * Exports the live world into a JSON level data object.
   * @param {string} [levelId]
   * @param {string} [levelName]
   * @returns {Object}
   */
  exportLevel(levelId, levelName) {
    return LevelSerializer.exportLevel(this.framework, levelId, levelName);
  }

  /** @override */
  async shutdown() {
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
  }
}
