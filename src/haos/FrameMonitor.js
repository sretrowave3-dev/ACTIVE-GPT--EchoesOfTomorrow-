// src/haos/FrameMonitor.js

/**
 * FrameMonitor tracks frame pacing, frame delivery consistency, and performance spikes
 * using a fixed ring buffer without runtime allocations.
 * Conforms to EDD Chapter 13 §9 (Frame Monitor).
 */
export class FrameMonitor {
  /**
   * @param {number} [bufferCapacity=60] Number of sample frames
   */
  constructor(bufferCapacity = 60) {
    this.capacity = bufferCapacity;
    this.samples = new Float32Array(this.capacity);
    this.sampleCount = 0;
    this.writeIndex = 0;

    this.targetFrameTimeMs = 16.66; // 60 FPS baseline

    // Trend counters
    this.consecutiveDrops = 0;
    this.consecutiveSurplus = 0;
    this.spikeCount = 0;

    // Cached metrics
    this.avgFrameTimeMs = 16.66;
    this.p95FrameTimeMs = 16.66;
    this.currentFPS = 60;
  }

  /**
   * Set target frame time in milliseconds (e.g., 16.66 for 60fps, 33.33 for 30fps).
   * @param {number} ms
   */
  setTargetFrameTime(ms) {
    this.targetFrameTimeMs = ms;
  }

  /**
   * Record a frame duration in seconds.
   * @param {number} deltaSeconds
   */
  recordFrame(deltaSeconds) {
    const frameTimeMs = Math.max(0.1, deltaSeconds * 1000);

    this.samples[this.writeIndex] = frameTimeMs;
    this.writeIndex = (this.writeIndex + 1) % this.capacity;
    if (this.sampleCount < this.capacity) {
      this.sampleCount++;
    }

    // Check for frame spike (> 1.5x target)
    if (frameTimeMs > this.targetFrameTimeMs * 1.5) {
      this.spikeCount++;
    }

    // Recalculate summary metrics periodically or after full buffer
    this._computeMetrics();

    // Update sustained trend counters
    if (this.avgFrameTimeMs > this.targetFrameTimeMs * 1.15) {
      this.consecutiveDrops++;
      this.consecutiveSurplus = 0;
    } else if (this.avgFrameTimeMs < this.targetFrameTimeMs * 0.75) {
      this.consecutiveSurplus++;
      this.consecutiveDrops = 0;
    } else {
      this.consecutiveDrops = Math.max(0, this.consecutiveDrops - 1);
      this.consecutiveSurplus = Math.max(0, this.consecutiveSurplus - 1);
    }
  }

  /**
   * Computes average and 95th percentile metrics.
   * @private
   */
  _computeMetrics() {
    if (this.sampleCount === 0) return;

    let sum = 0;
    for (let i = 0; i < this.sampleCount; i++) {
      sum += this.samples[i];
    }
    this.avgFrameTimeMs = sum / this.sampleCount;
    this.currentFPS = Math.round(1000 / Math.max(1, this.avgFrameTimeMs));

    // Simple 95th percentile heuristic
    let sorted = Array.from(this.samples.subarray(0, this.sampleCount)).sort((a, b) => a - b);
    const p95Idx = Math.floor(sorted.length * 0.95);
    this.p95FrameTimeMs = sorted[p95Idx] || this.avgFrameTimeMs;
  }

  /**
   * Evaluates overall system health.
   * @returns {'OVERBURDENED' | 'HEALTHY' | 'UNDERUTILIZED'}
   */
  getHealthState() {
    if (this.sampleCount < 10) return 'HEALTHY';

    // Overburdened if consecutive drops > 30 samples or p95 is 1.4x target
    if (this.consecutiveDrops >= 25 || this.p95FrameTimeMs > this.targetFrameTimeMs * 1.4) {
      return 'OVERBURDENED';
    }

    // Underutilized if running smoothly with surplus for > 60 samples
    if (this.consecutiveSurplus >= 50 && this.p95FrameTimeMs < this.targetFrameTimeMs * 0.8) {
      return 'UNDERUTILIZED';
    }

    return 'HEALTHY';
  }

  /**
   * Retrieves active frame diagnostics.
   * @returns {{ avgMs: number, p95Ms: number, fps: number, health: string, spikes: number }}
   */
  getMetrics() {
    return {
      avgMs: Number(this.avgFrameTimeMs.toFixed(2)),
      p95Ms: Number(this.p95FrameTimeMs.toFixed(2)),
      fps: this.currentFPS,
      health: this.getHealthState(),
      spikes: this.spikeCount
    };
  }

  /**
   * Resets trend counters and buffer.
   */
  reset() {
    this.sampleCount = 0;
    this.writeIndex = 0;
    this.consecutiveDrops = 0;
    this.consecutiveSurplus = 0;
    this.spikeCount = 0;
  }
}
