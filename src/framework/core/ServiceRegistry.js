export class ServiceRegistry {
  constructor() {
    this._services = new Map();
  }

  register(name, service) {
    if (this._services.has(name)) {
      throw new Error(`ServiceRegistry already contains a service named '${name}'.`);
    }
    this._services.set(name, service);
  }

  get(name) {
    return this._services.get(name);
  }

  async initializeAll() {
    for (const service of this._services.values()) {
      if (typeof service.initialize === 'function') {
        await service.initialize();
      }
    }
  }

  async startAll() {
    for (const service of this._services.values()) {
      if (typeof service.start === 'function') {
        await service.start();
      }
    }
  }

  async shutdownAll() {
    for (const service of this._services.values()) {
      if (typeof service.shutdown === 'function') {
        await service.shutdown();
      }
    }
  }
}
