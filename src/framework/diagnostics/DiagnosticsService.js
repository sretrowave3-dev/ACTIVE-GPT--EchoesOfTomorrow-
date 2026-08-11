import { PerformanceCounters } from './PerformanceCounters.js';

export class DiagnosticsService {
    constructor(clock) {
        this.clock = clock;
        this.eventBus = null;
        this.performance = new PerformanceCounters();
        this.lastUpdate = 0;
    }

    setEventBus(eventBus) {
        this.eventBus = eventBus;
    }

    update(delta) {
        if (typeof delta !== 'number' || Number.isNaN(delta)) {
            return;
        }
        this.lastUpdate = delta;
        this.performance.update(delta, this.eventBus?.getQueueLength?.() || 0);
    }

    getSnapshot() {
        return {
            elapsedTime: this.clock?.elapsedTime || 0,
            deltaTime: this.clock?.deltaTime || 0,
            frameCount: this.clock?.frameCount || 0,
            fps: this.performance.fps,
            frameTime: this.performance.frameTime,
            averageFrameTime: this.performance.averageFrameTime,
            eventQueueSize: this.performance.eventQueueSize
        };
    }
}
