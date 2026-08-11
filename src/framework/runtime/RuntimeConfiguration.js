import { RuntimeConfigurationError } from './errors/RuntimeConfigurationError.js';

/**
 * Immutable runtime configuration object representing resolved runtime settings and policies.
 * 
 * @class RuntimeConfiguration
 */
export class RuntimeConfiguration {
    /** @type {string} */
    static #DEFAULT_RUNTIME_NAME = 'Echo Engine Runtime';
    /** @type {string} */
    static #DEFAULT_VERSION = '1.0.0';
    /** @type {number} */
    static #DEFAULT_TARGET_FPS = 60;
    /** @type {number} */
    static #DEFAULT_FIXED_TIMESTEP = 1 / 60;
    /** @type {number} */
    static #DEFAULT_MAX_DELTA_TIME = 0.25;

    /** @type {string} */
    #runtimeName;
    /** @type {string} */
    #version;
    /** @type {number} */
    #targetFPS;
    /** @type {number} */
    #fixedTimeStep;
    /** @type {number} */
    #maxDeltaTime;
    /** @type {boolean} */
    #autoStart;
    /** @type {boolean} */
    #debugMode;
    /** @type {boolean} */
    #statisticsEnabled;
    /** @type {boolean} */
    #diagnosticsEnabled;
    /** @type {Object} */
    #schedulerConfiguration;
    /** @type {Object} */
    #pipelineConfiguration;
    /** @type {Object} */
    #sessionConfiguration;
    /** @type {Object} */
    #custom;

    /**
     * Deep clones a plain object without relying on structuredClone for maximum runtime compatibility.
     * 
     * @private
     * @template T
     * @param {T} obj - The object to clone.
     * @returns {T} The cloned object.
     */
    static #deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (Array.isArray(obj)) {
            const copy = [];
            for (let i = 0; i < obj.length; i++) {
                copy[i] = RuntimeConfiguration.#deepClone(obj[i]);
            }
            return copy;
        }

        const copy = {};
        for (const key of Object.keys(obj)) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                copy[key] = RuntimeConfiguration.#deepClone(obj[key]);
            }
        }
        return copy;
    }

    /**
     * Deep freezes an object recursively to ensure true immutability.
     * 
     * @private
     * @template T
     * @param {T} obj - The object to freeze.
     * @returns {T} The frozen object.
     */
    static #deepFreeze(obj) {
        if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
            Object.freeze(obj);
            Object.getOwnPropertyNames(obj).forEach((prop) => {
                RuntimeConfiguration.#deepFreeze(obj[prop]);
            });
        }
        return obj;
    }

    /**
     * Recursively compares two values for structural equality.
     * 
     * @private
     * @param {*} a - First value.
     * @param {*} b - Second value.
     * @returns {boolean} True if structurally equal.
     */
    static #deepEquals(a, b) {
        if (a === b) {
            return true;
        }

        if (a && b && typeof a === 'object' && typeof b === 'object') {
            const isArrayA = Array.isArray(a);
            const isArrayB = Array.isArray(b);

            if (isArrayA !== isArrayB) {
                return false;
            }

            if (isArrayA && isArrayB) {
                if (a.length !== b.length) {
                    return false;
                }
                for (let i = 0; i < a.length; i++) {
                    if (!RuntimeConfiguration.#deepEquals(a[i], b[i])) {
                        return false;
                    }
                }
                return true;
            }

            const keysA = Object.keys(a);
            const keysB = Object.keys(b);

            if (keysA.length !== keysB.length) {
                return false;
            }

            for (const key of keysA) {
                if (!Object.prototype.hasOwnProperty.call(b, key)) {
                    return false;
                }
                if (!RuntimeConfiguration.#deepEquals(a[key], b[key])) {
                    return false;
                }
            }

            return true;
        }

        return false;
    }

    /**
     * Creates an instance of RuntimeConfiguration.
     * 
     * @param {Object} [options={}] - Configuration options.
     * @throws {RuntimeConfigurationError} If any configuration value is invalid.
     */
    constructor(options = {}) {
        const {
            runtimeName = RuntimeConfiguration.#DEFAULT_RUNTIME_NAME,
            version = RuntimeConfiguration.#DEFAULT_VERSION,
            targetFPS = RuntimeConfiguration.#DEFAULT_TARGET_FPS,
            fixedTimeStep = RuntimeConfiguration.#DEFAULT_FIXED_TIMESTEP,
            maxDeltaTime = RuntimeConfiguration.#DEFAULT_MAX_DELTA_TIME,
            autoStart = false,
            debugMode = false,
            statisticsEnabled = true,
            diagnosticsEnabled = true,
            schedulerConfiguration = {},
            pipelineConfiguration = {},
            sessionConfiguration = {},
            custom = {}
        } = options;

        if (typeof runtimeName !== 'string' || runtimeName.trim() === '') {
            throw new RuntimeConfigurationError('Runtime configuration error: runtimeName must be a non-empty string.');
        }

        const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
        if (typeof version !== 'string' || !semverRegex.test(version)) {
            throw new RuntimeConfigurationError('Runtime configuration error: version must be a valid semantic version string.');
        }

        if (typeof targetFPS !== 'number' || targetFPS <= 0 || !Number.isFinite(targetFPS)) {
            throw new RuntimeConfigurationError('Runtime configuration error: targetFPS must be a positive number.');
        }

        if (typeof fixedTimeStep !== 'number' || fixedTimeStep <= 0 || !Number.isFinite(fixedTimeStep)) {
            throw new RuntimeConfigurationError('Runtime configuration error: fixedTimeStep must be positive.');
        }

        if (typeof maxDeltaTime !== 'number' || maxDeltaTime <= 0 || !Number.isFinite(maxDeltaTime)) {
            throw new RuntimeConfigurationError('Runtime configuration error: maxDeltaTime must be positive.');
        }

        if (typeof autoStart !== 'boolean') {
            throw new RuntimeConfigurationError('Runtime configuration error: autoStart must be a boolean.');
        }

        if (typeof debugMode !== 'boolean') {
            throw new RuntimeConfigurationError('Runtime configuration error: debugMode must be a boolean.');
        }

        if (typeof statisticsEnabled !== 'boolean') {
            throw new RuntimeConfigurationError('Runtime configuration error: statisticsEnabled must be a boolean.');
        }

        if (typeof diagnosticsEnabled !== 'boolean') {
            throw new RuntimeConfigurationError('Runtime configuration error: diagnosticsEnabled must be a boolean.');
        }

        if (!schedulerConfiguration || typeof schedulerConfiguration !== 'object' || Array.isArray(schedulerConfiguration)) {
            throw new RuntimeConfigurationError('Runtime configuration error: schedulerConfiguration must be a plain object.');
        }

        if (!pipelineConfiguration || typeof pipelineConfiguration !== 'object' || Array.isArray(pipelineConfiguration)) {
            throw new RuntimeConfigurationError('Runtime configuration error: pipelineConfiguration must be a plain object.');
        }

        if (!sessionConfiguration || typeof sessionConfiguration !== 'object' || Array.isArray(sessionConfiguration)) {
            throw new RuntimeConfigurationError('Runtime configuration error: sessionConfiguration must be a plain object.');
        }

        if (!custom || typeof custom !== 'object' || Array.isArray(custom)) {
            throw new RuntimeConfigurationError('Runtime configuration error: custom configuration must be a plain object.');
        }

        this.#runtimeName = runtimeName;
        this.#version = version;
        this.#targetFPS = targetFPS;
        this.#fixedTimeStep = fixedTimeStep;
        this.#maxDeltaTime = maxDeltaTime;
        this.#autoStart = autoStart;
        this.#debugMode = debugMode;
        this.#statisticsEnabled = statisticsEnabled;
        this.#diagnosticsEnabled = diagnosticsEnabled;
        
        this.#schedulerConfiguration = RuntimeConfiguration.#deepFreeze(RuntimeConfiguration.#deepClone(schedulerConfiguration));
        this.#pipelineConfiguration = RuntimeConfiguration.#deepFreeze(RuntimeConfiguration.#deepClone(pipelineConfiguration));
        this.#sessionConfiguration = RuntimeConfiguration.#deepFreeze(RuntimeConfiguration.#deepClone(sessionConfiguration));
        this.#custom = RuntimeConfiguration.#deepFreeze(RuntimeConfiguration.#deepClone(custom));
    }

    /**
     * Gets the runtime name.
     * @returns {string}
     */
    getRuntimeName() {
        return this.#runtimeName;
    }

    /**
     * Gets the configuration version.
     * @returns {string}
     */
    getVersion() {
        return this.#version;
    }

    /**
     * Gets the target frames per second.
     * @returns {number}
     */
    getTargetFPS() {
        return this.#targetFPS;
    }

    /**
     * Gets the fixed timestep duration in seconds.
     * Fixed timestep is managed independently from targetFPS to support decoupled physics or custom tick rates.
     * @returns {number}
     */
    getFixedTimeStep() {
        return this.#fixedTimeStep;
    }

    /**
     * Gets the maximum allowed delta time per frame.
     * @returns {number}
     */
    getMaxDeltaTime() {
        return this.#maxDeltaTime;
    }

    /**
     * Checks if auto-start is enabled.
     * @returns {boolean}
     */
    isAutoStartEnabled() {
        return this.#autoStart;
    }

    /**
     * Checks if debug mode is enabled.
     * @returns {boolean}
     */
    isDebugEnabled() {
        return this.#debugMode;
    }

    /**
     * Checks if statistics collection is enabled.
     * @returns {boolean}
     */
    isStatisticsEnabled() {
        return this.#statisticsEnabled;
    }

    /**
     * Checks if diagnostics are enabled.
     * @returns {boolean}
     */
    isDiagnosticsEnabled() {
        return this.#diagnosticsEnabled;
    }

    /**
     * Gets the scheduler configuration object.
     * @returns {Object}
     */
    getSchedulerConfiguration() {
        return this.#schedulerConfiguration;
    }

    /**
     * Gets the pipeline configuration object.
     * @returns {Object}
     */
    getPipelineConfiguration() {
        return this.#pipelineConfiguration;
    }

    /**
     * Gets the session configuration object.
     * @returns {Object}
     */
    getSessionConfiguration() {
        return this.#sessionConfiguration;
    }

    /**
     * Gets custom configuration extension values.
     * @returns {Object}
     */
    getCustomConfiguration() {
        return this.#custom;
    }

    /**
     * Gets custom configuration extension values (alias for getCustomConfiguration).
     * @returns {Object}
     */
    getCustom() {
        return this.#custom;
    }

    /**
     * Checks if custom configuration contains any properties.
     * @returns {boolean}
     */
    hasCustomConfiguration() {
        return Object.keys(this.#custom).length > 0;
    }

    /**
     * Checks equality between this configuration and another configuration.
     * 
     * @param {RuntimeConfiguration} other - The configuration to compare against.
     * @returns {boolean} True if all configuration properties match.
     */
    equals(other) {
        if (!(other instanceof RuntimeConfiguration)) {
            return false;
        }

        return (
            this.#runtimeName === other.getRuntimeName() &&
            this.#version === other.getVersion() &&
            this.#targetFPS === other.getTargetFPS() &&
            this.#fixedTimeStep === other.getFixedTimeStep() &&
            this.#maxDeltaTime === other.getMaxDeltaTime() &&
            this.#autoStart === other.isAutoStartEnabled() &&
            this.#debugMode === other.isDebugEnabled() &&
            this.#statisticsEnabled === other.isStatisticsEnabled() &&
            this.#diagnosticsEnabled === other.isDiagnosticsEnabled() &&
            RuntimeConfiguration.#deepEquals(this.#schedulerConfiguration, other.getSchedulerConfiguration()) &&
            RuntimeConfiguration.#deepEquals(this.#pipelineConfiguration, other.getPipelineConfiguration()) &&
            RuntimeConfiguration.#deepEquals(this.#sessionConfiguration, other.getSessionConfiguration()) &&
            RuntimeConfiguration.#deepEquals(this.#custom, other.getCustom())
        );
    }

    /**
     * Creates a shallow or deep clone of the current configuration with optional overrides.
     * 
     * @param {Object} [overrides={}] - Properties to override in the cloned configuration.
     * @returns {RuntimeConfiguration} A new RuntimeConfiguration instance.
     */
    clone(overrides = {}) {
        return new RuntimeConfiguration({
            runtimeName: this.#runtimeName,
            version: this.#version,
            targetFPS: this.#targetFPS,
            fixedTimeStep: this.#fixedTimeStep,
            maxDeltaTime: this.#maxDeltaTime,
            autoStart: this.#autoStart,
            debugMode: this.#debugMode,
            statisticsEnabled: this.#statisticsEnabled,
            diagnosticsEnabled: this.#diagnosticsEnabled,
            schedulerConfiguration: this.#schedulerConfiguration,
            pipelineConfiguration: this.#pipelineConfiguration,
            sessionConfiguration: this.#sessionConfiguration,
            custom: this.#custom,
            ...overrides
        });
    }

    /**
     * Merges two runtime configurations or a configuration with a partial options object.
     * 
     * @param {RuntimeConfiguration|Object} base - The base configuration.
     * @param {RuntimeConfiguration|Object} extension - The extension configuration or overrides.
     * @returns {RuntimeConfiguration} A new merged and validated RuntimeConfiguration instance.
     */
    static merge(base, extension) {
        const baseOptions = base instanceof RuntimeConfiguration ? base.toJSON() : (base || {});
        const extOptions = extension instanceof RuntimeConfiguration ? extension.toJSON() : (extension || {});

        return new RuntimeConfiguration({
            runtimeName: extOptions.runtimeName !== undefined ? extOptions.runtimeName : baseOptions.runtimeName,
            version: extOptions.version !== undefined ? extOptions.version : baseOptions.version,
            targetFPS: extOptions.targetFPS !== undefined ? extOptions.targetFPS : baseOptions.targetFPS,
            fixedTimeStep: extOptions.fixedTimeStep !== undefined ? extOptions.fixedTimeStep : baseOptions.fixedTimeStep,
            maxDeltaTime: extOptions.maxDeltaTime !== undefined ? extOptions.maxDeltaTime : baseOptions.maxDeltaTime,
            autoStart: extOptions.autoStart !== undefined ? extOptions.autoStart : baseOptions.autoStart,
            debugMode: extOptions.debugMode !== undefined ? extOptions.debugMode : baseOptions.debugMode,
            statisticsEnabled: extOptions.statisticsEnabled !== undefined ? extOptions.statisticsEnabled : baseOptions.statisticsEnabled,
            diagnosticsEnabled: extOptions.diagnosticsEnabled !== undefined ? extOptions.diagnosticsEnabled : baseOptions.diagnosticsEnabled,
            schedulerConfiguration: { ...(baseOptions.schedulerConfiguration || {}), ...(extOptions.schedulerConfiguration || {}) },
            pipelineConfiguration: { ...(baseOptions.pipelineConfiguration || {}), ...(extOptions.pipelineConfiguration || {}) },
            sessionConfiguration: { ...(baseOptions.sessionConfiguration || {}), ...(extOptions.sessionConfiguration || {}) },
            custom: { ...(baseOptions.custom || {}), ...(extOptions.custom || {}) }
        });
    }

    /**
     * Serializes the configuration into a plain JavaScript object.
     * 
     * @returns {Object} Plain object representation of the configuration.
     */
    toJSON() {
        return {
            runtimeName: this.#runtimeName,
            version: this.#version,
            targetFPS: this.#targetFPS,
            fixedTimeStep: this.#fixedTimeStep,
            maxDeltaTime: this.#maxDeltaTime,
            autoStart: this.#autoStart,
            debugMode: this.#debugMode,
            statisticsEnabled: this.#statisticsEnabled,
            diagnosticsEnabled: this.#diagnosticsEnabled,
            schedulerConfiguration: RuntimeConfiguration.#deepClone(this.#schedulerConfiguration),
            pipelineConfiguration: RuntimeConfiguration.#deepClone(this.#pipelineConfiguration),
            sessionConfiguration: RuntimeConfiguration.#deepClone(this.#sessionConfiguration),
            custom: RuntimeConfiguration.#deepClone(this.#custom)
        };
    }
}