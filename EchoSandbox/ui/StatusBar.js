export class StatusBar {
    constructor(textId, dotId, state) {
        this.text = document.getElementById(textId);
        this.dot = document.getElementById(dotId);
        this.state = state;
        this._init();
    }

    _init() {
        if (this.text) this.text.textContent = 'RUNNING';
        if (this.dot) this.dot.textContent = '●';
    }
}
