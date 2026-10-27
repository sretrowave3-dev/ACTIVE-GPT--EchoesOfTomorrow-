// src/framework/services/HAOSService.js
import { Service } from './Service.js';
import { HardwareScanner } from '../../haos/HardwareScanner.js';
import { CapabilityAnalyzer } from '../../haos/CapabilityAnalyzer.js';
import { FrameMonitor } from '../../haos/FrameMonitor.js';
import { AdaptiveController } from '../../haos/AdaptiveController.js';

/**
 * HAOSService (Hardware-Adaptive Optimization System) is the engine's cognitive controller
 * that detects host capabilities, monitors real-time frame pacing, and adapts subsystem
 * workloads dynamically to deliver stable frame rates.
 * Conforms to EDD Chapter 13 (Hardware-Adaptive Optimization System).
 */
export class HAOSService extends Service {
  /**
   * @param {import('../core/Framework.js').Framework} framework
   */
  constructor(framework) {
    super('haos', framework);
    this.scanner = new HardwareScanner();
    this.analyzer = new CapabilityAnalyzer();
    this.frameMonitor = new FrameMonitor(60);
    /** @type {AdaptiveController|null} */
    this.controller = null;
    this.analysisResult = null;
  }

  /** @override */
  async initialize() {
    // 1. Scan hardware characteristics
    const hardwareInfo = this.scanner.scan();

    // 2. Perform multi-dimensional capability analysis
    this.analysisResult = this.analyzer.analyze(hardwareInfo);

    // 3. Instantiate Adaptive Controller with baseline profile
    this.controller = new AdaptiveController(this.framework, this.analysisResult.profile);

    // 4. Configure initial target frame time on monitor
    this.frameMonitor.setTargetFrameTime(this.analysisResult.profile.targetFrameTimeMs);
  }

  /** @override */
  async start() {
    console.log(`[HAOSService] Initialized with baseline profile: [${this.controller.currentProfile.tier}] ` +
      `(Bottleneck: ${this.analysisResult.bottleneck}, Target: ${this.controller.currentProfile.targetFPS} FPS)`);

    // Propagate initial baseline profile to registered subsystems
    this.controller._propagateToSubsystems(this.controller.currentProfile);
  }

  /**
   * Per-frame update executed during the 'diagnostics' or 'world' phase of FrameScheduler.
   * @param {number} delta
   */
  update(delta) {
    if (this.frameMonitor && this.controller) {
      this.frameMonitor.recordFrame(delta);
      this.controller.update(delta, this.frameMonitor);
    }
  }

  /**
   * Retrieves comprehensive HAOS telemetry for diagnostics HUD and tooling.
   * @returns {Object}
   */
  getTelemetry() {
    return {
      hardware: this.scanner.getHardwareInfo(),
      analysis: this.analysisResult,
      activeProfile: this.controller ? this.controller.currentProfile : null,
      frameMetrics: this.frameMonitor ? this.frameMonitor.getMetrics() : null,
      isAutoScaling: this.controller ? this.controller.isAutoScalingEnabled : false,
      history: this.controller ? this.controller.history : []
    };
  }

  /**
   * Manually locks a specific quality tier.
   * @param {'LOW'|'MEDIUM'|'HIGH'|'ULTRA'} tier
   */
  forceTier(tier) {
    if (this.controller) {
      this.controller.forceTier(tier);
    }
  }

  /**
   * Enables or disables automatic hardware adaptation.
   * @param {boolean} enabled
   */
  setAutoScaling(enabled) {
    if (this.controller) {
      this.controller.setAutoScaling(enabled);
    }
  }

  /**
   * Get the current active performance profile.
   * @returns {import('../../haos/PerformanceProfile.js').PerformanceProfile|null}
   */
  getCurrentProfile() {
    return this.controller ? this.controller.currentProfile : null;
  }

  /** @override */
  async shutdown() {
    if (this.frameMonitor) {
      this.frameMonitor.reset();
    }
    this.controller = null;
  }
}
