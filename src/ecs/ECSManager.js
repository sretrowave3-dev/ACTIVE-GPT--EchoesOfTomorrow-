import { ComponentStore } from './ComponentStore.js';
import { EntitySignature } from './EntitySignature.js';
import { Entity } from './Entity.js';

/**
 * Core ECS Manager. Manages component type registration, component stores,
 * and entity signatures. Integrates with the World via events.
 */
export class ECSManager {
  constructor(eventBus) {
    /** @type {import('../framework/events/EventBus.js').EventBus} */
    this.eventBus = eventBus;

    /** Map component type name → numeric ID */
    this._componentTypeIds = new Map();
    /** Array of component store instances indexed by type ID */
    this._stores = [];
    /** Map entity numeric ID → Entity (ECS entity) */
    this._entities = new Map();

    this._onEntityCreated = this._onEntityCreated.bind(this);
    this._onEntityDestroyed = this._onEntityDestroyed.bind(this);
  }

  /**
   * Register a component type.
   * @param {string} name – unique name (e.g., 'Transform')
   * @param {new () => Object} componentClass – constructor
   * @returns {number} assigned type ID
   */
  registerComponent(name, componentClass) {
    if (this._componentTypeIds.has(name)) {
      throw new Error(`Component type "${name}" already registered.`);
    }
    const id = this._stores.length;
    this._componentTypeIds.set(name, id);
    this._stores.push(new ComponentStore(componentClass));
    return id;
  }

  /**
   * Get a component store by type name or ID.
   * @param {string|number} nameOrId
   * @returns {ComponentStore}
   */
  getStore(nameOrId) {
    if (typeof nameOrId === 'string') {
      const id = this._componentTypeIds.get(nameOrId);
      if (id === undefined) throw new Error(`Unknown component type "${nameOrId}".`);
      return this._stores[id];
    }
    return this._stores[nameOrId];
  }

  /**
   * Get component type ID by name.
   * @param {string} name
   * @returns {number|undefined}
   */
  getTypeId(name) {
    return this._componentTypeIds.get(name);
  }

  /**
   * Add a component to an entity.
   * @param {number} entityId – numeric ID (World EntityID.id)
   * @param {string} componentName
   * @param {Object} [componentInstance] – optional pre-created component
   * @returns {Object} the component
   */
  addComponent(entityId, componentName, componentInstance) {
    const typeId = this._componentTypeIds.get(componentName);
    if (typeId === undefined) throw new Error(`Component type "${componentName}" not registered.`);
    const store = this._stores[typeId];
    const component = store.add(entityId, componentInstance);

    let entity = this._entities.get(entityId);
    if (!entity) {
      entity = new Entity({ id: entityId, generation: 0 }, new EntitySignature());
      this._entities.set(entityId, entity);
    }
    entity.signature.add(typeId);

    return component;
  }

  /**
   * Remove a component from an entity.
   * @param {number} entityId
   * @param {string} componentName
   */
  removeComponent(entityId, componentName) {
    const typeId = this._componentTypeIds.get(componentName);
    if (typeId === undefined) return;
    const store = this._stores[typeId];
    store.remove(entityId);

    const entity = this._entities.get(entityId);
    if (entity) {
      entity.signature.remove(typeId);
    }
  }

  /**
   * Get a component for an entity.
   * @param {number} entityId
   * @param {string} componentName
   * @returns {Object|undefined}
   */
  getComponent(entityId, componentName) {
    const store = this.getStore(componentName);
    return store.get(entityId);
  }

  /**
   * Check if an entity has a component.
   * @param {number} entityId
   * @param {string} componentName
   * @returns {boolean}
   */
  hasComponent(entityId, componentName) {
    const store = this.getStore(componentName);
    return store.has(entityId);
  }

  _onEntityCreated(event) {
    const worldId = event.payload.entityId;
    const numericId = worldId.id;
    if (!this._entities.has(numericId)) {
      this._entities.set(numericId, new Entity(worldId, new EntitySignature()));
    }
  }

  _onEntityDestroyed(event) {
    const worldId = event.payload.entityId;
    const numericId = worldId.id;
    const entity = this._entities.get(numericId);
    if (entity) {
      for (let typeId = 0; typeId < this._stores.length; typeId++) {
        if (entity.signature.has(typeId)) {
          this._stores[typeId].remove(numericId);
        }
      }
      this._entities.delete(numericId);
    }
  }

  /**
   * Subscribe to World entity lifecycle events.
   * Should be called after the World is available.
   */
  setupEventListeners() {
    this.eventBus.subscribe('entity:created', this._onEntityCreated);
    this.eventBus.subscribe('entity:destroyed', this._onEntityDestroyed);
  }

  /**
   * Clean up event listeners.
   */
  dispose() {
    this.eventBus.unsubscribe('entity:created', this._onEntityCreated);
    this.eventBus.unsubscribe('entity:destroyed', this._onEntityDestroyed);
  }
}