export class Viewport {
    constructor(canvasId, state) {
        this.canvas = document.getElementById(canvasId);
        this.state = state;
        this._init();
    }

    _init() {
        if (!this.canvas) return;
        const context = this.canvas.getContext('2d');
        if (context) {
            context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}
