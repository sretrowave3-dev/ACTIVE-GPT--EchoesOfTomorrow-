export class GameClock {
    constructor() {
        this.lastTimestamp = 0;
        this.deltaTime = 0;
        this.elapsedTime = 0;
        this.frameCount = 0;
    }

    tick(timestamp) {
        if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
            throw new TypeError('GameClock.tick expects a numeric timestamp');
        }

        if (this.lastTimestamp === 0) {
            this.deltaTime = 0;
        } else {
            this.deltaTime = Math.max(0, (timestamp - this.lastTimestamp) / 1000);
        }

        this.lastTimestamp = timestamp;
        this.elapsedTime += this.deltaTime;
        this.frameCount += 1;

        return this.deltaTime;
    }

    get deltaTimeSeconds() {
        return this.deltaTime;
    }

    get elapsedTimeSeconds() {
        return this.elapsedTime;
    }

    get frameCountValue() {
        return this.frameCount;
    }
}
