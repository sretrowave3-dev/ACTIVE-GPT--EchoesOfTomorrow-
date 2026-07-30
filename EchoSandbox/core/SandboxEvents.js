/**
 * Echo Sandbox — Event Definitions
 *
 * Defines all events used by the Sandbox for communication
 * between adapters, monitors, and UI components.
 */

export const SandboxEvents = Object.freeze({
    // Bootstrap events
    BOOT_START: 'sandbox:boot:start',
    BOOT_PROGRESS: 'sandbox:boot:progress',
    BOOT_COMPLETE: 'sandbox:boot:complete',
    BOOT_FAILED: 'sandbox:boot:failed',

    // Engine state events
    ENGINE_READY: 'sandbox:engine:ready',
    ENGINE_UPDATED: 'sandbox:engine:updated',
    ENGINE_PAUSED: 'sandbox:engine:paused',
    ENGINE_RESUMED: 'sandbox:engine:resumed',

    // Module events
    MODULE_LOADED: 'sandbox:module:loaded',
    MODULE_FAILED: 'sandbox:module:failed',
    MODULE_SELECTED: 'sandbox:module:selected',

    // Runtime events
    RUNTIME_STATS: 'sandbox:runtime:stats',
    PERFORMANCE_UPDATE: 'sandbox:performance:update',
    MEMORY_UPDATE: 'sandbox:memory:update',

    // Console events
    CONSOLE_COMMAND: 'sandbox:console:command',
    CONSOLE_OUTPUT: 'sandbox:console:output',

    // Log events
    LOG_ADDED: 'sandbox:log:added',
    WARNING_ADDED: 'sandbox:warning:added',
    ERROR_ADDED: 'sandbox:error:added',

    // Inspector events
    INSPECTOR_UPDATE: 'sandbox:inspector:update'
});

