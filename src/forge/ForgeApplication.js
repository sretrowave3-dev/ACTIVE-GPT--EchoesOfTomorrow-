// src/forge/ForgeApplication.js

/**
 * ForgeApplication is the base class for all game applications built upon Forge Engine.
 * Provides standard lifecycle hooks (init, start, update, shutdown) cleanly separated
 * from engine infrastructure.
 * Conforms to EDD Chapter 1 §2 & Chapter 4 §3 (Downward Dependency Architecture).
 */
export class ForgeApplication {
  /**
   * @param {string} [title='Forge Engine Game']
   * @param {string} [version='1.0.0']
   */
  constructor(title = 'Forge Engine Game', version = '1.0.0') {
    this.title = title;
    this.version = version;
    /** @type {import('./ForgeEngine.js').ForgeEngine|null} */
    this.engine = null;
    this.isRunning = false;
  }

  /**
   * Called during engine initialization before services start.
   * Override to register custom components, systems, or assets.
   * @param {import('./ForgeEngine.js').ForgeEngine} engine
   */
  async onInit(engine) {}

  /**
   * Called when engine runtime is started and gameplay begins.
   * Override to spawn player, load initial sector, or setup missions.
   * @param {import('./ForgeEngine.js').ForgeEngine} engine
   */
  async onStart(engine) {}

  /**
   * Called each frame during the active simulation loop.
   * @param {number} delta - Frame delta time in seconds
   * @param {import('./ForgeEngine.js').ForgeEngine} engine
   */
  onUpdate(delta, engine) {}

  /**
   * Called when the engine application is shutting down.
   * @param {import('./ForgeEngine.js').ForgeEngine} engine
   */
  async onShutdown(engine) {}
}
