// src/haos/AdaptiveController.js
import { PerformanceProfile } from './PerformanceProfile.js';

/**
 * AdaptiveController coordinates dynamic fidelity adjustments across engine subsystems
 * based on real-time FrameMonitor metrics and anti-oscillation policies.
 * Conforms to EDD Chapter 13 §12 (Adaptive Controller) & §22 (Adaptive Decision Policy).
 */
export class AdaptiveController {
  /**
   * @param {import('../framework/core/Framework.js').Framework} framework
   * @param {PerformanceProfile} initialProfile
   */
  constructor(framework, initialProfile) {
    this.framework = framework;
    this.currentProfile = initialProfile || PerformanceProfile.forTier('MEDIUM');

    // Policy & Anti-oscillation parameters
    this.isAutoScalingEnabled = true;
    this.adaptationCooldownSeconds = 4.0; // Minimum time between quality shifts
    this._timeSinceLastAdaptation = 0;

    this.history = [];
    this._tierHierarchy = ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'];
  }

  /**
   * Ticks adaptation logic against monitored frame metrics.
   * @param {number} deltaSeconds
   * @param {import('./FrameMonitor.js').FrameMonitor} frameMonitor
   */
  update(deltaSeconds, frameMonitor) {
    if (!this.isAutoScalingEnabled || !frameMonitor) return;

    this._timeSinceLastAdaptation += deltaSeconds;
    if (this._timeSinceLastAdaptation < this.adaptationCooldownSeconds) {
      return; // Hold timer active to prevent rapid oscillation
    }

    const health = frameMonitor.getHealthState();
    const currentTier = this.currentProfile.tier;
    const tierIdx = this._tierHierarchy.indexOf(currentTier);

    if (health === 'OVERBURDENED' && tierIdx > 0) {
      // Degrade tier to relieve performance pressure
      const newTier = this._tierHierarchy[tierIdx - 1];
      this._applyTierShift(newTier, 'Performance degradation detected', frameMonitor);
    } else if (health === 'UNDERUTILIZED' && tierIdx < this._tierHierarchy.length - 1) {
      // Conservatively promote tier when significant headroom exists
      const newTier = this._tierHierarchy[tierIdx + 1];
      this._applyTierShift(newTier, 'Surplus hardware headroom confirmed', frameMonitor);
    }
  }

  /**
   * Executes a tier shift and notifies affected subsystems.
   * @param {'LOW'|'MEDIUM'|'HIGH'|'ULTRA'} newTier
   * @param {string} reason
   * @param {import('./FrameMonitor.js').FrameMonitor} [frameMonitor]
   * @private
   */
  _applyTierShift(newTier, reason, frameMonitor) {
    const oldTier = this.currentProfile.tier;
    this.currentProfile = PerformanceProfile.forTier(newTier);
    this._timeSinceLastAdaptation = 0;

    // Reset monitor trend counters after adaptation
    if (frameMonitor) {
      frameMonitor.setTargetFrameTime(this.currentProfile.targetFrameTimeMs);
      frameMonitor.reset();
    }

    const eventData = {
      fromTier: oldTier,
      toTier: newTier,
      reason,
      profile: this.currentProfile,
      timestamp: Date.now()
    };

    this.history.push(eventData);
    if (this.history.length > 20) this.history.shift();

    // 1. Dispatch framework EventBus notification
    if (this.framework.eventBus) {
      this.framework.eventBus.publish('haos:profile_changed', this, eventData);
    }

    // 2. Propagate policies directly to registered subsystems
    this._propagateToSubsystems(this.currentProfile);
  }

  /**
   * Applies the current profile settings to active engine services.
   * @param {PerformanceProfile} profile
   * @private
   */
  _propagateToSubsystems(profile) {
    const registry = this.framework.serviceRegistry;
    if (!registry) return;

    // A. RenderService
    const render = registry.get('render');
    if (render && render.renderer) {
      const baseRatio = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
      const targetRatio = Math.max(0.5, baseRatio * profile.rendering.resolutionScale);
      render.renderer.setPixelRatio(targetRatio);
    }

    // B. Streaming / WorldPartition
    const world = registry.get('world');
    if (world && world.worldManager && world.worldManager.worldPartition) {
      world.worldManager.worldPartition.activeRadius = profile.streaming.activeCellRadius;
    }

    // C. AudioService
    const audio = registry.get('audio');
    if (audio && audio.audioManager) {
      audio.audioManager.maxActiveVoices = profile.audio.voiceLimit;
    }

    // D. Notification banner via UIService
    const ui = registry.get('ui');
    if (ui && ui.showNotification) {
      ui.showNotification(`HAOS: PROFILE ADAPTED [${profile.tier}]`, 2500);
    }
  }

  /**
   * Manually locks a specific tier, overriding auto-scaling.
   * @param {'LOW'|'MEDIUM'|'HIGH'|'ULTRA'} tierName
   */
  forceTier(tierName) {
    this.isAutoScalingEnabled = false;
    this._applyTierShift(tierName, 'Manual user override');
  }

  /**
   * Enables or disables automatic scaling.
   * @param {boolean} enabled
   */
  setAutoScaling(enabled) {
    this.isAutoScalingEnabled = Boolean(enabled);
    this._timeSinceLastAdaptation = 0;
  }
}
