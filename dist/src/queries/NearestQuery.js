export class NearestQuery {
  /**
   * @param {import('../World.js').World} world
   * @param {{x:number,y:number,z:number}} center
   * @returns {import('../EntityHandle.js').EntityHandle|null}
   */
  static query(world, center) {
    let bestDistSq = Infinity;
    let bestHandle = null;
    world.entityRegistry.forEach(entity => {
      const dx = entity.transform.position.x - center.x;
      const dy = entity.transform.position.y - center.y;
      const dz = entity.transform.position.z - center.z;
      const distSq = dx*dx + dy*dy + dz*dz;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestHandle = entity.handle;
      }
    });
    return bestHandle;
  }
}