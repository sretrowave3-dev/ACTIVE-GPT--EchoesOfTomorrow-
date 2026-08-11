/**
 * DebugOverlay — 2D Canvas diagnostics for sandbox
 * 
 * Displays engine status, FPS, transforms, and entity counts.
 * Uses Canvas 2D — NO renderer, NO Three.js, NO WebGPU.
 */
export class DebugOverlay {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.data = {
            fps: 0,
            delta: 0,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            entityCount: 0,
            frameCount: 0,
            serviceStatus: 'INIT',
            worldStatus: 'INIT',
            ecsStatus: 'INIT',
            queueSize: 0,
            dependencyCount: 0,
            simulationTime: 0
        };
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.width = rect.width;
        this.height = rect.height;
    }

    update(data) {
        Object.assign(this.data, data);
        this.draw();
    }

    draw() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Clear
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#0a0a12';
        ctx.fillRect(0, 0, w, h);

        // Grid
        ctx.strokeStyle = '#14141f';
        ctx.lineWidth = 0.5;
        const step = 60;
        for (let x = 0; x < w; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Info panel
        const x = 24;
        let y = 24;
        const lineH = 22;
        ctx.font = '13px "Courier New", monospace';
        ctx.textBaseline = 'top';

        const drawLine = (label, value, color = '#0f0') => {
            ctx.fillStyle = '#556';
            ctx.fillText(label, x, y);
            ctx.fillStyle = color;
            ctx.fillText(String(value), x + 170, y);
            y += lineH;
        };

        // --- Engine Status ---
        drawLine('┌───────────────────────', '', '#666');
        drawLine('│ ECHO ENGINE STATUS', '', '#0f0');
        drawLine('├───────────────────────', '', '#666');

        // FPS & Delta
        const fps = this.data.fps || 0;
        const deltaMs = (this.data.delta || 0) * 1000;
        drawLine('│ FPS:', `${fps.toFixed(0)}  (${deltaMs.toFixed(1)}ms)`, '#0f0');

        // Services
        const sStatus = this.data.serviceStatus || 'RUNNING';
        drawLine('│ Services:', sStatus, sStatus === 'RUNNING' ? '#0f0' : '#f00');

        const wStatus = this.data.worldStatus || 'RUNNING';
        drawLine('│ World:', wStatus, wStatus === 'RUNNING' ? '#0f0' : '#f00');

        const eStatus = this.data.ecsStatus || 'RUNNING';
        drawLine('│ ECS:', eStatus, eStatus === 'RUNNING' ? '#0f0' : '#f00');

        // Entity count
        drawLine('│ Entities:', this.data.entityCount || 0, '#0ff');

        // Frame count
        drawLine('│ Frames:', this.data.frameCount || 0, '#88f');

        // --- Player Transform ---
        drawLine('├───────────────────────', '', '#666');
        drawLine('│ PLAYER TRANSFORM', '', '#ff0');

        const p = this.data.position;
        drawLine('│ Position:', `(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`, '#ff0');

        const r = this.data.rotation;
        drawLine('│ Rotation (Euler):', `(${r.x.toFixed(2)}, ${r.y.toFixed(2)}, ${r.z.toFixed(2)})`, '#ff0');

        drawLine('└───────────────────────', '', '#666');

        // --- Time Diagnostics ---
        drawLine('├───────────────────────', '', '#666');
        drawLine('│ TIME DIAGNOSTICS', '', '#0ff');
        drawLine('│ Queue Size:', this.data.queueSize || 0, '#0ff');
        drawLine('│ Dependencies:', this.data.dependencyCount || 0, '#0ff');
        drawLine('│ Sim Time:', `${(this.data.simulationTime || 0).toFixed(2)}s`, '#0ff');
        drawLine('└───────────────────────', '', '#666');

        // --- Controls help ---
        y += 8;
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, 12, 12);
        ctx.fillStyle = '#0a0';
        ctx.fillText('WASD: Move', x + 20, y);
        y += lineH;
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, 12, 12);
        ctx.fillStyle = '#0a0';
        ctx.fillText('← → : Rotate', x + 20, y);

        // --- Running indicator (spinning dot) ---
        const dotX = w - 40;
        const dotY = 40;
        const angle = performance.now() / 800;
        const radius = 8;
        ctx.beginPath();
        ctx.arc(dotX, dotY, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#0f04';
        ctx.fill();
        ctx.strokeStyle = '#0f08';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Dot at angle
        const dotX2 = dotX + Math.cos(angle) * radius * 0.6;
        const dotY2 = dotY + Math.sin(angle) * radius * 0.6;
        ctx.beginPath();
        ctx.arc(dotX2, dotY2, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#0f0';
        ctx.fill();

        // --- 3D cube indicator ---
        const cx = w - 80;
        const cy = 100;
        const size = 28;
        const angle3d = performance.now() / 1200;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle3d * 0.2);
        ctx.strokeStyle = '#0f04';
        ctx.lineWidth = 1.5;

        const s = size * 0.5;
        const pts = [
            [-s, -s, -s], [ s, -s, -s], [ s,  s, -s], [-s,  s, -s],
            [-s, -s,  s], [ s, -s,  s], [ s,  s,  s], [-s,  s,  s]
        ];
        const rotX = angle3d * 0.5;
        const rotY = angle3d * 0.3;
        const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
        const cosY = Math.cos(rotY), sinY = Math.sin(rotY);

        const proj = (p) => {
            let y = p[1] * cosX - p[2] * sinX;
            let z = p[1] * sinX + p[2] * cosX;
            let x = p[0] * cosY + z * sinY;
            z = -p[0] * sinY + z * cosY;
            return [x, y];
        };

        const edges = [
            [0,1],[1,2],[2,3],[3,0],
            [4,5],[5,6],[6,7],[7,4],
            [0,4],[1,5],[2,6],[3,7]
        ];

        const projected = pts.map(p => proj(p));
        for (const [i, j] of edges) {
            const p1 = projected[i];
            const p2 = projected[j];
            ctx.beginPath();
            ctx.moveTo(p1[0], p1[1]);
            ctx.lineTo(p2[0], p2[1]);
            ctx.stroke();
        }
        ctx.restore();

        // Border
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, w, h);
    }
}