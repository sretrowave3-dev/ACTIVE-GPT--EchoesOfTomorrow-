export class PerformanceCounters {
  constructor() {
    this.fps = 0;
    this.frameTime = 0;           // ms
    this.frameCount = 0;
    this.averageFrameTime = 0;    // rolling average
    this.eventQueueSize = 0;

    // O(1) rolling average using a circular buffer
    this._maxSamples = 120;
    this._buffer = new Float64Array(this._maxSamples);
    this._index = 0;
    this._count = 0;
    this._runningTotal = 0;
  }

  update(deltaTime, eventQueueSize) {
    this.frameTime = deltaTime * 1000;
    this.frameCount++;
    this.eventQueueSize = eventQueueSize;

    // Remove oldest value if buffer full
    if (this._count === this._maxSamples) {
      this._runningTotal -= this._buffer[this._index];
    } else {
      this._count++;
    }

    // Add new value
    this._buffer[this._index] = this.frameTime;
    this._runningTotal += this.frameTime;
    this._index = (this._index + 1) % this._maxSamples;

    this.averageFrameTime = this._runningTotal / this._count;
    this.fps = Math.round(1000 / this.averageFrameTime);
  }
}
