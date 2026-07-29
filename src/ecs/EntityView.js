export class EntityView {
  /**
   * @param {import('./ECSManager.js').ECSManager} ecs
   * @param {import('./EntitySignature.js').EntitySignature} requiredSignature
   */
  constructor(ecs, requiredSignature) {
    this._ecs = ecs;
    this._requiredSignature = requiredSignature;
  }

  [Symbol.iterator]() {
    return this._ecs._iterateMatching(this._requiredSignature);
  }
}