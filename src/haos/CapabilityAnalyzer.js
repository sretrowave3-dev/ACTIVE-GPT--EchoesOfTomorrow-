// src/haos/CapabilityAnalyzer.js
import { PerformanceProfile } from './PerformanceProfile.js';

/**
 * CapabilityAnalyzer interprets raw hardware facts into a multi-dimensional capability rating
 * and determines the recommended baseline performance profile.
 * Conforms to EDD Chapter 13 §6 (Capability Analysis).
 */
export class CapabilityAnalyzer {
  /**
   * Evaluates hardware information and returns a tailored performance profile.
   * @param {Object} hardwareInfo - Raw telemetry from HardwareScanner
   * @returns {{ recommendedTier: string, profile: PerformanceProfile, bottleneck: string, scores: Object }}
   */
  analyze(hardwareInfo) {
    if (!hardwareInfo) {
      return {
        recommendedTier: 'MEDIUM',
        profile: PerformanceProfile.forTier('MEDIUM'),
        bottleneck: 'none',
        scores: { cpu: 2, gpu: 2, memory: 2 }
      };
    }

    // 1. CPU Score (0 = Low, 1 = Med, 2 = High, 3 = Ultra)
    const cores = hardwareInfo.cpu?.logicalCores || 4;
    let cpuScore = 1;
    if (cores >= 12) cpuScore = 3;
    else if (cores >= 6) cpuScore = 2;
    else if (cores >= 4) cpuScore = 1;
    else cpuScore = 0;

    // 2. Memory Score
    const ramGB = hardwareInfo.memory?.systemRamGB || 8;
    let memScore = 1;
    if (ramGB >= 16) memScore = 3;
    else if (ramGB >= 8) memScore = 2;
    else if (ramGB >= 4) memScore = 1;
    else memScore = 0;

    // 3. GPU Score
    const maxTex = hardwareInfo.gpu?.maxTextureSize || 4096;
    const isWgl2 = Boolean(hardwareInfo.gpu?.webgl2Supported);
    const rendererStr = (hardwareInfo.gpu?.renderer || '').toLowerCase();

    let gpuScore = 1;
    // Inspect for high-end discrete GPU markers (NVIDIA RTX, Radeon RX, Apple M Max/Pro)
    const isDiscrete = /rtx|gtx|radeon rx|geforce|apple m[1-3] (pro|max)|radeon pro/i.test(rendererStr);
    const isIntegrated = /intel|uhd|iris|hd graphics|apple m[1-3]$/i.test(rendererStr);

    if (maxTex >= 16384 || (isDiscrete && maxTex >= 8192)) {
      gpuScore = 3;
    } else if (isWgl2 && maxTex >= 8192) {
      gpuScore = 2;
    } else if (isIntegrated || maxTex <= 4096 || !isWgl2) {
      gpuScore = Math.min(1, maxTex < 4096 ? 0 : 1);
    }

    // Identify primary constraint/bottleneck
    let bottleneck = 'none';
    const minScore = Math.min(cpuScore, gpuScore, memScore);
    if (minScore === memScore && memScore < 2) bottleneck = 'memory';
    else if (minScore === gpuScore && gpuScore < 2) bottleneck = 'gpu';
    else if (minScore === cpuScore && cpuScore < 2) bottleneck = 'cpu';

    // Map conservative minimum score to tier
    let tier = 'MEDIUM';
    switch (minScore) {
      case 0:
        tier = 'LOW';
        break;
      case 1:
        tier = 'MEDIUM';
        break;
      case 2:
        tier = 'HIGH';
        break;
      case 3:
        tier = 'ULTRA';
        break;
    }

    const profile = PerformanceProfile.forTier(tier);

    // Fine-tune profile based on specific dimensional strengths/weaknesses
    if (bottleneck === 'memory') {
      profile.streaming.activeCellRadius = 1;
      profile.streaming.maxConcurrentLoads = 1;
    } else if (bottleneck === 'gpu') {
      profile.rendering.resolutionScale = Math.min(profile.rendering.resolutionScale, 0.85);
      profile.rendering.shadowQuality = 'low';
    }

    return {
      recommendedTier: tier,
      profile,
      bottleneck,
      scores: {
        cpu: cpuScore,
        gpu: gpuScore,
        memory: memScore
      }
    };
  }
}
