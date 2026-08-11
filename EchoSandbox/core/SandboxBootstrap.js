/**
 * Echo Sandbox — Boot Orchestration
 *
 * Manages the startup sequence of the Sandbox application.
 * Each step is executed in order with progress reporting.
 */

import { Framework } from '../../src/framework/core/Framework.js';
import { ServiceManifest } from '../../src/framework/core/ServiceManifest.js';
import { SandboxState } from './SandboxState.js';
import { SandboxEvents } from './SandboxEvents.js';

export class SandboxBootstrap {
    constructor() {
        this.state = new SandboxState();
        this.framework = null;
        this.steps = [
            { id: 'framework', label: 'Framework', weight: 15 },
            { id: 'services', label: 'Services', weight: 15 },
            { id: 'world', label: 'World', weight: 15 },
            { id: 'scene', label: 'Scene', weight: 10 },
            { id: 'animation', label: 'Animation', weight: 10 },
            { id: 'assets', label: 'Assets', weight: 15 },
            { id: 'runtime', label: 'Runtime', weight: 20 }
        ];
        this._currentStep = -1;
        this._progress = 0;
        this._listeners = [];
    }

    /**
     * Start the bootstrap sequence.
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<Object>} Boot result
     */
    async start(onProgress = null) {
        if (onProgress) {
            this._listeners.push(onProgress);
        }

        try {
            // Step 1: Framework
            await this._stepFramework();

            // Step 2: Services
            await this._stepServices();

            // Step 3: World
            await this._stepWorld();

            // Step 4: Scene
            await this._stepScene();

            // Step 5: Animation
            await this._stepAnimation();

            // Step 6: Assets
            await this._stepAssets();

            // Step 7: Runtime
            await this._stepRuntime();

            // Complete
            this.state.setValue('engineReady', true);
            this.state.setValue('engineRunning', true);
            this.state.setValue('bootPhase', 'complete');
            this.state.setValue('bootProgress', 100);
            this.state.setValue('bootMessage', 'Ready');

            this._notifyProgress(100, 'Ready');

            return {
                success: true,
                framework: this.framework
            };
        } catch (error) {
            this.state.setValue('bootPhase', 'failed');
            this.state.addError(error.message, 'bootstrap');
            this._notifyProgress(-1, 'Failed: ' + error.message);
            throw error;
        }
    }

    /**
     * Step 1: Initialize Framework.
     * @private
     */
    async _stepFramework() {
        this._setCurrentStep('framework');
        this._notifyProgress(5, 'Creating Framework...');

        this.framework = new Framework();
        this.state.setValue('framework', this.framework);

        this._notifyProgress(15, 'Framework initialized');
        this.state.addLog('Framework created successfully', 'framework');
        this.state.setModuleStatus('framework', 'ready', {
            version: '1.0.0'
        });
    }

    /**
     * Step 2: Register and initialize services.
     * @private
     */
    async _stepServices() {
        this._setCurrentStep('services');
        this._notifyProgress(20, 'Registering services...');

        // Register all services from manifest
        this.framework.registerServices(ServiceManifest);

        // Initialize all services
        await this.framework.serviceRegistry.initializeAll();

        this._notifyProgress(30, 'Services initialized');
        this.state.addLog('Services registered and initialized', 'services');
        this.state.setModuleStatus('services', 'ready', {
            count: ServiceManifest.length
        });

        // Update each service status
        for (const serviceClass of ServiceManifest) {
            const serviceName = serviceClass.name.replace('Service', '').toLowerCase();
            this.state.setModuleStatus(serviceName, 'ready');
        }
    }

    /**
     * Step 3: Initialize World.
     * @private
     */
    async _stepWorld() {
        this._setCurrentStep('world');
        this._notifyProgress(35, 'Initializing World...');

        const worldService = this.framework.serviceRegistry.get('world');
        if (!worldService) {
            throw new Error('WorldService not found');
        }

        await worldService.start();

        this._notifyProgress(50, 'World initialized');
        this.state.addLog('World system initialized', 'world');
        this.state.setModuleStatus('world', 'ready');
    }

    /**
     * Step 4: Initialize Scene.
     * @private
     */
    async _stepScene() {
        this._setCurrentStep('scene');
        this._notifyProgress(55, 'Initializing Scene...');

        const sceneService = this.framework.serviceRegistry.get('scene');
        if (sceneService) {
            await sceneService.start();
            this.state.addLog('Scene system initialized', 'scene');
            this.state.setModuleStatus('scene', 'ready');
        } else {
            this.state.addWarning('SceneService not found', 'scene');
            this.state.setModuleStatus('scene', 'missing');
        }

        this._notifyProgress(65, 'Scene ready');
    }

    /**
     * Step 5: Initialize Animation.
     * @private
     */
    async _stepAnimation() {
        this._setCurrentStep('animation');
        this._notifyProgress(65, 'Initializing Animation...');

        // Animation is part of ECS service currently
        const ecsService = this.framework.serviceRegistry.get('ecs');
        if (ecsService && ecsService.scheduler) {
            // Check if animation system is registered
            const systems = ecsService.scheduler.systems || [];
            const hasAnimation = systems.some(s => s.constructor.name === 'AnimationSystem');
            if (hasAnimation) {
                this.state.addLog('Animation system ready', 'animation');
                this.state.setModuleStatus('animation', 'ready');
            } else {
                this.state.addWarning('Animation system not registered', 'animation');
                this.state.setModuleStatus('animation', 'missing');
            }
        } else {
            this.state.addWarning('ECS service not available for animation', 'animation');
            this.state.setModuleStatus('animation', 'missing');
        }

        this._notifyProgress(75, 'Animation checked');
    }

    /**
     * Step 6: Initialize Assets.
     * @private
     */
    async _stepAssets() {
        this._setCurrentStep('assets');
        this._notifyProgress(78, 'Initializing Assets...');

        const assetService = this.framework.serviceRegistry.get('assets');
        if (assetService) {
            await assetService.start();
            this.state.addLog('Asset system initialized', 'assets');
            this.state.setModuleStatus('assets', 'ready');
        } else {
            this.state.addWarning('AssetService not found', 'assets');
            this.state.setModuleStatus('assets', 'missing');
        }

        this._notifyProgress(85, 'Assets ready');
    }

    /**
     * Step 7: Start Runtime.
     * @private
     */
    async _stepRuntime() {
        this._setCurrentStep('runtime');
        this._notifyProgress(88, 'Starting runtime...');

        // Start all services
        await this.framework.serviceRegistry.startAll();

        // Start main loop
        this.framework.startMainLoop();

        this._notifyProgress(95, 'Runtime running');

        // Verify event bus
        if (this.framework.eventBus) {
            this.state.addLog('EventBus active', 'runtime');
        }

        this.state.addLog('Runtime started successfully', 'runtime');
        this.state.setModuleStatus('runtime', 'ready');
    }

    /**
     * Set the current step.
     * @param {string} id - Step identifier
     * @private
     */
    _setCurrentStep(id) {
        this._currentStep = this.steps.findIndex(s => s.id === id);
        this.state.setValue('bootPhase', id);
    }

    /**
     * Notify progress listeners.
     * @param {number} progress - Progress percentage
     * @param {string} message - Progress message
     * @private
     */
    _notifyProgress(progress, message) {
        if (progress >= 0) {
            this.state.setValue('bootProgress', progress);
        }
        this.state.setValue('bootMessage', message);

        for (const listener of this._listeners) {
            try {
                listener(progress, message, this._currentStep);
            } catch (error) {
                console.warn('[SandboxBootstrap] Listener error:', error);
            }
        }
    }

    /**
     * Get the framework instance.
     * @returns {Framework} Framework instance
     */
    getFramework() {
        return this.framework;
    }

    /**
     * Get the state instance.
     * @returns {SandboxState} State instance
     */
    getState() {
        return this.state;
    }
}

