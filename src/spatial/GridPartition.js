<<<<<<< HEAD
/**
 * Maps world positions to cell IDs using a uniform grid.
 */
export class GridPartition {
  /**
   * @param {number} cellSize - edge length of a cell in world units
   */
  constructor(cellSize) {
    this.cellSize = cellSize;
    /** @type {Map<string, string>} key "i,j" → CellID value */
    this._gridToCellId = new Map();
    /** @type {Map<string, string>} CellID value → key */
    this._cellIdToKey = new Map();
  }

  /**
   * Register a cell at a specific grid coordinate.
   * @param {number} gridX - integer column index
   * @param {number} gridZ - integer row index
   * @param {string} cellIdValue - the string value of a CellID
   */
  addCell(gridX, gridZ, cellIdValue) {
    const key = `${gridX},${gridZ}`;
    this._gridToCellId.set(key, cellIdValue);
    this._cellIdToKey.set(cellIdValue, key);
  }

  /**
   * Remove a cell by its string ID.
   * @param {string} cellIdValue
   */
  removeCell(cellIdValue) {
    const key = this._cellIdToKey.get(cellIdValue);
    if (key) {
      this._gridToCellId.delete(key);
      this._cellIdToKey.delete(cellIdValue);
    }
  }

  /**
   * Get the cell ID at a world position, or null if no cell loaded.
   * @param {{x: number, y: number, z: number}} position
   * @returns {string|null}
   */
  getCellId(position) {
    const i = Math.floor(position.x / this.cellSize);
    const j = Math.floor(position.z / this.cellSize);
    return this._gridToCellId.get(`${i},${j}`) || null;
  }

  /**
   * Get all cell IDs that intersect an axis-aligned bounding box (XZ plane).
   * @param {number} minX
   * @param {number} minZ
   * @param {number} maxX
   * @param {number} maxZ
   * @returns {string[]}
   */
  getCellsInBounds(minX, minZ, maxX, maxZ) {
    const startI = Math.floor(minX / this.cellSize);
    const startJ = Math.floor(minZ / this.cellSize);
    const endI = Math.floor(maxX / this.cellSize);
    const endJ = Math.floor(maxZ / this.cellSize);
    const ids = [];
    for (let i = startI; i <= endI; i++) {
      for (let j = startJ; j <= endJ; j++) {
        const id = this._gridToCellId.get(`${i},${j}`);
        if (id) ids.push(id);
      }
    }
    return ids;
  }
=======
/**
 * Maps world positions to cell IDs using a uniform grid.
 */
export class GridPartition {
  /**
   * @param {number} cellSize - edge length of a cell in world units
   */
  constructor(cellSize) {
    this.cellSize = cellSize;
    /** @type {Map<string, string>} key "i,j" → CellID value */
    this._gridToCellId = new Map();
    /** @type {Map<string, string>} CellID value → key */
    this._cellIdToKey = new Map();
  }

  /**
   * Register a cell at a specific grid coordinate.
   * @param {number} gridX - integer column index
   * @param {number} gridZ - integer row index
   * @param {string} cellIdValue - the string value of a CellID
   */
  addCell(gridX, gridZ, cellIdValue) {
    const key = `${gridX},${gridZ}`;
    this._gridToCellId.set(key, cellIdValue);
    this._cellIdToKey.set(cellIdValue, key);
  }

  /**
   * Remove a cell by its string ID.
   * @param {string} cellIdValue
   */
  removeCell(cellIdValue) {
    const key = this._cellIdToKey.get(cellIdValue);
    if (key) {
      this._gridToCellId.delete(key);
      this._cellIdToKey.delete(cellIdValue);
    }
  }

  /**
   * Get the cell ID at a world position, or null if no cell loaded.
   * @param {{x: number, y: number, z: number}} position
   * @returns {string|null}
   */
  getCellId(position) {
    const i = Math.floor(position.x / this.cellSize);
    const j = Math.floor(position.z / this.cellSize);
    return this._gridToCellId.get(`${i},${j}`) || null;
  }

  /**
   * Get all cell IDs that intersect an axis-aligned bounding box (XZ plane).
   * @param {number} minX
   * @param {number} minZ
   * @param {number} maxX
   * @param {number} maxZ
   * @returns {string[]}
   */
  getCellsInBounds(minX, minZ, maxX, maxZ) {
    const startI = Math.floor(minX / this.cellSize);
    const startJ = Math.floor(minZ / this.cellSize);
    const endI = Math.floor(maxX / this.cellSize);
    const endJ = Math.floor(maxZ / this.cellSize);
    const ids = [];
    for (let i = startI; i <= endI; i++) {
      for (let j = startJ; j <= endJ; j++) {
        const id = this._gridToCellId.get(`${i},${j}`);
        if (id) ids.push(id);
      }
    }
    return ids;
  }
>>>>>>> 2f42efe7e19574d94df56c89784f42d3d4e2c85a
}