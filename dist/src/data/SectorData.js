/**
 * Description of a sector used for streaming.
 */
export class SectorData {
  constructor() {
    /** @type {import('../SectorID.js').SectorID} */
    this.id = null;
    /** @type {{id: string, gridX: number, gridZ: number}[]} */
    this.cells = [];
  }
}