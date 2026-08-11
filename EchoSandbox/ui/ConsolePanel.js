export class ConsolePanel {
    constructor(outputId, inputId, state) {
        this.output = document.getElementById(outputId);
        this.input = document.getElementById(inputId);
        this.state = state;
        this._init();
    }

    _init() {
        if (!this.output || !this.input) return;
        this.output.textContent = 'Console ready';
        this.input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                this.output.textContent += '\n> ' + this.input.value;
                this.input.value = '';
            }
        });
    }
}
