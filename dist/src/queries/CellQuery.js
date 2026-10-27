export class CellQuery {
  /**
   * @param {import('../World.js').World} world
   * @param {import('../CellID.js').CellID} cellId
   * @param {import('../EntityHandle.js').EntityHandle[]} out
   * @returns {import('../EntityHandle.js').EntityHandle[]}
   */
  static query(world, cellId, out = []) {
    out.length = 0;
    const cell = world.getCell(cellId);
    if (!cell) return out;
    for (const entityIdNum of cell.entityIDs) {
      const entity = world.entityManager.entityRegistry._entities.get(entityIdNum);
      if (entity) {
        out.push(entity.handle);
      }
    }
    return out;
  }
}