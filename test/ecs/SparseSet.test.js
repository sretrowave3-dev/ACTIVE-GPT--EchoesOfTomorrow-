import test from 'node:test';
import assert from 'node:assert';
import { SparseSet } from '../../src/ecs/SparseSet.js';

test('SparseSet - add and get', (t) => {
    const set = new SparseSet();
    const componentData = { hp: 100 };
    
    set.add(10, componentData);
    
    assert.strictEqual(set.size, 1);
    assert.strictEqual(set.has(10), true);
    assert.deepStrictEqual(set.get(10), componentData);
});

test('SparseSet - remove', (t) => {
    const set = new SparseSet();
    set.add(1, { id: 1 });
    set.add(2, { id: 2 });
    set.add(3, { id: 3 });
    
    assert.strictEqual(set.size, 3);
    
    set.remove(2); // Remove from middle
    
    assert.strictEqual(set.size, 2);
    assert.strictEqual(set.has(2), false);
    assert.strictEqual(set.has(1), true);
    assert.strictEqual(set.has(3), true);
    
    // Check dense array packing (last element moves to deleted index)
    assert.strictEqual(set.dense[1], 3);
});

test('SparseSet - clear', (t) => {
    const set = new SparseSet();
    set.add(1, { a: 1 });
    set.add(2, { b: 2 });
    set.clear();
    
    assert.strictEqual(set.size, 0);
    assert.strictEqual(set.has(1), false);
});
