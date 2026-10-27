export class AssetRegistry {
  constructor() {
    /** @type {Map<string, import('./AssetDescriptor.js').AssetDescriptor>} */
    this._descriptors = new Map();
  }

  register(descriptor) {
    if (this._descriptors.has(descriptor.id)) {
      throw new Error(`Asset "${descriptor.id}" already registered.`);
    }
    this._descriptors.set(descriptor.id, descriptor);
  }

  unregister(id) {
    this._descriptors.delete(id);
  }

  find(id) {
    return this._descriptors.get(id);
  }

  contains(id) {
    return this._descriptors.has(id);
  }

  clear() {
    this._descriptors.clear();
  }
}