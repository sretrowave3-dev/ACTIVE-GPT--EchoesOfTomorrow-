/**
 * ECS Entity – pure identity, signature, and flags.
 * No gameplay data.
 */
export class Entity {
  /**
   * @param {import('../world/EntityID.js').EntityID} worldId
   * @param {import('./EntitySignature.js').EntitySignature} signature
   */
  constructor(worldId, signature) {
    /** @readonly */
    this.worldId = worldId;
    this.signature = signature;
    /** @type {{ active: boolean }} */
    this.flags = { active: true };
  }
}