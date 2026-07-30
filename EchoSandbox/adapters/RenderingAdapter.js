/**
 * Echo Sandbox — Rendering Adapter
 *
 * Queries Rendering state and provides structured data
 * about the renderer.
 */

import { EngineAdapter } from './EngineAdapter.js';

export class RenderingAdapter extends EngineAdapter {
    constructor(framework) {
        super(framework);
        this._renderService = null;
        this._initRendering();
    }

    /**
     * Initialize render service reference.
     * @private
     */
    _initRendering() {
        this._renderService = this.getService('render');
    }

    /**
     * Get rendering status.
     * @returns {Object} Rendering status
     */
    getStatus() {
        if (!this._renderService) {
            this._initRendering();
        }
        return {
            ready: !!this._renderService,
            active: this._renderService?._running || false,
            hasScene: !!this._renderService?.scene,
            hasCamera: !!this._renderService?.camera
        };
    }

    /**
     * Get render statistics.
     * @returns {Object} Render statistics
     */
    getStats() {
        if (!this._renderService) {
            this._initRendering();
            if (!this._renderService) return { active: false };
        }

        const renderer = this._renderService.renderer;
        if (!renderer) return { active: false };

        return {
            active: true,
            width: renderer.domElement?.width || 0,
            height: renderer.domElement?.height || 0,
            pixelRatio: renderer.getPixelRatio ? renderer.getPixelRatio() : 1,
            toneMapping: renderer.toneMapping || 'none',
            shadowMap: renderer.shadowMap?.enabled || false
        };
    }

    /**
     * Get scene information.
     * @returns {Object} Scene information
     */
    getSceneInfo() {
        if (!this._renderService || !this._renderService.scene) {
            return { objects: 0, children: 0 };
        }

        const scene = this._renderService.scene;
        return {
            children: scene.children?.length || 0,
            fog: !!scene.fog,
            background: scene.background ? 'yes' : 'none'
        };
    }

    /**
     * Get camera information.
     * @returns {Object} Camera information
     */
    getCameraInfo() {
        if (!this._renderService || !this._renderService.camera) {
            return { active: false };
        }

        const cam = this._renderService.camera;
        return {
            active: true,
            type: cam.constructor.name,
            fov: cam.fov || 0,
            near: cam.near || 0,
            far: cam.far || 0,
            position: {
                x: cam.position?.x || 0,
                y: cam.position?.y || 0,
                z: cam.position?.z || 0
            }
        };
    }

    /**
     * Refresh render service reference.
     * @returns {Object} Render service instance
     */
    refresh() {
        this._initRendering();
        return this._renderService;
    }
}

