/**
 * Base class for streaming jobs (load/unload).
 * Jobs are queued by the StreamingManager and executed against the World.
 */
export class StreamingJob {
  constructor() {
    this.done = false;
  }

  /**
   * Execute this job against the world.
   * Subclasses must override.
   * @param {import('../world/World.js').World} world
   */
  execute(world) {
    throw new Error('StreamingJob.execute() must be implemented by subclass');
  }
}
