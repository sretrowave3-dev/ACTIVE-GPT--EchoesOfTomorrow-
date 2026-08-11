window.__echoEngine = {
    start() {
        console.log('[Echoes of Tomorrow] Engine stub starting.');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const loadFolderBtn = document.getElementById('loadFolderBtn');
    const startGameBtn = document.getElementById('startGameBtn');
    const canvas = document.getElementById('gameCanvas');

    loadFolderBtn?.addEventListener('click', () => {
        console.log('[Echoes of Tomorrow] Initialize Data Link clicked.');
        loadFolderBtn.style.display = 'none';
        if (startGameBtn) startGameBtn.style.display = 'inline-block';
    });

    startGameBtn?.addEventListener('click', () => {
        console.log('[Echoes of Tomorrow] Start Game clicked.');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                ctx.fillStyle = '#0a0f1f';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#fff';
                ctx.font = '28px Courier New';
                ctx.fillText('Echoes of Tomorrow engine started.', 40, 80);
            }
        }
        window.__echoEngine.start();
    });
});
