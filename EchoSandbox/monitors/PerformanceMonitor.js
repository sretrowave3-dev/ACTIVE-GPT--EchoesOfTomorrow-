/**
 * Echo Sandbox — Performance Monitor
 *
 * Tracks performance metrics including FPS, frame time,
 * CPU usage, and GPU usage (when available).
 */

export class PerformanceMonitor {
    constructor(framework, state) {
        this.framework = framework;
        this.state = state;
        this._running = false;
        this._frameCount = 0;
        this._lastFpsUpdate = 0;
        this._currentFps = 0;
        this._frameTimes = [];
        this._maxFrameTimes = 120;
        this._cpuSample = 0;
        this._gpuSample = 0;
        this._lastCpuTime = 0;
    }

    /**
     * Start monitoring.
     */
    start() {
        if (this._running) return;
        this._running = true;
        this._lastFpsUpdate = performance.now();
        this._lastCpuTime = performance.now();
    }

    /**
     * Stop monitoring.
     */
    stop() {
        this._running = false;
    }

    /**
     * Update performance metrics.
     * @param {number} delta - Delta time in seconds
     */
    update(delta) {
        if (!this._running) return;

        const now = performance.now();

        // Track frame time
        if (delta > 0) {
            const frameMs = delta * 1000;
            this._frameTimes.push(frameMs);
            if (this._frameTimes.length > this._maxFrameTimes) {
                this._frameTimes.shift();
            }
        }

        // Update FPS every second
        this._frameCount++;
        if (now - this._lastFpsUpdate >= 1000) {
            this._currentFps = this._frameCount;
            this._frameCount = 0;
            this._lastFpsUpdate = now;

            // Update state
            const avgFrameTime = this._frameTimes.length > 0
                ? this._frameTimes.reduce((a, b) => a + b, 0) / this._frameTimes.length
                : 0;

            this.state.setValue('stats.fps', this._currentFps);
            this.state.setValue('stats.frameTime', avgFrameTime);

            // Emit performance update event
            this.state._notifyObservers('performance', {
                fps: this._currentFps,
                frameTime: avgFrameTime,
                cpu: this._cpuSample,
                gpu: this._gpuSample
            });
        }

        // Estimate CPU usage
        if (now - this._lastCpuTime > 200) {
            // Simple CPU estimation based on frame time vs ideal
            const idealFrameTime = 16.67; // 60 FPS
            const avgFrame = this._frameTimes.length > 0
                ? this._frameTimes.reduce((a, b) => a + b, 0) / this._frameTimes.length
                : idealFrameTime;

            // If frame time is close to ideal, CPU usage is moderate
            // This is a very rough estimate
            const ratio = Math.min(1, avgFrame / idealFrameTime);
            this._cpuSample = Math.round(Math.min(100, ratio * 80 + 10));

            // Reset GPU for now (would need proper GPU profiling)
            this._gpuSample = Math.max(5, Math.round(this._cpuSample * 0.7));

            this._lastCpuTime = now;
        }

        // Update performance state
        this.state.setValue('performance', {
            cpu: this._cpuSample,
            gpu: this._gpuSample,
            heap: performance.memory?.usedJSHeapSize || 0
        });
    }

    /**
     * Get current FPS.
     * @returns {number} Current FPS
     */
    getFps() {
        return this._currentFps;
    }

    /**
     * Get average frame time.
     * @returns {number} Average frame time in ms
     */
    getAverageFrameTime() {
        if (this._frameTimes.length === 0) return 0;
        return this._frameTimes.reduce((a, b) => a + b, 0) / this._frameTimes.length;
    }

    /**
     * Get performance summary.
     * @returns {Object} Performance summary
     */
    getSummary() {
        return {
            fps: this._currentFps,
            frameTime: this.getAverageFrameTime(),
            cpu: this._cpuSample,
            gpu: this._gpuSample,
            frameCount: this._frameCount
        };
    }
}

