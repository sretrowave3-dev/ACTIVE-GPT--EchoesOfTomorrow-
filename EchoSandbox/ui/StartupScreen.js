export class StartupScreen {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    show() {
        if (this.container) this.container.style.display = 'flex';
    }

    hide() {
        if (this.container) this.container.style.display = 'none';
    }

    updateProgress(progress, message) {
        const messageElement = document.getElementById('startupMessage');
        const fill = document.getElementById('startupFill');
        if (messageElement) messageElement.textContent = message;
        if (fill) fill.style.width = `${progress}%`;
    }

    showError(message) {
        const messageElement = document.getElementById('startupMessage');
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.style.color = '#ff2244';
        }
    }
}
