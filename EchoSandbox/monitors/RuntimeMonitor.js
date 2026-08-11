/**
 * Echo Sandbox — Runtime Monitor
 *
 * Monitors the engine's runtime state and updates the
 * Sandbox state with current values.
 */

import { FrameworkAdapter } from '../adapters/FrameworkAdapter.js';
import { WorldAdapter } from '../adapters/WorldAdapter.js';
import { ECSAdapter } from '../adapters/ECSAdapter.js';
import { AnimationAdapter } from '../adapters/AnimationAdapter.js';
import { AssetAdapter } from '../adapters/AssetAdapter.js';
import { RenderingAdapter } from '../adapters/RenderingAdapter.js';
import { TimeAdapter } from '../adapters/TimeAdapter.js';

export class RuntimeMonitor {
    constructor(framework, state) {
        this.framework = framework;
        this.state = state;
        this._running = false;
        this._intervalId = null;
        this._updateInterval = 100; // ms

        // Initialize adapters
        this.frameworkAdapter = new FrameworkAdapter(framework);
        this.worldAdapter = new WorldAdapter(framework);
        this.ecsAdapter = new ECSAdapter(framework);
        this.animationAdapter = new AnimationAdapter(framework);
        this.assetAdapter = new AssetAdapter(framework);
        this.renderingAdapter = new RenderingAdapter(framework);
        this.timeAdapter = new TimeAdapter(framework);
    }

    /**
     * Start monitoring.
     */
    start() {
        if (this._running) return;
        this._running = true;

        // Immediate update
        this._update();

        // Periodic updates
        this._intervalId = setInterval(() => {
            if (this._running) {
                this._update();
            }
        }, this._updateInterval);
    }

    /**
     * Stop monitoring.
     */
    stop() {
        this._running = false;
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
    }

    /**
     * Update all runtime data.
     * @param {number} delta - Delta time (optional)
     * @private
     */
    _update(delta = 0) {
        // Framework status
        const frameworkStatus = this.frameworkAdapter.getStatus();
        const eventBusStats = this.frameworkAdapter.getEventBusStats();

        // World status
        const worldStatus = this.worldAdapter.getStatus();

        // ECS status
        const ecsStatus = this.ecsAdapter.getStatus();
        const systems = this.ecsAdapter.getSystems();

        // Animation status
        const animationStatus = this.animationAdapter.getStatus();

        // Asset status
        const assetStatus = this.assetAdapter.getStatus();

        // Rendering status
        const renderStatus = this.renderingAdapter.getStatus();

        // Time status
        const timeStatus = this.timeAdapter.getStatus();

        // Update state
        this.state.update({
            engineRunning: true,
            stats: {
                fps: 60, // Will be updated by performance monitor
                frameTime: timeStatus.delta * 1000 || 0,
                memory: 0, // Will be updated by memory monitor
                entities: worldStatus.entityCount || 0,
                components: ecsStatus.componentCount || 0,
                systems: ecsStatus.systemCount || 0,
                loadedAssets: assetStatus.loadedCount || 0,
                textures: 0, // Derived from assets
                drawCalls: 0, // Derived from renderer
                triangles: 0, // Derived from renderer
                streamingSectors: worldStatus.sectorCount || 0,
                animationPlayers: animationStatus.systemCount || 0,
                worldTime: timeStatus.elapsed || 0,
                timeQueueSize: timeStatus.diagnostics?.queueSize || 0,
                timeDependencies: timeStatus.diagnostics?.dependencyCount || 0,
                simulationTime: timeStatus.diagnostics?.simulationTime || 0
            }
        });

        // Update module statuses
        this.state.setModuleStatus('runtime', 'ready', {
            frame: timeStatus.frame || 0,
            delta: timeStatus.delta || 0
        });
        this.state.setModuleStatus('time', timeStatus.ready ? 'ready' : 'missing', {
            elapsed: timeStatus.elapsed || 0,
            frame: timeStatus.frame || 0,
            queueSize: timeStatus.diagnostics?.queueSize || 0,
            dependencies: timeStatus.diagnostics?.dependencyCount || 0,
            simulationTime: timeStatus.diagnostics?.simulationTime || 0
        });

        // Update framework status
        this.state.setModuleStatus('framework', 'ready', {
            state: frameworkStatus.state,
            services: frameworkStatus.services ? Object.keys(frameworkStatus.services).length : 0,
            events: eventBusStats.listeners || 0
        });

        // Update world status
        this.state.setModuleStatus('world', worldStatus.ready ? 'ready' : 'missing', {
            entities: worldStatus.entityCount || 0,
            sectors: worldStatus.sectorCount || 0,
            streaming: worldStatus.streamingActive || false
        });

        // Update ECS status
        this.state.setModuleStatus('ecs', ecsStatus.ready ? 'ready' : 'missing', {
            entities: ecsStatus.entityCount || 0,
            components: ecsStatus.componentCount || 0,
            systems: ecsStatus.systemCount || 0,
            types: ecsStatus.componentTypes || []
        });

        // Update animation status
        this.state.setModuleStatus('animation', animationStatus.ready ? 'ready' : 'missing', {
            systems: animationStatus.systemCount || 0
        });

        // Update asset status
        this.state.setModuleStatus('assets', assetStatus.ready ? 'ready' : 'missing', {
            loaded: assetStatus.loadedCount || 0,
            loaders: assetStatus.loaders ? assetStatus.loaders.length : 0
        });

        // Update rendering status
        this.state.setModuleStatus('rendering', renderStatus.ready ? 'ready' : 'missing', {
            active: renderStatus.active || false,
            scene: renderStatus.hasScene || false,
            camera: renderStatus.hasCamera || false
        });
    }

    /**
     * Manual update.
     * @param {number} delta - Delta time
     */
    update(delta) {
        if (this._running) {
            this._update(delta);
        }
    }
}

