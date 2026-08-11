export class Service {
  constructor(name, framework) {
    this.name = name;
    this.framework = framework;
  }

  async initialize() {}
  async start() {}
  update(delta) {}
  async shutdown() {}
}
