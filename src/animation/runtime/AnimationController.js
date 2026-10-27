// src/animation/runtime/AnimationController.js
import { AnimationPlayer } from './AnimationPlayer.js';

/**
 * State and cross-fade transition controller for entity animations.
 * Conforms to EDD Chapter 12 (Animation System).
 */
export class AnimationController {
  /**
   * @param {import('../skeleton/SkeletonPose.js').SkeletonPose} pose
   */
  constructor(pose) {
    this.pose = pose;
    /** @type {Map<string, import('../assets/AnimationClip.js').AnimationClip>} */
    this.clips = new Map();

    this.player = new AnimationPlayer(pose);
    this.currentClipName = '';

    // Cross-fade blending state
    this.isCrossFading = false;
    this.fadeDuration = 0.2;
    this.fadeElapsed = 0.0;
    this.fadeFromClip = null;
    this.fadeWeight = 1.0;
  }

  /**
   * Register a clip by name.
   * @param {string} name
   * @param {import('../assets/AnimationClip.js').AnimationClip} clip
   */
  addClip(name, clip) {
    this.clips.set(name, clip);
  }

  /**
   * Switch or cross-fade to a new clip.
   * @param {string} name
   * @param {number} [fadeDuration=0.2]
   */
  play(name, fadeDuration = 0.2) {
    const nextClip = this.clips.get(name);
    if (!nextClip) return;

    if (this.currentClipName === name && this.player.isPlaying) {
      return;
    }

    if (fadeDuration > 0 && this.player.currentClip) {
      this.isCrossFading = true;
      this.fadeDuration = fadeDuration;
      this.fadeElapsed = 0.0;
      this.fadeFromClip = this.player.currentClip;
    } else {
      this.isCrossFading = false;
    }

    this.currentClipName = name;
    this.player.play(nextClip, true);
  }

  /**
   * Update animation playback and cross-fade transitions.
   * @param {number} delta
   */
  update(delta) {
    if (this.isCrossFading) {
      this.fadeElapsed += delta;
      this.fadeWeight = Math.min(1.0, this.fadeElapsed / this.fadeDuration);
      if (this.fadeWeight >= 1.0) {
        this.isCrossFading = false;
        this.fadeFromClip = null;
      }
    }

    this.player.update(delta);
  }
}
