// src/animation/graph/GraphNode.js

/**
 * GraphNode is the abstract base unit of an animation evaluation graph.
 * Conforms to EDD Volume V (Animation System & Graph Architecture).
 */
export class GraphNode {
  /**
   * @param {string} [name='GraphNode']
   */
  constructor(name = 'GraphNode') {
    this.name = name;
  }

  /**
   * Evaluates the node and produces a pose or blend weight.
   * @param {Object} context - Execution context containing delta, parameters, and time
   * @returns {Object} Evaluated state or pose
   */
  evaluate(context) {
    return {};
  }
}
