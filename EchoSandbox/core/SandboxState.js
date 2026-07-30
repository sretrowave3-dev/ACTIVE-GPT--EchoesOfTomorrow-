/**
 * Echo Sandbox — Central State Management
 *
 * Maintains the authoritative state of the Sandbox application.
 * All state mutations are tracked and can be observed.
 */

export class SandboxState {
    constructor() {
        this._state = {
            // Boot state
            bootPhase: 'initializing',
            bootProgress: 0,
            bootMessage: 'Starting...',

            // Engine state
            engineReady: false,
            engineRunning: false,
            enginePaused: false,

            // Module states
            modules: new Map(),

            // Runtime stats
            stats: {
                fps: 0,
                frameTime: 0,
                memory: 0,
                entities: 0,
                components: 0,
                systems: 0,
                loadedAssets: 0,
                textures: 0,
                drawCalls: 0,
                triangles: 0,
                streamingSectors: 0,
                animationPlayers: 0,
                worldTime: 0
            },

            // Selected module
            selectedModule: null,

            // Console history
            consoleHistory: [],
            logs: [],
            warnings: [],
            errors: [],
            events: [],

            // Performance
            performance: {
                cpu: 0,
                gpu: 0,
                heap: 0
            },

            // Memory
            memory: {
                total: 0,
                used: 0,
                peak: 0
            }
        };

        this._observers = [];
        this._historyLimit = 1000;
    }

    /**
     * Get the current state (read-only copy).
     * @returns {Object} Deep copy of current state
     */
    get() {
        return this._deepCopy(this._state);
    }

    /**
     * Get a specific state value by path.
     * @param {string} path - Dot-separated path (e.g., 'stats.fps')
     * @returns {*} Value at path
     */
    getValue(path) {
        const parts = path.split('.');
        let current = this._state;
        for (const part of parts) {
            if (current === undefined || current === null) return undefined;
            current = current[part];
        }
        return current;
    }

    /**
     * Update state and notify observers.
     * @param {string} path - Dot-separated path
     * @param {*} value - New value
     */
    setValue(path, value) {
        const parts = path.split('.');
        let current = this._state;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) {
                current[parts[i]] = {};
            }
            current = current[parts[i]];
        }
        const lastKey = parts[parts.length - 1];
        if (current[lastKey] !== value) {
            current[lastKey] = value;
            this._notifyObservers(path, value);
        }
    }

    /**
     * Update multiple state values at once.
     * @param {Object} updates - Key-value map of updates
     */
    update(updates) {
        const changed = [];
        for (const [key, value] of Object.entries(updates)) {
            if (this._state[key] !== value) {
                this._state[key] = value;
                changed.push(key);
            }
        }
        if (changed.length > 0) {
            this._notifyObservers('batch', updates);
        }
    }

    /**
     * Register an observer for state changes.
     * @param {Function} callback - Observer function
     * @returns {Function} Unsubscribe function
     */
    observe(callback) {
        this._observers.push(callback);
        return () => {
            const index = this._observers.indexOf(callback);
            if (index !== -1) {
                this._observers.splice(index, 1);
            }
        };
    }

    /**
     * Add a console message.
     * @param {string} message - Message text
     * @param {string} type - 'info' | 'warning' | 'error'
     */
    addConsoleMessage(message, type = 'info') {
        const entry = {
            timestamp: Date.now(),
            message,
            type
        };
        this._state.consoleHistory.push(entry);
        if (this._state.consoleHistory.length > this._historyLimit) {
            this._state.consoleHistory.shift();
        }
        this._notifyObservers('console', entry);
    }

    /**
     * Add a log entry.
     * @param {string} message - Log message
     * @param {string} source - Source subsystem
     */
    addLog(message, source = 'engine') {
        const entry = {
            timestamp: Date.now(),
            message,
            source,
            type: 'log'
        };
        this._state.logs.push(entry);
        if (this._state.logs.length > this._historyLimit) {
            this._state.logs.shift();
        }
        this._notifyObservers('log', entry);
    }

    /**
     * Add a warning.
     * @param {string} message - Warning message
     * @param {string} source - Source subsystem
     */
    addWarning(message, source = 'engine') {
        const entry = {
            timestamp: Date.now(),
            message,
            source,
            type: 'warning'
        };
        this._state.warnings.push(entry);
        if (this._state.warnings.length > this._historyLimit) {
            this._state.warnings.shift();
        }
        this._notifyObservers('warning', entry);
    }

    /**
     * Add an error.
     * @param {string} message - Error message
     * @param {string} source - Source subsystem
     */
    addError(message, source = 'engine') {
        const entry = {
            timestamp: Date.now(),
            message,
            source,
            type: 'error'
        };
        this._state.errors.push(entry);
        if (this._state.errors.length > this._historyLimit) {
            this._state.errors.shift();
        }
        this._notifyObservers('error', entry);
    }

    /**
     * Set module status.
     * @param {string} moduleName - Module identifier
     * @param {string} status - 'ready' | 'loading' | 'missing' | 'error'
     * @param {Object} [details] - Additional module details
     */
    setModuleStatus(moduleName, status, details = {}) {
        const module = this._state.modules.get(moduleName) || {
            name: moduleName,
            status: 'unknown',
            details: {}
        };
        module.status = status;
        module.details = { ...module.details, ...details };
        this._state.modules.set(moduleName, module);
        this._notifyObservers('module', { moduleName, status, details });
    }

    /**
     * Get module status.
     * @param {string} moduleName - Module identifier
     * @returns {Object} Module status object
     */
    getModuleStatus(moduleName) {
        return this._state.modules.get(moduleName) || {
            name: moduleName,
            status: 'unknown',
            details: {}
        };
    }

    /**
     * Notify all observers of a change.
     * @param {string} key - Changed key
     * @param {*} value - New value
     * @private
     */
    _notifyObservers(key, value) {
        for (const observer of this._observers) {
            try {
                observer(key, value, this._state);
            } catch (error) {
                console.warn('[SandboxState] Observer error:', error);
            }
        }
    }

    /**
     * Deep copy an object.
     * @param {*} obj - Object to copy
     * @returns {*} Copy
     * @private
     */
    _deepCopy(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Map) {
            const copy = new Map();
            for (const [key, value] of obj) {
                copy.set(key, this._deepCopy(value));
            }
            return copy;
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this._deepCopy(item));
        }
        const copy = {};
        for (const [key, value] of Object.entries(obj)) {
            copy[key] = this._deepCopy(value);
        }
        return copy;
    }
}

