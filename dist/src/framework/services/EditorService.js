// src/framework/services/EditorService.js
import { Service } from './Service.js';
import { EditorDevOverlay } from '../../editor/EditorDevOverlay.js';
import { LevelSerializer } from '../../editor/LevelSerializer.js';
import { WorldOutliner } from '../../editor/WorldOutliner.js';
import { DetailsInspector } from '../../editor/DetailsInspector.js';
import { TransformGizmo, GizmoMode } from '../../editor/TransformGizmo.js';
import { PlayInEditor, PIEState } from '../../editor/PlayInEditor.js';

/**
 * EditorService coordinates the in-engine developer suite:
 * World Outliner, Details Inspector, 3D Transform Gizmo, PIE (Play In Editor)
 * simulation lifecycle, CLI developer commands, and data-driven level serialization.
 * Conforms to EDD Chapter 20 (Editor Architecture & Developer Toolchain).
 */
export class EditorService extends Service {
  /**
   * @param {import('../core/Framework.js').Framework} framework
   */
  constructor(framework) {
    super('editor', framework);

    /** @type {WorldOutliner} */
    this.outliner = new WorldOutliner(framework);

    /** @type {DetailsInspector} */
    this.inspector = new DetailsInspector(framework);

    /** @type {TransformGizmo} */
    this.gizmo = new TransformGizmo();

    /** @type {PlayInEditor} */
    this.pie = new PlayInEditor(framework);

    /** @type {EditorDevOverlay|null} */
    this.overlay = null;
  }

  /** @override */
  async initialize() {
    this.overlay = new EditorDevOverlay(this.framework, {
      outliner: this.outliner,
      inspector: this.inspector,
      gizmo: this.gizmo,
      pie: this.pie
    });
    this.overlay.initialize();
  }

  /** @override */
  async start() {
    console.log('[EditorService] Started with active World Outliner, Details Inspector, Transform Gizmo, and PIE controller.');
  }

  // ==========================================
  // PIE (Play In Editor) Controls
  // ==========================================

  play() {
    this.pie.play();
  }

  pause() {
    this.pie.pause();
  }

  eject() {
    this.pie.eject();
  }

  stop() {
    this.pie.stop();
  }

  step(dt = 0.0166) {
    this.pie.stepFrame(dt);
  }

  getPIEState() {
    return this.pie.getState();
  }

  // ==========================================
  // World Outliner & Details Controls
  // ==========================================

  selectEntity(id, additive = false) {
    this.outliner.selectEntity(id, additive);
    return this.inspector.inspectEntity(id);
  }

  deselect(id) {
    this.outliner.deselect(id);
  }

  toggleEntityVisibility(id) {
    return this.outliner.toggleVisibility(id);
  }

  toggleEntityLock(id) {
    return this.outliner.toggleLock(id);
  }

  setProperty(entityId, componentName, propertyPath, newValue) {
    return this.inspector.setProperty(entityId, componentName, propertyPath, newValue);
  }

  undoProperty() {
    return this.inspector.undo();
  }

  // ==========================================
  // Transform Gizmo Controls
  // ==========================================

  setGizmoMode(mode) {
    this.gizmo.setMode(mode);
  }

  applyGizmoDelta(axis, delta, targetTransform) {
    return this.gizmo.applyDelta(axis, delta, targetTransform);
  }

  // ==========================================
  // Developer Drawer & Level Pipeline
  // ==========================================

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
