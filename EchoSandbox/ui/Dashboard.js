export class Dashboard {
    constructor(containerId, state) {
        this.container = document.getElementById(containerId);
        this.state = state;
        this._init();
    }

    _init() {
        if (!this.container) return;
        this.container.textContent = 'Dashboard ready';
    }
}
