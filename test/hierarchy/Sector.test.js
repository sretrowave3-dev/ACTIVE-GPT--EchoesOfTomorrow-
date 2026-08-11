import test from 'node:test';
import assert from 'node:assert';
import { Sector } from '../../src/hierarchy/Sector.js';

class MockSectorID {
    constructor(id) { this.id = id; }
}

test('Sector - Spatial transformations', (t) => {
    const sectorId = new MockSectorID('sec_0_0');
    const sector = new Sector(sectorId);
    
    // Set sector origin to (1000, 0, -2000)
    sector.setWorldOrigin(1000, 0, -2000);
    
    const localEntityPos = { x: 50, y: 10, z: -50 };
    
    // Test Local -> World
    const worldPos = sector.toWorldPosition(localEntityPos);
    assert.strictEqual(worldPos.x, 1050);
    assert.strictEqual(worldPos.y, 10);
    assert.strictEqual(worldPos.z, -2050);
    
    // Test World -> Local
    const backToLocal = sector.toLocalPosition(worldPos);
    assert.deepStrictEqual(backToLocal, localEntityPos);
});
