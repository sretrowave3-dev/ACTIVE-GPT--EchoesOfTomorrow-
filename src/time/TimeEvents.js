<<<<<<< HEAD
// src/time/TimeEvents.js

/**
 * Centralized event name constants for the Time System.
 * All public events that the Time System publishes or subscribes to
 * are defined here to avoid magic strings.
 *
 * This module is stateless and has no runtime logic.
 */
export const TimeEvents = Object.freeze({
  /** A scheduled event has been successfully dispatched. */
  SCHEDULED_FIRE: 'scheduled:fire',

  /** A scheduled event has been cancelled. */
  SCHEDULED_CANCELLED: 'scheduled:cancelled',

  /** A scheduled event failed validation and was discarded. */
  SCHEDULED_VALIDATION_FAILED: 'scheduled:validation_failed',

  /** The world clock has been paused. */
  TIME_PAUSED: 'time:paused',

  /** The world clock has been resumed. */
  TIME_RESUMED: 'time:resumed',

  /** The world clock's time scale has changed. */
  TIME_SCALE_CHANGED: 'time:scale_changed',

  /** A time jump (sleep/fast‑forward) has started. */
  TIME_JUMP_STARTED: 'time:jump_started',

  /** A time jump has completed. */
  TIME_JUMP_COMPLETED: 'time:jump_completed',

  /** The current world time has been updated (fired every frame). */
  WORLD_TIME_UPDATED: 'time:world_time_updated'
=======
// src/time/TimeEvents.js

/**
 * Centralized event name constants for the Time System.
 * All public events that the Time System publishes or subscribes to
 * are defined here to avoid magic strings.
 *
 * This module is stateless and has no runtime logic.
 */
export const TimeEvents = Object.freeze({
  /** A scheduled event has been successfully dispatched. */
  SCHEDULED_FIRE: 'scheduled:fire',

  /** A scheduled event has been cancelled. */
  SCHEDULED_CANCELLED: 'scheduled:cancelled',

  /** A scheduled event failed validation and was discarded. */
  SCHEDULED_VALIDATION_FAILED: 'scheduled:validation_failed',

  /** The world clock has been paused. */
  TIME_PAUSED: 'time:paused',

  /** The world clock has been resumed. */
  TIME_RESUMED: 'time:resumed',

  /** The world clock's time scale has changed. */
  TIME_SCALE_CHANGED: 'time:scale_changed',

  /** A time jump (sleep/fast‑forward) has started. */
  TIME_JUMP_STARTED: 'time:jump_started',

  /** A time jump has completed. */
  TIME_JUMP_COMPLETED: 'time:jump_completed',

  /** The current world time has been updated (fired every frame). */
  WORLD_TIME_UPDATED: 'time:world_time_updated'
>>>>>>> 2f42efe7e19574d94df56c89784f42d3d4e2c85a
});