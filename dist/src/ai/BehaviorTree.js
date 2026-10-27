// src/ai/BehaviorTree.js

export const NodeStatus = Object.freeze({
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
  RUNNING: 'RUNNING'
});

/**
 * Base abstract node in a Behavior Tree.
 */
export class BehaviorNode {
  /**
   * Evaluates this node.
   * @param {import('./Blackboard.js').Blackboard} blackboard
   * @returns {string} One of NodeStatus values
   */
  tick(blackboard) {
    return NodeStatus.SUCCESS;
  }
}

/**
 * Composite node that executes children in sequence until one returns FAILURE or RUNNING.
 */
export class SequenceNode extends BehaviorNode {
  /**
   * @param {BehaviorNode[]} [children]
   */
  constructor(children = []) {
    super();
    this.children = children;
  }

  addChild(node) {
    this.children.push(node);
    return this;
  }

  tick(blackboard) {
    for (let i = 0; i < this.children.length; i++) {
      const status = this.children[i].tick(blackboard);
      if (status !== NodeStatus.SUCCESS) {
        return status;
      }
    }
    return NodeStatus.SUCCESS;
  }
}

/**
 * Fallback / Selector composite that executes children until one returns SUCCESS or RUNNING.
 */
export class SelectorNode extends BehaviorNode {
  /**
   * @param {BehaviorNode[]} [children]
   */
  constructor(children = []) {
    super();
    this.children = children;
  }

  addChild(node) {
    this.children.push(node);
    return this;
  }

  tick(blackboard) {
    for (let i = 0; i < this.children.length; i++) {
      const status = this.children[i].tick(blackboard);
      if (status !== NodeStatus.FAILURE) {
        return status;
      }
    }
    return NodeStatus.FAILURE;
  }
}

/**
 * Leaf action node executing custom logic.
 */
export class ActionNode extends BehaviorNode {
  /**
   * @param {(bb: import('./Blackboard.js').Blackboard) => string} actionFn
   */
  constructor(actionFn) {
    super();
    this.actionFn = actionFn;
  }

  tick(blackboard) {
    return this.actionFn ? this.actionFn(blackboard) : NodeStatus.SUCCESS;
  }
}

/**
 * Leaf condition node checking a boolean predicate.
 */
export class ConditionNode extends BehaviorNode {
  /**
   * @param {(bb: import('./Blackboard.js').Blackboard) => boolean} predicate
   */
  constructor(predicate) {
    super();
    this.predicate = predicate;
  }

  tick(blackboard) {
    return (this.predicate && this.predicate(blackboard)) ? NodeStatus.SUCCESS : NodeStatus.FAILURE;
  }
}

/**
 * BehaviorTree container orchestrating the root node and blackboard.
 */
export class BehaviorTree {
  /**
   * @param {BehaviorNode} [root]
   */
  constructor(root = null) {
    this.root = root;
  }

  tick(blackboard) {
    return this.root ? this.root.tick(blackboard) : NodeStatus.FAILURE;
  }
}
