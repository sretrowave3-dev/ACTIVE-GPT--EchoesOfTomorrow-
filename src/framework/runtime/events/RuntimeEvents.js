/**
 * src/framework/runtime/events/RuntimeEvents.js
 *
 * Echo Engine — Runtime Event Type Constants
 *
 * Centralized event type constants for the runtime system.
 * Using these constants prevents typos and enables IDE autocomplete.
 */

export const RuntimeEvents = Object.freeze({
    // System lifecycle events
    SYSTEM_INITIALIZING: 'system:initializing',
    SYSTEM_INITIALIZED: 'system:initialized',
    SYSTEM_STARTING: 'system:starting',
    SYSTEM_STARTED: 'system:started',
    SYSTEM_STOPPING: 'system:stopping',
    SYSTEM_STOPPED: 'system:stopped',
    SYSTEM_PAUSED: 'system:paused',
    SYSTEM_RESUMED: 'system:resumed',
    SYSTEM_RESTARTED: 'system:restarted',
    SYSTEM_ERROR: 'system:error',

    // Session lifecycle events
    SESSION_CREATED: 'session:created',
    SESSION_DESTROYED: 'session:destroyed',
    SESSION_ACTIVATED: 'session:activated',
    SESSION_DEACTIVATED: 'session:deactivated',
    SESSION_STARTED: 'session:started',
    SESSION_STOPPED: 'session:stopped',
    SESSION_PAUSED: 'session:paused',
    SESSION_RESUMED: 'session:resumed',
    SESSION_ERROR: 'session:error',

    // Frame events
    FRAME_BEGIN: 'frame:begin',
    FRAME_END: 'frame:end',
    FRAME_ERROR: 'frame:error',
    FRAME_SKIPPED: 'frame:skipped',

    // Scene events
    SCENE_LOADING: 'scene:loading',
    SCENE_LOADED: 'scene:loaded',
    SCENE_UNLOADING: 'scene:unloading',
    SCENE_UNLOADED: 'scene:unloaded',
    SCENE_TRANSITION_START: 'scene:transition_start',
    SCENE_TRANSITION_COMPLETE: 'scene:transition_complete',
    SCENE_TRANSITION_FAILED: 'scene:transition_failed',

    // Pipeline events
    PIPELINE_STAGE_START: 'pipeline:stage_start',
    PIPELINE_STAGE_COMPLETE: 'pipeline:stage_complete',
    PIPELINE_STAGE_FAILED: 'pipeline:stage_failed',
    PIPELINE_COMPLETE: 'pipeline:complete',

    // Diagnostics events
    DIAGNOSTIC_UPDATE: 'diagnostic:update',
    ERROR_OCCURRED: 'error:occurred',
    WARNING_OCCURRED: 'warning:occurred',
    INFO_OCCURRED: 'info:occurred',

    // State events
    STATE_CHANGED: 'state:changed',
    STATE_TRANSITION_START: 'state:transition_start',
    STATE_TRANSITION_COMPLETE: 'state:transition_complete',

    // Custom event namespace for extensions
    CUSTOM: 'custom:'
});