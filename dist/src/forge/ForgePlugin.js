// src/forge/ForgePlugin.js

/**
 * ForgePlugin defines the interface for modular plugins that extend Forge Engine.
 * Conforms to EDD Chapter 1 §2 & Chapter 20 §15 (Plugin Architecture).
 */
export class ForgePlugin {
  /**
   * @param {string} name
   * @param {string} [version='1.0.0']
   */
  constructor(name, version = '1.0.0') {
    this.name = name;
    this.version = version;
    this.enabled = true;
  }

  /**
   * Called during engine initialization.
   * @param {import('./ForgeEngine.js').ForgeEngine} engine
   */
  onInstall(engine) {}

  /**
   * Called per frame during the plugin update phase.
   * @param {number} delta
   * @param {import('./ForgeEngine.js').ForgeEngine} engine
   */
  onUpdate(delta, engine) {}

  /**
   * Called during engine shutdown.
   * @param {import('./ForgeEngine.js').ForgeEngine} engine
   */
  onUninstall(engine) {}
}
