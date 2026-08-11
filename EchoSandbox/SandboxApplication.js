/**
 * Echo Sandbox — Main Application
 *
 * Orchestrates the entire Sandbox application.
 * Manages bootstrapping, UI rendering, and runtime monitoring.
 */

import { SandboxBootstrap } from './core/SandboxBootstrap.js';
import { SandboxState } from './core/SandboxState.js';
import { SandboxEvents } from './core/SandboxEvents.js';

import { StartupScreen } from './ui/StartupScreen.js';
import { Toolbar } from './ui/Toolbar.js';
import { Sidebar } from './ui/Sidebar.js';
import { Viewport } from './ui/Viewport.js';
import { InspectorPanel } from './ui/InspectorPanel.js';
import { StatisticsPanel } from './ui/StatisticsPanel.js';
import { ConsolePanel } from './ui/ConsolePanel.js';
import { Dashboard } from './ui/Dashboard.js';
import { StatusBar } from './ui/StatusBar.js';
import { DebugOverlay } from './DebugOverlay.js';

import { RuntimeMonitor } from './monitors/RuntimeMonitor.js';
import { PerformanceMonitor } from './monitors/PerformanceMonitor.js';
import { MemoryMonitor } from './monitors/MemoryMonitor.js';

export class SandboxApplication {
    constructor() {
        this.bootstrap = null;
        this.state = null;
        this.framework = null;
        this.runtimeMonitor = null;
        this.performanceMonitor = null;
        this.memoryMonitor = null;

        // UI components
        this.startupScreen = null;
        this.toolbar = null;
        this.sidebar = null;
        this.viewport = null;
        this.inspector = null;
        this.statistics = null;
        this.console = null;
        this.dashboard = null;
        this.statusBar = null;

        this._startTime = 0;
        this._frameCount = 0;
        this._isRunning = false;
        this._isPaused = false;
        this._animationId = null;
        this.debugOverlay = null;
    }

    /**
     * Start the Sandbox application.
     */
    async start() {
        this._startTime = performance.now();
        console.log('[Sandbox] Starting Echo Sandbox...');

        // Create state and bootstrap
        this.bootstrap = new SandboxBootstrap();
        this.state = this.bootstrap.getState();

        // Initialize UI components
        this._initUI();

        // Show startup screen
        this.startupScreen.show();

        // Boot the engine
        try {
            const result = await this.bootstrap.start((progress, message, step) => {
                this.startupScreen.updateProgress(progress, message, step);
            });

            this.framework = result.framework;

            // Hide startup screen
            this.startupScreen.hide();

            // Show main application
            this._showMainApp();

            // Initialize monitors
            this._initMonitors();

            // Start monitoring
            this._startMonitors();

            // Start main loop
            this._startMainLoop();

            console.log('[Sandbox] ✅ Application started successfully');
            this.state.addLog('Sandbox application started', 'sandbox');
        } catch (error) {
            console.error('[Sandbox] Startup failed:', error);
            this.startupScreen.showError(error.message);
            throw error;
        }
    }

    /**
     * Initialize UI components.
     * @private
     */
    _initUI() {
        this.startupScreen = new StartupScreen('startupOverlay');
        this.toolbar = new Toolbar('toolbar', this.state);
        this.sidebar = new Sidebar('sidebar', this.state);
        this.viewport = new Viewport('viewportCanvas', this.state);
        const overlayCanvas = document.getElementById('debugOverlayCanvas');
        this.debugOverlay = overlayCanvas ? new DebugOverlay(overlayCanvas) : null;
        this.inspector = new InspectorPanel('inspectorContent', this.state);
        this.statistics = new StatisticsPanel('statGrid', this.state);
        this.console = new ConsolePanel('consoleOutput', 'consoleInput', this.state);
        this.dashboard = new Dashboard('sandboxLayout', this.state);
        this.statusBar = new StatusBar('statusText', 'statusDot', this.state);
    }

    /**
     * Show the main application.
     * @private
     */
    _showMainApp() {
        const app = document.getElementById('sandboxApp');
        if (app) {
            app.style.display = 'flex';
        }
        const overlay = document.getElementById('startupOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    /**
     * Initialize runtime monitors.
     * @private
     */
    _initMonitors() {
        this.runtimeMonitor = new RuntimeMonitor(this.framework, this.state);
        this.performanceMonitor = new PerformanceMonitor(this.framework, this.state);
        this.memoryMonitor = new MemoryMonitor(this.framework, this.state);
    }

    /**
     * Start monitors.
     * @private
     */
    _startMonitors() {
        this.runtimeMonitor.start();
        this.performanceMonitor.start();
        this.memoryMonitor.start();
    }

    /**
     * Start the main loop.
     * @private
     */
    _startMainLoop() {
        this._isRunning = true;
        this._lastFrameTime = performance.now();
        this._loop();
    }

    /**
     * Main loop.
     * @private
     */
    _loop() {
        if (!this._isRunning) return;

        const now = performance.now();
        const delta = this._isPaused ? 0 : (now - this._lastFrameTime) / 1000;

        if (!this._isPaused) {
            this._frameCount++;
            this._lastFrameTime = now;

            // Update monitors
            this.runtimeMonitor.update(delta);
            this.performanceMonitor.update(delta);
            this.memoryMonitor.update(delta);

            if (this.debugOverlay) {
                const timeStatus = this.runtimeMonitor.timeAdapter?.getStatus?.() || {};
                const worldStatus = this.runtimeMonitor.worldAdapter?.getStatus?.() || {};
                const ecsStatus = this.runtimeMonitor.ecsAdapter?.getStatus?.() || {};
                this.debugOverlay.update({
                    fps: this.performanceMonitor._currentFps || 0,
                    delta,
                    entityCount: worldStatus.entityCount || 0,
                    frameCount: timeStatus.frame || 0,
                    serviceStatus: timeStatus.serviceReady ? 'RUNNING' : 'MISSING',
                    worldStatus: worldStatus.ready ? 'RUNNING' : 'MISSING',
                    ecsStatus: ecsStatus.ready ? 'RUNNING' : 'MISSING',
                    queueSize: timeStatus.diagnostics?.queueSize || 0,
                    dependencyCount: timeStatus.diagnostics?.dependencyCount || 0,
                    simulationTime: timeStatus.diagnostics?.simulationTime || 0
                });
            }
        }

        this._animationId = requestAnimationFrame(() => this._loop());
    }

    /**
     * Pause the engine.
     */
    pause() {
        this._isPaused = true;
        this.state.setValue('enginePaused', true);
        this.state.addLog('Engine paused', 'sandbox');
    }

    /**
     * Resume the engine.
     */
    resume() {
        this._isPaused = false;
        this._lastFrameTime = performance.now();
        this.state.setValue('enginePaused', false);
        this.state.addLog('Engine resumed', 'sandbox');
    }

    /**
     * Toggle pause state.
     */
    togglePause() {
        if (this._isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }

    /**
     * Step one frame (advance by one frame).
     */
    stepFrame() {
        if (!this._isPaused) {
            this.pause();
        }
        // Force one update
        const delta = 1 / 60;
        this.runtimeMonitor.update(delta);
        this.performanceMonitor.update(delta);
        this.memoryMonitor.update(delta);
        this.state.addLog('Stepped one frame', 'sandbox');
    }

    /**
     * Reload the engine.
     */
    async reload() {
        this.state.addLog('Reloading engine...', 'sandbox');
        this._isRunning = false;
        if (this._animationId) {
            cancelAnimationFrame(this._animationId);
        }

        // Reset state
        this._frameCount = 0;
        this._lastFrameTime = 0;

        // Restart
        this._isRunning = true;
        this._startMainLoop();

        this.state.addLog('Engine reloaded', 'sandbox');
    }

    /**
     * Shutdown the application.
     */
    async shutdown() {
        this._isRunning = false;
        if (this._animationId) {
            cancelAnimationFrame(this._animationId);
        }

        if (this.memoryMonitor) {
            this.memoryMonitor.stop();
        }
        if (this.performanceMonitor) {
            this.performanceMonitor.stop();
        }
        if (this.runtimeMonitor) {
            this.runtimeMonitor.stop();
        }

        if (this.framework) {
            await this.framework.serviceRegistry.shutdownAll();
        }

        this.state.addLog('Sandbox shutdown complete', 'sandbox');
        console.log('[Sandbox] Shutdown complete');
    }
}

