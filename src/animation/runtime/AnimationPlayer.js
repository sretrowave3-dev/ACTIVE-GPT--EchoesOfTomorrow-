// src/animation/runtime/AnimationPlayer.js

/**
 * AnimationPlayer evaluates and applies an AnimationClip to a SkeletonPose over time.
 * Conforms to EDD Chapter 12 (Animation System).
 */
export class AnimationPlayer {
  /**
   * @param {import('../skeleton/SkeletonPose.js').SkeletonPose} [pose]
   */
  constructor(pose = null) {
    this.pose = pose;
    /** @type {import('../assets/AnimationClip.js').AnimationClip|null} */
    this.currentClip = null;
    this.time = 0.0;
    this.speed = 1.0;
    this.loop = true;
    this.isPlaying = false;
  }

  /**
   * Set target clip for playback.
   * @param {import('../assets/AnimationClip.js').AnimationClip} clip
   * @param {boolean} [loop=true]
   * @param {number} [speed=1.0]
   */
  play(clip, loop = true, speed = 1.0) {
    this.currentClip = clip;
    this.loop = loop;
    this.speed = speed;
    this.time = 0.0;
    this.isPlaying = true;
  }

  pause() {
    this.isPlaying = false;
  }

  resume() {
    if (this.currentClip) {
      this.isPlaying = true;
    }
  }

  stop() {
    this.isPlaying = false;
    this.time = 0.0;
  }

  /**
   * Advance time and sample clip keyframes into pose.
   * @param {number} delta Seconds elapsed
   */
  update(delta) {
    if (!this.isPlaying || !this.currentClip || !this.pose) return;

    this.time += delta * this.speed;

    if (this.loop) {
      if (this.currentClip.duration > 0) {
        this.time = this.time % this.currentClip.duration;
        if (this.time < 0) this.time += this.currentClip.duration;
      }
    } else {
      if (this.time >= this.currentClip.duration) {
        this.time = this.currentClip.duration;
        this.isPlaying = false;
      } else if (this.time < 0) {
        this.time = 0;
        this.isPlaying = false;
      }
    }

    // Sample keyframed tracks into the pose bones
    for (const [id, transform] of this.pose.bones.entries()) {
      this.currentClip.sampleTranslation(id, this.time, transform.position);
      this.currentClip.sampleRotation(id, this.time, transform.rotation);
    }

    // Refresh world hierarchy matrices
    this.pose.updateWorldMatrices();
  }
}
