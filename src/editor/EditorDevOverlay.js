// src/editor/EditorDevOverlay.js
import { CommandInterpreter } from './CommandInterpreter.js';
import { LevelSerializer } from './LevelSerializer.js';

/**
 * EditorDevOverlay creates an in-engine developer drawer containing
 * the Entity Hierarchy, Component Inspector, CLI Command Console,
 * and HAOS Runtime Profiler.
 * Conforms to EDD Chapter 20 (Editor Architecture & Developer Toolchain).
 */
export class EditorDevOverlay {
  /**
   * @param {import('../framework/core/Framework.js').Framework} framework
   */
  constructor(framework) {
    this.framework = framework;
    this.interpreter = new CommandInterpreter(framework);
    this.isVisible = false;
    this._mounted = false;
    this._elements = {};
    this.currentTab = 'console';
  }

  /**
   * Mounts the developer overlay into the DOM.
   */
  initialize() {
    if (typeof document === 'undefined') return;

    this._injectStyles();
    this._createDOM();
    this._bindEvents();
    this._mounted = true;
  }

  /**
   * Injects CSS for the editor panel.
   * @private
   */
  _injectStyles() {
    if (document.getElementById('echo-editor-styles')) return;

    const style = document.createElement('style');
    style.id = 'echo-editor-styles';
    style.textContent = `
      #echo-editor-drawer {
        position: fixed;
        bottom: 0; left: 0;
        width: 100vw; height: 380px;
        background: rgba(8, 12, 20, 0.95);
        border-top: 2px solid #00ffcc;
        color: #ccd;
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        z-index: 1000;
        display: none;
        flex-direction: column;
        backdrop-filter: blur(12px);
        box-shadow: 0 -5px 25px rgba(0, 255, 204, 0.3);
      }

      .echo-editor-tabs {
        display: flex;
        background: rgba(0, 20, 30, 0.8);
        border-bottom: 1px solid rgba(0, 255, 204, 0.2);
      }

      .echo-editor-tab-btn {
        padding: 8px 20px;
        background: transparent;
        border: none;
        border-right: 1px solid rgba(0, 255, 204, 0.2);
        color: #88a;
        cursor: pointer;
        text-transform: uppercase;
        font-size: 11px;
        letter-spacing: 1.5px;
        transition: all 0.2s ease;
      }

      .echo-editor-tab-btn:hover {
        background: rgba(0, 255, 204, 0.15);
        color: #fff;
      }

      .echo-editor-tab-btn.active {
        background: #00ffcc;
        color: #050a10;
        font-weight: bold;
      }

      .echo-editor-body {
        flex: 1;
        overflow: hidden;
        display: flex;
      }

      .echo-editor-content {
        flex: 1;
        padding: 12px 18px;
        overflow-y: auto;
        display: none;
      }

      .echo-editor-content.active {
        display: flex;
        flex-direction: column;
      }

      /* Console View */
      #echo-console-output {
        flex: 1;
        overflow-y: auto;
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(0, 255, 204, 0.15);
        padding: 8px 12px;
        font-size: 11px;
        line-height: 1.4;
        white-space: pre-wrap;
        color: #88ffcc;
        margin-bottom: 8px;
      }

      .echo-console-input-row {
        display: flex;
        gap: 8px;
      }

      #echo-console-input {
        flex: 1;
        background: rgba(0, 0, 0, 0.6);
        border: 1px solid rgba(0, 255, 204, 0.4);
        color: #fff;
        padding: 6px 12px;
        font-family: inherit;
        font-size: 12px;
      }

      #echo-console-input:focus {
        outline: none;
        border-color: #00ffcc;
        box-shadow: 0 0 8px rgba(0, 255, 204, 0.4);
      }

      /* Hierarchy View */
      .echo-hierarchy-pane {
        width: 250px;
        border-right: 1px solid rgba(0, 255, 204, 0.2);
        overflow-y: auto;
        padding-right: 12px;
      }

      .echo-inspector-pane {
        flex: 1;
        padding-left: 16px;
        overflow-y: auto;
      }

      .echo-entity-row {
        padding: 4px 8px;
        cursor: pointer;
        border-radius: 2px;
        margin-bottom: 2px;
      }
      .echo-entity-row:hover { background: rgba(0, 255, 204, 0.1); }
      .echo-entity-row.selected { background: #00ffcc; color: #000; font-weight: bold; }

      /* Profiler View */
      .echo-profiler-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
      }

      .echo-profiler-card {
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(0, 255, 204, 0.2);
        padding: 12px;
      }

      .echo-profiler-val {
        font-size: 18px;
        color: #00ffcc;
        font-weight: bold;
        margin-top: 4px;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Constructs the HTML hierarchy.
   * @private
   */
  _createDOM() {
    const existing = document.getElementById('echo-editor-drawer');
    if (existing) existing.remove();

    const drawer = document.createElement('div');
    drawer.id = 'echo-editor-drawer';
    drawer.innerHTML = `
      <div class="echo-editor-tabs">
        <button id="tab-btn-console" class="echo-editor-tab-btn active">Terminal [~]</button>
        <button id="tab-btn-hierarchy" class="echo-editor-tab-btn">ECS Hierarchy</button>
        <button id="tab-btn-profiler" class="echo-editor-tab-btn">HAOS Profiler</button>
        <button id="tab-btn-level" class="echo-editor-tab-btn">Level Pipeline</button>
        <div style="flex:1;"></div>
        <button id="echo-editor-close" class="echo-editor-tab-btn" style="color:#ff3366;">Close [Esc]</button>
      </div>
      <div class="echo-editor-body">
        <!-- Tab 1: Terminal Console -->
        <div id="echo-tab-console" class="echo-editor-content active">
          <div id="echo-console-output">ECHO ENGINE DEVELOPER CONSOLE // TYPE 'help' FOR COMMANDS\n</div>
          <div class="echo-console-input-row">
            <span style="color:#00ffcc; align-self:center;">&gt;</span>
            <input type="text" id="echo-console-input" placeholder="Type command (e.g. 'help', 'list', 'haos high', 'tp 0 2 0')..." />
          </div>
        </div>

        <!-- Tab 2: ECS Hierarchy & Inspector -->
        <div id="echo-tab-hierarchy" class="echo-editor-content" style="flex-direction:row;">
          <div class="echo-hierarchy-pane" id="echo-hierarchy-list">
            <div>Loading entities...</div>
          </div>
          <div class="echo-inspector-pane" id="echo-inspector-content">
            <div style="color:#667;">Select an entity on the left to inspect components.</div>
          </div>
        </div>

        <!-- Tab 3: HAOS Profiler -->
        <div id="echo-tab-profiler" class="echo-editor-content">
          <div class="echo-profiler-grid">
            <div class="echo-profiler-card">
              <div>ACTIVE HAOS TIER</div>
              <div id="prof-tier" class="echo-profiler-val">MEDIUM</div>
            </div>
            <div class="echo-profiler-card">
              <div>AVG FRAME TIME</div>
              <div id="prof-frametime" class="echo-profiler-val">16.6 ms</div>
            </div>
            <div class="echo-profiler-card">
              <div>FRAME PACING HEALTH</div>
              <div id="prof-health" class="echo-profiler-val">HEALTHY</div>
            </div>
            <div class="echo-profiler-card">
              <div>AUTO-SCALING</div>
              <div id="prof-autoscale" class="echo-profiler-val">ACTIVE</div>
            </div>
          </div>
        </div>

        <!-- Tab 4: Level Pipeline -->
        <div id="echo-tab-level" class="echo-editor-content">
          <div style="margin-bottom:12px; font-weight:bold; color:#00ffcc;">CONTENT-READY LEVEL PIPELINE</div>
          <div style="display:flex; gap:12px; margin-bottom:16px;">
            <button id="btn-export-level" class="echo-editor-tab-btn" style="border:1px solid #00ffcc; color:#00ffcc;">Export Level JSON</button>
            <button id="btn-load-omega" class="echo-editor-tab-btn" style="border:1px solid #ffaa00; color:#ffaa00;">Load Sector Omega</button>
          </div>
          <textarea id="level-json-preview" style="flex:1; background:rgba(0,0,0,0.5); border:1px solid rgba(0,255,204,0.3); color:#88ffcc; font-family:monospace; padding:8px;" readonly placeholder="Level JSON output will appear here..."></textarea>
        </div>
      </div>
    `;
    document.body.appendChild(drawer);

    // Cache elements
    this._elements = {
      drawer,
      output: document.getElementById('echo-console-output'),
      input: document.getElementById('echo-console-input'),
      btnClose: document.getElementById('echo-editor-close'),
      tabBtnConsole: document.getElementById('tab-btn-console'),
      tabBtnHierarchy: document.getElementById('tab-btn-hierarchy'),
      tabBtnProfiler: document.getElementById('tab-btn-profiler'),
      tabBtnLevel: document.getElementById('tab-btn-level'),
      tabConsole: document.getElementById('echo-tab-console'),
      tabHierarchy: document.getElementById('echo-tab-hierarchy'),
      tabProfiler: document.getElementById('echo-tab-profiler'),
      tabLevel: document.getElementById('echo-tab-level'),
      hierarchyList: document.getElementById('echo-hierarchy-list'),
      inspectorContent: document.getElementById('echo-inspector-content'),
      profTier: document.getElementById('prof-tier'),
      profFrameTime: document.getElementById('prof-frametime'),
      profHealth: document.getElementById('prof-health'),
      profAutoScale: document.getElementById('prof-autoscale'),
      btnExportLevel: document.getElementById('btn-export-level'),
      btnLoadOmega: document.getElementById('btn-load-omega'),
      levelJsonPreview: document.getElementById('level-json-preview')
    };
  }

  /**
   * Binds UI events.
   * @private
   */
  _bindEvents() {
    // Keyboard shortcut [Backquote] (tilde / `) to toggle overlay
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Backquote') {
        e.preventDefault();
        this.toggle();
      } else if (e.code === 'Escape' && this.isVisible) {
        this.toggle(false);
      }
    });

    this._elements.btnClose?.addEventListener('click', () => this.toggle(false));

    // Console Command Input [Enter]
    this._elements.input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = this._elements.input.value;
        this._elements.input.value = '';
        this.executeCommand(val);
      }
    });

    // Tab buttons
    this._elements.tabBtnConsole?.addEventListener('click', () => this.switchTab('console'));
    this._elements.tabBtnHierarchy?.addEventListener('click', () => {
      this.switchTab('hierarchy');
      this.refreshHierarchy();
    });
    this._elements.tabBtnProfiler?.addEventListener('click', () => {
      this.switchTab('profiler');
      this.refreshProfiler();
    });
    this._elements.tabBtnLevel?.addEventListener('click', () => this.switchTab('level'));

    // Export Level button
    this._elements.btnExportLevel?.addEventListener('click', () => {
      const level = LevelSerializer.exportLevel(this.framework, 'sector_custom', 'Active Proving Ground');
      if (this._elements.levelJsonPreview) {
        this._elements.levelJsonPreview.value = JSON.stringify(level, null, 2);
      }
      this.log('Level exported successfully to JSON buffer.');
    });

    // Load Sector Omega button
    this._elements.btnLoadOmega?.addEventListener('click', async () => {
      try {
        const res = await fetch('./assets/levels/sector_omega.json');
        if (res.ok) {
          const data = await res.json();
          LevelSerializer.importLevel(data, this.framework);
          this.log(`Loaded Sector Omega with ${data.entities.length} entities!`);
          this.refreshHierarchy();
        } else {
          this.log('Failed to fetch sector_omega.json');
        }
      } catch (err) {
        this.log(`Error loading level: ${err.message}`);
      }
    });
  }

  /**
   * Toggle visibility of the editor drawer.
   * @param {boolean} [forceState]
   */
  toggle(forceState) {
    this.isVisible = (forceState !== undefined) ? forceState : !this.isVisible;
    if (this._elements.drawer) {
      this._elements.drawer.style.display = this.isVisible ? 'flex' : 'none';
      if (this.isVisible) {
        if (document.exitPointerLock) document.exitPointerLock();
        this._elements.input?.focus();
        if (this.currentTab === 'hierarchy') this.refreshHierarchy();
        if (this.currentTab === 'profiler') this.refreshProfiler();
      }
    }
  }

  /**
   * Switches active editor tab.
   * @param {'console'|'hierarchy'|'profiler'|'level'} tab
   */
  switchTab(tab) {
    this.currentTab = tab;
    const tabs = ['console', 'hierarchy', 'profiler', 'level'];
    for (const t of tabs) {
      const btn = this._elements[`tabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`];
      const panel = this._elements[`tab${t.charAt(0).toUpperCase() + t.slice(1)}`];
      if (btn && panel) {
        if (t === tab) {
          btn.classList.add('active');
          panel.classList.add('active');
        } else {
          btn.classList.remove('active');
          panel.classList.remove('active');
        }
      }
    }
  }

  /**
   * Executes a command string and outputs result to console.
   * @param {string} cmd
   */
  executeCommand(cmd) {
    if (!cmd.trim()) return;
    this.log(`> ${cmd}`);
    if (cmd.trim().toLowerCase() === 'clear') {
      if (this._elements.output) this._elements.output.textContent = '';
      return;
    }
    const res = this.interpreter.execute(cmd);
    if (res.output) {
      this.log(res.output);
    }
  }

  /**
   * Logs a message into the console output.
   * @param {string} message
   */
  log(message) {
    if (!this._elements.output) return;
    this._elements.output.textContent += message + '\n';
    this._elements.output.scrollTop = this._elements.output.scrollHeight;
  }

  /**
   * Populates the ECS Hierarchy pane.
   */
  refreshHierarchy() {
    const ecs = this.framework.serviceRegistry.get('ecs')?.ecsManager;
    if (!ecs || !this._elements.hierarchyList) return;

    const entities = Array.from(ecs.entities || []);
    let html = `<div style="font-weight:bold; margin-bottom:8px; color:#00ffcc;">ENTITIES (${entities.length})</div>`;

    for (const id of entities) {
      html += `<div class="echo-entity-row" data-eid="${id}">#${id} ${id === 1000 ? '[Player]' : ''}</div>`;
    }

    this._elements.hierarchyList.innerHTML = html;

    // Attach click listeners to inspect entity
    const rows = this._elements.hierarchyList.querySelectorAll('.echo-entity-row');
    rows.forEach(row => {
      row.addEventListener('click', () => {
        rows.forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');
        const eid = parseInt(row.getAttribute('data-eid'), 10);
        this.inspectEntity(eid);
      });
    });
  }

  /**
   * Inspects and displays component data for an entity.
   * @param {number} eid
   */
  inspectEntity(eid) {
    const ecs = this.framework.serviceRegistry.get('ecs')?.ecsManager;
    if (!ecs || !this._elements.inspectorContent) return;

    let html = `<div style="font-weight:bold; color:#00ffcc; margin-bottom:12px;">ENTITY #${eid} COMPONENTS:</div>`;

    for (const [name, store] of ecs.stores.entries()) {
      if (store.has(eid)) {
        html += `<div style="background:rgba(0,0,0,0.3); border:1px solid rgba(0,255,204,0.2); padding:8px; margin-bottom:8px;">`;
        html += `<div style="font-weight:bold; color:#fff; margin-bottom:4px;">${name}</div>`;
        const data = store.get(eid);
        for (const [k, v] of Object.entries(data)) {
          const valStr = typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v);
          html += `<div style="font-size:11px; color:#aab; margin-left:8px;"><strong>${k}:</strong> ${valStr}</div>`;
        }
        html += `</div>`;
      }
    }

    this._elements.inspectorContent.innerHTML = html;
  }

  /**
   * Refreshes the HAOS Profiler metrics.
   */
  refreshProfiler() {
    const haos = this.framework.serviceRegistry.get('haos');
    if (!haos) return;

    const t = haos.getTelemetry();
    if (this._elements.profTier && t.activeProfile) {
      this._elements.profTier.textContent = t.activeProfile.tier;
    }
    if (this._elements.profFrameTime && t.frameMetrics) {
      this._elements.profFrameTime.textContent = `${t.frameMetrics.avgMs} ms (${t.frameMetrics.fps} FPS)`;
    }
    if (this._elements.profHealth && t.frameMetrics) {
      this._elements.profHealth.textContent = t.frameMetrics.health;
    }
    if (this._elements.profAutoScale) {
      this._elements.profAutoScale.textContent = t.isAutoScaling ? 'ACTIVE' : 'MANUAL';
    }
  }

  /**
   * Cleans up DOM elements on shutdown.
   */
  destroy() {
    if (this._elements.drawer && this._elements.drawer.parentNode) {
      this._elements.drawer.parentNode.removeChild(this._elements.drawer);
    }
    const style = document.getElementById('echo-editor-styles');
    if (style && style.parentNode) {
      style.parentNode.removeChild(style);
    }
    this._mounted = false;
  }
}
