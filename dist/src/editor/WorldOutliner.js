// src/editor/WorldOutliner.js

/**
 * @fileoverview WorldOutliner provides a hierarchical tree view and scene entity
 * manager modeled after Unreal Engine's World Outliner. Supports entity filtering,
 * selection, visibility toggling, locking, and folder/sector grouping.
 */

export class WorldOutliner {
  /**
   * @param {import('../framework/core/Framework.js').Framework} framework
   */
  constructor(framework) {
    this.framework = framework;
    /** @type {Set<string|number>} Selected entity IDs */
    this.selectedEntityIds = new Set();
    /** @type {Set<string|number>} Hidden entity IDs */
    this.hiddenEntityIds = new Set();
    /** @type {Set<string|number>} Locked entity IDs */
    this.lockedEntityIds = new Set();

    this.filterQuery = '';
    this.activeFolder = 'all';

    /** @type {Map<string|number, { name: string, type: string, sector: string, visible: boolean, locked: boolean }>} */
    this.entityIndex = new Map();

    /** @type {((selectedIds: Array<string|number>) => void)|null} */
    this.onSelectionChanged = null;
  }

  /**
   * Refresh entity registry from ECS and World systems.
   * @returns {Array<Object>}
   */
  refresh() {
    this.entityIndex.clear();

    const ecs = this.framework.getService('ecs');
    if (!ecs) return [];

    // Query all entities across component stores
    const entities = ecs.getAllEntities ? ecs.getAllEntities() : [];

    for (const ent of entities) {
      const id = typeof ent === 'object' ? ent.id : ent;
      const transform = ecs.getComponent ? ecs.getComponent(id, 'TransformComponent') : null;
      const mesh = ecs.getComponent ? ecs.getComponent(id, 'MeshComponent') : null;
      const ai = ecs.getComponent ? ecs.getComponent(id, 'AIComponent') : null;

      let type = 'Entity';
      if (mesh) type = 'MeshActor';
      if (ai) type = 'AIActor';

      this.entityIndex.set(id, {
        id,
        name: `Actor_${id}`,
        type,
        sector: 'Sector_Main',
        visible: !this.hiddenEntityIds.has(id),
        locked: this.lockedEntityIds.has(id)
      });
    }

    return this.getFilteredEntities();
  }

  /**
   * Index an entity manually or from level data.
   * @param {string|number} id
   * @param {Object} metadata
   */
  registerEntity(id, metadata = {}) {
    this.entityIndex.set(id, {
      id,
      name: metadata.name || `Actor_${id}`,
      type: metadata.type || 'StaticMeshActor',
      sector: metadata.sector || 'DefaultSector',
      visible: !this.hiddenEntityIds.has(id),
      locked: this.lockedEntityIds.has(id)
    });
  }

  /**
   * Set the search filter string.
   * @param {string} query
   */
  setFilter(query) {
    this.filterQuery = (query || '').toLowerCase().trim();
  }

  /**
   * Get all entities matching the current search filter query.
   * @returns {Array<Object>}
   */
  getFilteredEntities() {
    const results = [];
    for (const [id, entry] of this.entityIndex) {
      if (this.filterQuery) {
        const nameMatch = entry.name.toLowerCase().includes(this.filterQuery);
        const typeMatch = entry.type.toLowerCase().includes(this.filterQuery);
        const idMatch = String(id).includes(this.filterQuery);
        if (!nameMatch && !typeMatch && !idMatch) continue;
      }
      results.push(entry);
    }
    return results;
  }

  /**
   * Select a specific entity.
   * @param {string|number} id
   * @param {boolean} [additive=false] - If true, adds to existing selection (multi-select).
   */
  selectEntity(id, additive = false) {
    if (!additive) {
      this.selectedEntityIds.clear();
    }

    if (this.entityIndex.has(id)) {
      this.selectedEntityIds.add(id);
    }

    if (this.onSelectionChanged) {
      this.onSelectionChanged(Array.from(this.selectedEntityIds));
    }
  }

  /**
   * Deselect an entity or all entities.
   * @param {string|number} [id]
   */
  deselect(id) {
    if (id !== undefined) {
      this.selectedEntityIds.delete(id);
    } else {
      this.selectedEntityIds.clear();
    }

    if (this.onSelectionChanged) {
      this.onSelectionChanged(Array.from(this.selectedEntityIds));
    }
  }

  /**
   * Toggle visibility of an entity in the viewport.
   * @param {string|number} id
   * @returns {boolean} New visibility state.
   */
  toggleVisibility(id) {
    const entry = this.entityIndex.get(id);
    if (!entry) return false;

    if (this.hiddenEntityIds.has(id)) {
      this.hiddenEntityIds.delete(id);
      entry.visible = true;
    } else {
      this.hiddenEntityIds.add(id);
      entry.visible = false;
    }

    return entry.visible;
  }

  /**
   * Toggle lock status of an entity.
   * @param {string|number} id
   * @returns {boolean} New lock state.
   */
  toggleLock(id) {
    const entry = this.entityIndex.get(id);
    if (!entry) return false;

    if (this.lockedEntityIds.has(id)) {
      this.lockedEntityIds.delete(id);
      entry.locked = false;
    } else {
      this.lockedEntityIds.add(id);
      entry.locked = true;
    }

    return entry.locked;
  }

  /**
   * @returns {Array<string|number>}
   */
  getSelected() {
    return Array.from(this.selectedEntityIds);
  }

  /**
   * @returns {number}
   */
  getEntityCount() {
    return this.entityIndex.size;
  }
}
