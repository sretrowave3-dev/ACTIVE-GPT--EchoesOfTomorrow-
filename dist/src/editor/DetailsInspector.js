// src/editor/DetailsInspector.js

/**
 * @fileoverview DetailsInspector provides deep component property reflection,
 * live interactive editing, and state mutation, modeled after Unreal Engine's Details Panel.
 */

export class DetailsInspector {
  /**
   * @param {import('../framework/core/Framework.js').Framework} framework
   */
  constructor(framework) {
    this.framework = framework;
    /** @type {string|number|null} Currently inspected entity ID */
    this.activeEntityId = null;

    /** @type {Array<{ entityId: string|number, component: string, property: string, oldValue: any, newValue: any }>} */
    this.undoHistory = [];
  }

  /**
   * Set the active entity to inspect and inspect its components.
   * @param {string|number|null} entityId
   * @returns {Record<string, Record<string, any>>} Map of component names to inspected property dictionaries.
   */
  inspectEntity(entityId) {
    this.activeEntityId = entityId;
    if (entityId === null || entityId === undefined) return {};

    const ecs = this.framework.getService('ecs');
    if (!ecs) return {};

    const inspectionData = {};
    const knownComponents = [
      'TransformComponent',
      'VelocityComponent',
      'HealthComponent',
      'MeshComponent',
      'ColliderComponent',
      'RigidBodyComponent',
      'AudioComponent',
      'AIComponent',
      'InteractableComponent'
    ];

    for (const compName of knownComponents) {
      if (ecs.hasComponent && ecs.hasComponent(entityId, compName)) {
        const comp = ecs.getComponent(entityId, compName);
        if (comp) {
          inspectionData[compName] = this._extractProperties(comp);
        }
      }
    }

    return inspectionData;
  }

  /**
   * Extract serializable editable properties from a component instance.
   * @private
   */
  _extractProperties(component) {
    const props = {};
    for (const [key, value] of Object.entries(component)) {
      if (key.startsWith('_')) continue; // skip private internal fields
      if (typeof value === 'function') continue; // skip methods

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // e.g. THREE.Vector3 or plain nested struct
        if ('x' in value && 'y' in value && 'z' in value) {
          props[key] = { x: value.x, y: value.y, z: value.z };
        } else {
          props[key] = { ...value };
        }
      } else if (Array.isArray(value)) {
        props[key] = [...value];
      } else {
        props[key] = value;
      }
    }
    return props;
  }

  /**
   * Mutate a component property live in the ECS store.
   * @param {string|number} entityId
   * @param {string} componentName
   * @param {string} propertyPath - E.g. 'position.x' or 'maxHealth' or 'color'
   * @param {any} newValue
   * @returns {boolean} Whether the mutation succeeded.
   */
  setProperty(entityId, componentName, propertyPath, newValue) {
    const ecs = this.framework.getService('ecs');
    if (!ecs || !ecs.getComponent) return false;

    const comp = ecs.getComponent(entityId, componentName);
    if (!comp) return false;

    // Record undo
    const oldValue = this._getNestedProperty(comp, propertyPath);
    this.undoHistory.push({
      entityId,
      component: componentName,
      property: propertyPath,
      oldValue,
      newValue
    });

    // Apply mutation
    this._setNestedProperty(comp, propertyPath, newValue);

    // Notify engine of live mutation
    if (this.framework.eventBus) {
      this.framework.eventBus.publish('editor:property_mutated', {
        entityId,
        componentName,
        propertyPath,
        oldValue,
        newValue
      });
    }

    return true;
  }

  /**
   * Undo the last property mutation.
   * @returns {boolean}
   */
  undo() {
    if (this.undoHistory.length === 0) return false;

    const op = this.undoHistory.pop();
    const ecs = this.framework.getService('ecs');
    if (!ecs || !ecs.getComponent) return false;

    const comp = ecs.getComponent(op.entityId, op.component);
    if (!comp) return false;

    this._setNestedProperty(comp, op.property, op.oldValue);

    if (this.framework.eventBus) {
      this.framework.eventBus.publish('editor:property_mutated', {
        entityId: op.entityId,
        componentName: op.component,
        propertyPath: op.property,
        oldValue: op.newValue,
        newValue: op.oldValue
      });
    }

    return true;
  }

  /**
   * Helper to retrieve nested property by path (e.g. 'position.x').
   * @private
   */
  _getNestedProperty(obj, path) {
    const parts = path.split('.');
    let curr = obj;
    for (const part of parts) {
      if (curr === undefined || curr === null) return undefined;
      curr = curr[part];
    }
    return curr;
  }

  /**
   * Helper to set nested property by path (e.g. 'position.x').
   * @private
   */
  _setNestedProperty(obj, path, val) {
    const parts = path.split('.');
    let curr = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!curr[part]) curr[part] = {};
      curr = curr[part];
    }
    curr[parts[parts.length - 1]] = val;
  }
}
