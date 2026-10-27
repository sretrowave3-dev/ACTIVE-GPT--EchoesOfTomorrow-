import { SceneState } from './SceneState.js';
import { CameraManager } from './CameraManager.js';
import { Environment } from './Environment.js';

/**
 * High-level scene container. Owns world, camera manager, environment,
 * and metadata. Does NOT own rendering, physics, or ECS.
 */
export class Scene {
    /**
     * @param {string} id
     * @param {string} name
     */
    constructor(id, name) {
        this._id = id;
        this._name = name;
        this._world = null; // will be assigned later (World subsystem)
        this._cameraManager = new CameraManager();
        this._environment = new Environment();
        this._state = SceneState.CREATED;
        this._metadata = new Map();
    }

    get id() { return this._id; }
    get name() { return this._name; }
    get world() { return this._world; }
    set world(w) { this._world = w; }
    get cameraManager() { return this._cameraManager; }
    get environment() { return this._environment; }
    get state() { return this._state; }
    get metadata() { return this._metadata; }

    /** One state transition: CREATED/UNLOADING → LOADING */
    load() {
        if (this._state !== SceneState.CREATED && this._state !== SceneState.UNLOADING) {
            throw new Error(`Cannot load from state ${this._state}`);
        }
        this._state = SceneState.LOADING;
    }

    /** One state transition: LOADING → INITIALIZING → RUNNING */
    initialize() {
        if (this._state !== SceneState.LOADING) {
            throw new Error(`Cannot initialize from state ${this._state}`);
        }
        this._state = SceneState.INITIALIZING;
        // (future init logic)
        this._state = SceneState.RUNNING;
    }

    /** Update only when RUNNING */
    update(delta) {
        if (this._state === SceneState.RUNNING) {
            // (future update logic)
        }
    }

    /** One state transition: RUNNING → PAUSED */
    pause() {
        if (this._state === SceneState.RUNNING) {
            this._state = SceneState.PAUSED;
        }
    }

    /** One state transition: PAUSED → RUNNING */
    resume() {
        if (this._state === SceneState.PAUSED) {
            this._state = SceneState.RUNNING;
        }
    }

    /** One state transition: RUNNING/PAUSED → STOPPING */
    stop() {
        if (this._state === SceneState.RUNNING || this._state === SceneState.PAUSED) {
            this._state = SceneState.STOPPING;
        }
    }

    /** One state transition: STOPPING → UNLOADING */
    unload() {
        if (this._state !== SceneState.STOPPING && this._state !== SceneState.DESTROYED) {
            throw new Error(`Cannot unload from state ${this._state}`);
        }
        this._state = SceneState.UNLOADING;
    }

    /** One state transition: UNLOADING → DESTROYED */
    destroy() {
        if (this._state !== SceneState.UNLOADING) {
            throw new Error(`Cannot destroy from state ${this._state}`);
        }
        this._state = SceneState.DESTROYED;
        this._world = null;
        this._cameraManager.clear();
        this._environment = null;           // ✅ Fixed
        this._metadata.clear();
    }
}