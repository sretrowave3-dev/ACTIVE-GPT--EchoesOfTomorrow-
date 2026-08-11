import test from 'node:test';
import assert from 'node:assert';
import { ComponentStore } from '../../src/ecs/ComponentStore.js';

class MockComponent {
    constructor() {
        this.value = 0;
    }
    reset() {
        this.value = -1;
    }
}

test('ComponentStore - add default and get', (t) => {
    const store = new ComponentStore(MockComponent);
    
    const comp = store.add(15);
    
    assert.strictEqual(store.count(), 1);
    assert.strictEqual(store.has(15), true);
    assert.strictEqual(comp instanceof MockComponent, true);
    assert.strictEqual(comp.value, 0);
});

test('ComponentStore - add custom and remove', (t) => {
    const store = new ComponentStore(MockComponent);
    
    const customComp = new MockComponent();
    customComp.value = 42;
    
    store.add(99, customComp);
    assert.strictEqual(store.get(99).value, 42);
    
    store.remove(99);
    assert.strictEqual(store.count(), 0);
    
    // Ensure reset was called on remove
    assert.strictEqual(customComp.value, -1);
});
