// src/forge/ForgeEngine.js
import { Bootstrap } from '../framework/core/Bootstrap.js';

/**
 * ForgeEngine is the public SDK interface and unified facade for the game-agnostic
 * engine platform extracted from Echo Engine.
 * Conforms to EDD Chapter 1 §2 (The Trilogy Hierarchy) & Chapter 4 §3.
 */
export class ForgeEngine {
  /**
   * @param {import('../framework/core/Framework.js').Framework} framework
   * @param {import('./ForgeApplication.js').ForgeApplication} app
   */
  constructor(framework, app) {
    this.framework = framework;
    this.app = app;
    this.plugins = new Map();
    this.isPaused = false;

    // Cache service shortcuts for professional SDK access
    const reg = framework.serviceRegistry;
    this.services = {
      ecs: reg.get('ecs'),
      world: reg.get('world'),
      physics: reg.get('physics'),
      render: reg.get('render'),
      audio: reg.get('audio'),
      ai: reg.get('ai'),
      haos: reg.get('haos'),
      input: reg.get('input'),
      gameplay: reg.get('gameplay'),
      ui: reg.get('ui'),
      save: reg.get('save'),
      packaging: reg.get('packaging'),
      editor: reg.get('editor'),
      time: reg.get('time')
    };

    this.eventBus = framework.eventBus;
  }

  /**
   * Launches a game application on Forge Engine.
   * @param {import('./ForgeApplication.js').ForgeApplication} appInstance
   * @param {Object} [config]
   * @returns {Promise<ForgeEngine>}
   */
  static async launch(appInstance, config = {}) {
    if (!appInstance) {
      throw new Error('[ForgeEngine] Cannot launch without a valid ForgeApplication instance');
    }

    // 1. Boot underlying runtime framework
    const framework = await Bootstrap.start();
    const engine = new ForgeEngine(framework, appInstance);
    appInstance.engine = engine;

    // 2. Initialize application
    await appInstance.onInit(engine);

    // 3. Start application
    await appInstance.onStart(engine);
    appInstance.isRunning = true;

    // 4. Hook application update into the gameplay phase of FrameScheduler
    framework.frameScheduler.addServiceToPhase('gameplay', {
      update: (delta) => {
        if (!engine.isPaused && appInstance.isRunning) {
          appInstance.onUpdate(delta, engine);
        }
        for (const plugin of engine.plugins.values()) {
          if (plugin.enabled) {
            plugin.onUpdate(delta, engine);
          }
        }
      }
    });

    console.log(`[ForgeEngine] Successfully launched "${appInstance.title}" v${appInstance.version}`);
    return engine;
  }

  /**
   * Registers and installs a plugin into the engine.
   * @param {import('./ForgePlugin.js').ForgePlugin} plugin
   */
  registerPlugin(plugin) {
    if (!plugin || !plugin.name) return;
    this.plugins.set(plugin.name, plugin);
    plugin.onInstall(this);
    console.log(`[ForgeEngine] Registered plugin: [${plugin.name} v${plugin.version}]`);
  }

  /**
   * Retrieves an installed plugin by name.
   * @param {string} name
   * @returns {import('./ForgePlugin.js').ForgePlugin|null}
   */
  getPlugin(name) {
    return this.plugins.get(name) || null;
  }

  /**
   * Suspends game updates without stopping rendering or audio loops.
   */
  pause() {
    this.isPaused = true;
    if (this.eventBus) {
      this.eventBus.publish('engine:paused', this, {});
    }
  }

  /**
   * Resumes normal game update execution.
   */
  resume() {
    this.isPaused = false;
    if (this.eventBus) {
      this.eventBus.publish('engine:resumed', this, {});
    }
  }

  /**
   * Gracefully shuts down the engine and application.
   */
  async shutdown() {
    if (this.app) {
      await this.app.onShutdown(this);
      this.app.isRunning = false;
    }

    for (const plugin of this.plugins.values()) {
      plugin.onUninstall(this);
    }
    this.plugins.clear();

    if (this.framework) {
      this.framework.stopMainLoop();
      await this.framework.serviceRegistry.shutdownAll();
    }
    console.log('[ForgeEngine] Shutdown completed.');
  }
}
