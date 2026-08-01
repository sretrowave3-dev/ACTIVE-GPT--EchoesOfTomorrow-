/**
 * src/framework/runtime/RuntimeKernel.js
 *
 * Echo Engine — Runtime Kernel
 *
 * Execution core of the runtime system.
 * Focuses on frame execution and pipeline coordination.
 *
 * Responsibilities:
 * - Execute frames via scheduler + pipeline
 * - Coordinate subsystem execution
 * - Maintain runtime state
 *
 * Design Principles:
 * - Pure Execution: Focus on frame execution
 * - Composition: All dependencies injected (including logger)
 * - Proper Order: Clock initializes first, shutdown is reverse
 * - Minimal API: Only execution-related methods exposed
 * - Logger Injection: Logger is passed in, not imported directly
 * - Event-Driven Diagnostics: Kernel emits events; logger subscribes (future direction)
 */

import { RuntimeKernelError } from './errors/RuntimeKernelError.js';
import { MissingDependencyError } from './errors/MissingDependencyError.js';

export class RuntimeKernel {
    // ─── Private Fields ────────────────────────────────────────────

    /** @type {RuntimeScheduler} */
    #scheduler;
    /** @type {RuntimePipeline} */
    #pipeline;
    /** @type {RuntimeClock} */
    #clock;
    /** @type {RuntimeStateMachine} */
    #stateMachine;
    /** @type {RuntimeStatistics} */
    #statistics;
    /** @type {RuntimeEventDispatcher} */
    #dispatcher;
    /** @type {RuntimeContext} */
    #context;
    /** @type {Object} */
    #logger;
    /** @type {boolean} */
    #initialized;

    // ─── Constructor ────────────────────────────────────────────────

    /**
     * @param {Object} dependencies - Fully assembled, wired dependency graph
     * @param {RuntimeScheduler} dependencies.scheduler
     * @param {RuntimePipeline} dependencies.pipeline
     * @param {RuntimeClock} dependencies.clock
     * @param {RuntimeStateMachine} dependencies.stateMachine
     * @param {RuntimeStatistics} dependencies.statistics
     * @param {RuntimeEventDispatcher} dependencies.dispatcher
     * @param {RuntimeContext} dependencies.context
     * @param {Object} dependencies.logger - Logger instance with info/warn/error/debug methods
     * @throws {MissingDependencyError} If any required dependency is missing or invalid
     */
    constructor(dependencies) {
        this.#validateDependencies(dependencies);

        this.#scheduler = dependencies.scheduler;
        this.#pipeline = dependencies.pipeline;
        this.#clock = dependencies.clock;
        this.#stateMachine = dependencies.stateMachine;
        this.#statistics = dependencies.statistics;
        this.#dispatcher = dependencies.dispatcher;
        this.#context = dependencies.context;
        this.#logger = dependencies.logger;

        this.#initialized = false;
    }

    // ─── Lifecycle ───────────────────────────────────────────────────

    /**
     * Initialize the kernel.
     * Clock must initialize first; everything depends on time.
     * @param {Object} [environment] - Runtime environment
     * @returns {Promise<void>}
     * @throws {RuntimeKernelError} If initialization fails
     */
    async initialize(environment = {}) {
        if (this.#initialized) {
            throw new RuntimeKernelError('RuntimeKernel already initialized');
        }

        try {
            this.#logger.info('Initializing RuntimeKernel...');

            // Clock first (everything depends on time)
            this.#clock.initialize();

            // Dispatcher second (events needed for others)
            this.#dispatcher.initialize();

            // Context and state machine
            this.#context.initialize(environment);
            this.#stateMachine.initialize();

            // Pipeline (depends on context)
            this.#pipeline.initialize();

            // Scheduler (depends on clock, pipeline)
            this.#scheduler.initialize();

            // Statistics (depends on clock, context)
            this.#statistics.initialize();

            this.#initialized = true;
            this.#logger.info('RuntimeKernel initialized successfully');
        } catch (error) {
            this.#logger.error('RuntimeKernel initialization failed', error);
            throw new RuntimeKernelError('Failed to initialize RuntimeKernel', { cause: error });
        }
    }

    /**
     * Shutdown the kernel.
     * Exact reverse of initialization order.
     * @returns {Promise<void>}
     * @throws {RuntimeKernelError} If shutdown fails
     */
    async shutdown() {
        if (!this.#initialized) {
            throw new RuntimeKernelError('RuntimeKernel not initialized');
        }

        this.#logger.info('Shutting down RuntimeKernel...');

        try {
            // Reverse order: statistics first
            this.#statistics.shutdown();

            // Scheduler
            this.#scheduler.shutdown();

            // Pipeline
            this.#pipeline.shutdown();

            // State machine
            this.#stateMachine.shutdown();

            // Context
            this.#context.shutdown();

            // Dispatcher
            this.#dispatcher.shutdown();

            // Clock last
            this.#clock.shutdown();

            this.#initialized = false;
            this.#logger.info('RuntimeKernel shutdown complete');
        } catch (error) {
            this.#logger.error('RuntimeKernel shutdown failed', error);
            throw new RuntimeKernelError('Failed to shutdown RuntimeKernel', { cause: error });
        }
    }

    // ─── Frame Execution ────────────────────────────────────────────

    /**
     * Execute a single frame.
     * @param {number} deltaTime - Time since last frame in seconds
     * @param {Object} [session] - Optional session context
     * @returns {Object} Execution result
     */
    tick(deltaTime, session = null) {
        if (!this.#initialized) {
            throw new RuntimeKernelError('RuntimeKernel not initialized');
        }

        // Update clock first
        this.#clock.tick(deltaTime);

        // Run the scheduler (executes scheduled tasks)
        this.#scheduler.run(deltaTime, session);

        // Execute pipeline (may produce events)
        const result = this.#pipeline.execute(deltaTime, session);

        // Flush any events produced by the pipeline
        this.#dispatcher.flush();

        // Record statistics
        this.#statistics.recordFrame(deltaTime);

        return result;
    }

    // ─── Accessors ──────────────────────────────────────────────────

    /**
     * Get the current runtime state.
     * @returns {RuntimeState} Current state
     */
    getState() {
        return this.#stateMachine.getCurrentState();
    }

    /**
     * Check if the kernel is initialized.
     * @returns {boolean} True if initialized
     */
    isInitialized() {
        return this.#initialized;
    }

    // ─── Internal ────────────────────────────────────────────────────

    /**
     * Validate dependencies for presence and capability.
     * @param {Object} deps - Dependencies object
     * @throws {MissingDependencyError} If any required dependency is missing or invalid
     * @private
     */
    #validateDependencies(deps) {
        // Define the minimum required capabilities for each dependency
        const required = [
            { key: 'scheduler', methods: ['initialize', 'shutdown', 'run'] },
            { key: 'pipeline', methods: ['initialize', 'shutdown', 'execute'] },
            { key: 'clock', methods: ['initialize', 'shutdown', 'tick', 'now'] },
            { key: 'stateMachine', methods: ['initialize', 'shutdown', 'getCurrentState'] },
            { key: 'statistics', methods: ['initialize', 'shutdown', 'recordFrame'] },
            { key: 'dispatcher', methods: ['initialize', 'shutdown', 'flush'] },
            { key: 'context', methods: ['initialize', 'shutdown'] },
            { key: 'logger', methods: ['info', 'warn', 'error', 'debug'] }
        ];

        for (const req of required) {
            const dep = deps[req.key];
            if (!dep) {
                throw new MissingDependencyError(`RuntimeKernel requires '${req.key}'`);
            }

            for (const method of req.methods) {
                if (typeof dep[method] !== 'function') {
                    throw new MissingDependencyError(
                        `RuntimeKernel: '${req.key}' does not have '${method}' method.`
                    );
                }
            }
        }
    }
}