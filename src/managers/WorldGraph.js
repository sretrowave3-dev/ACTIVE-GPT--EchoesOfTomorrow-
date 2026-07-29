import { RegionID } from '../RegionID.js';
import { SectorID } from '../SectorID.js';
import { CellID } from '../CellID.js';
import { Region } from '../hierarchy/Region.js';
import { Sector } from '../hierarchy/Sector.js';
import { Cell } from '../hierarchy/Cell.js';

/**
 * Manages the world hierarchy: creation and relationships between regions,
 * sectors, and cells. Uses the registries for storage.
 */
export class WorldGraph {
  /**
   * @param {import('../registries/RegionRegistry.js').RegionRegistry} regionReg
   * @param {import('../registries/SectorRegistry.js').SectorRegistry} sectorReg
   * @param {import('../registries/CellRegistry.js').CellRegistry} cellReg
   */
  constructor(regionReg, sectorReg, cellReg) {
    this.regionRegistry = regionReg;
    this.sectorRegistry = sectorReg;
    this.cellRegistry = cellReg;
  }

  /**
   * Create a new region and register it.
   * @param {string} idValue
   * @returns {Region}
   */
  createRegion(idValue) {
    const id = new RegionID(idValue);
    const region = new Region(id);
    this.regionRegistry.register(id, region);
    return region;
  }

  /**
   * Create a new sector and register it.
   * @param {string} idValue
   * @returns {Sector}
   */
  createSector(idValue) {
    const id = new SectorID(idValue);
    const sector = new Sector(id);
    this.sectorRegistry.register(id, sector);
    return sector;
  }

  /**
   * Create a new cell and register it.
   * @param {string} idValue
   * @returns {Cell}
   */
  createCell(idValue) {
    const id = new CellID(idValue);
    const cell = new Cell(id);
    this.cellRegistry.register(id, cell);
    return cell;
  }

  /**
   * Attach a sector to a region.
   * @param {RegionID} regionId
   * @param {SectorID} sectorId
   */
  addSectorToRegion(regionId, sectorId) {
    const region = this.regionRegistry.get(regionId);
    if (!region) throw new Error(`Region ${regionId} does not exist.`);
    if (!region.sectorIDs.some(sid => sid.equals(sectorId))) {
      region.sectorIDs.push(sectorId);
    }
  }

  /**
   * Attach a cell to a sector.
   * @param {SectorID} sectorId
   * @param {CellID} cellId
   */
  addCellToSector(sectorId, cellId) {
    const sector = this.sectorRegistry.get(sectorId);
    if (!sector) throw new Error(`Sector ${sectorId} does not exist.`);
    if (!sector.cellIDs.some(cid => cid.equals(cellId))) {
      sector.cellIDs.push(cellId);
    }
  }
}