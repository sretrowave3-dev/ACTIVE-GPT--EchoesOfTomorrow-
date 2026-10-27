// src/haos/PerformanceProfile.js

/**
 * PerformanceProfile encapsulates the runtime resource and fidelity budgets
 * across all major subsystems for a given hardware tier.
 * Conforms to EDD Chapter 13 §7 (Performance Profiles).
 */
export class PerformanceProfile {
  /**
   * @param {string} tier - 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA'
   * @param {Object} [overrides]
   */
  constructor(tier = 'MEDIUM', overrides = {}) {
    this.tier = tier;
    this.targetFPS = 60;
    this.targetFrameTimeMs = 16.66;

    // Subsystem fidelity policies
    this.rendering = {
      resolutionScale: 1.0,
      shadowQuality: 'medium',
      shadowMapSize: 1024,
      maxAnisotropy: 4,
      particleBudget: 500
    };

    this.streaming = {
      activeCellRadius: 1, // 1 = 3x3 grid (9 cells)
      maxConcurrentLoads: 3,
      evictionDelayMs: 5000
    };

    this.ai = {
      distantUpdateInterval: 2, // Tick distant AI every 2nd frame
      maxPerceptionRange: 25,
      maxActiveAgents: 20
    };

    this.animation = {
      vatLODDistance: 30, // Switch skeletal to GPU VAT beyond 30m
      maxSkinnedBones: 32,
      crossFadeDuration: 0.2
    };

    this.audio = {
      voiceLimit: 16,
      spatialReverbQuality: 'standard'
    };

    // Apply any explicit overrides
    if (overrides) {
      if (overrides.rendering) Object.assign(this.rendering, overrides.rendering);
      if (overrides.streaming) Object.assign(this.streaming, overrides.streaming);
      if (overrides.ai) Object.assign(this.ai, overrides.ai);
      if (overrides.animation) Object.assign(this.animation, overrides.animation);
      if (overrides.audio) Object.assign(this.audio, overrides.audio);
    }
  }

  /**
   * Factory method to generate standardized preset profiles.
   * @param {'LOW'|'MEDIUM'|'HIGH'|'ULTRA'} tierName
   * @returns {PerformanceProfile}
   */
  static forTier(tierName) {
    const tier = (tierName || 'MEDIUM').toUpperCase();
    const profile = new PerformanceProfile(tier);

    switch (tier) {
      case 'LOW':
        profile.targetFPS = 30;
        profile.targetFrameTimeMs = 33.33;
        profile.rendering.resolutionScale = 0.75;
        profile.rendering.shadowQuality = 'low';
        profile.rendering.shadowMapSize = 512;
        profile.rendering.maxAnisotropy = 1;
        profile.rendering.particleBudget = 150;

        profile.streaming.activeCellRadius = 1;
        profile.streaming.maxConcurrentLoads = 1;

        profile.ai.distantUpdateInterval = 4;
        profile.ai.maxPerceptionRange = 15;
        profile.ai.maxActiveAgents = 10;

        profile.animation.vatLODDistance = 15;
        profile.audio.voiceLimit = 8;
        break;

      case 'MEDIUM':
        profile.targetFPS = 60;
        profile.targetFrameTimeMs = 16.66;
        profile.rendering.resolutionScale = 1.0;
        profile.rendering.shadowQuality = 'medium';
        profile.rendering.shadowMapSize = 1024;
        profile.rendering.maxAnisotropy = 4;
        profile.rendering.particleBudget = 500;

        profile.streaming.activeCellRadius = 1;
        profile.streaming.maxConcurrentLoads = 3;

        profile.ai.distantUpdateInterval = 2;
        profile.ai.maxPerceptionRange = 25;
        profile.ai.maxActiveAgents = 20;

        profile.animation.vatLODDistance = 30;
        profile.audio.voiceLimit = 16;
        break;

      case 'HIGH':
        profile.targetFPS = 60;
        profile.targetFrameTimeMs = 16.66;
        profile.rendering.resolutionScale = 1.0;
        profile.rendering.shadowQuality = 'high';
        profile.rendering.shadowMapSize = 2048;
        profile.rendering.maxAnisotropy = 8;
        profile.rendering.particleBudget = 1200;

        profile.streaming.activeCellRadius = 2; // 5x5 grid (25 cells)
        profile.streaming.maxConcurrentLoads = 6;

        profile.ai.distantUpdateInterval = 1;
        profile.ai.maxPerceptionRange = 40;
        profile.ai.maxActiveAgents = 40;

        profile.animation.vatLODDistance = 50;
        profile.audio.voiceLimit = 32;
        break;

      case 'ULTRA':
        profile.targetFPS = 120;
        profile.targetFrameTimeMs = 8.33;
        profile.rendering.resolutionScale = 1.25;
        profile.rendering.shadowQuality = 'high';
        profile.rendering.shadowMapSize = 4096;
        profile.rendering.maxAnisotropy = 16;
        profile.rendering.particleBudget = 2500;

        profile.streaming.activeCellRadius = 2;
        profile.streaming.maxConcurrentLoads = 8;

        profile.ai.distantUpdateInterval = 1;
        profile.ai.maxPerceptionRange = 60;
        profile.ai.maxActiveAgents = 80;

        profile.animation.vatLODDistance = 75;
        profile.audio.voiceLimit = 48;
        break;
    }

    return profile;
  }

  /**
   * Clone this profile into an independent instance.
   * @returns {PerformanceProfile}
   */
  clone() {
    const copy = new PerformanceProfile(this.tier);
    copy.targetFPS = this.targetFPS;
    copy.targetFrameTimeMs = this.targetFrameTimeMs;
    copy.rendering = { ...this.rendering };
    copy.streaming = { ...this.streaming };
    copy.ai = { ...this.ai };
    copy.animation = { ...this.animation };
    copy.audio = { ...this.audio };
    return copy;
  }
}
