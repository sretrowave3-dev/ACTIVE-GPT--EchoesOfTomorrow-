// src/editor/EditorDevOverlay.js
import { CommandInterpreter } from './CommandInterpreter.js';
import { LevelSerializer } from './LevelSerializer.js';
import { GizmoMode } from './TransformGizmo.js';

/**
 * EditorDevOverlay creates an in-engine developer drawer containing
 * the World Outliner, Details Inspector, PIE (Play In Editor) controls,
 * CLI Command Console, and HAOS Runtime Profiler.
 * Conforms to EDD Chapter 20 (Editor Architecture & Developer Toolchain).
 */
export class EditorDevOverlay {
  /**
   * @param {import('../framework/core/Framework.js').Framework} framework
   * @param {Object} [tools]
   * @param {import('./WorldOutliner.js').WorldOutliner} [tools.outliner]
   * @param {import('./DetailsInspector.js').DetailsInspector} [tools.inspector]
   * @param {import('./TransformGizmo.js').TransformGizmo} [tools.gizmo]
   * @param {import('./PlayInEditor.js').PlayInEditor} [tools.pie]
   */
  constructor(framework, tools = {}) {
    this.framework = framework;
    this.outliner = tools.outliner || null;
    this.inspector = tools.inspector || null;
    this.gizmo = tools.gizmo || null;
    this.pie = tools.pie || null;

    this.interpreter = new CommandInterpreter(framework);
    this.isVisible = false;
    this._mounted = false;
    this._elements = {};
    this.currentTab = 'console';
    this.selectedEntityId = null;
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
        width: 100vw; height: 420px;
        background: rgba(8, 12, 20, 0.96);
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

      .echo-editor-toolbar {
        display: flex;
        align-items: center;
        background: rgba(4, 8, 14, 0.95);
        border-bottom: 1px solid rgba(0, 255, 204, 0.3);
        padding: 4px 12px;
        gap: 8px;
      }

      .echo-editor-tabs {
        display: flex;
        background: rgba(0, 20, 30, 0.8);
        border-bottom: 1px solid rgba(0, 255, 204, 0.2);
      }

      .echo-editor-tab-btn, .echo-pie-btn, .echo-gizmo-btn {
        padding: 6px 14px;
        background: transparent;
        border: 1px solid rgba(0, 255, 204, 0.2);
        color: #88a;
        cursor: pointer;
        text-transform: uppercase;
        font-size: 11px;
        letter-spacing: 1px;
        transition: all 0.15s ease;
        border-radius: 2px;
      }

      .echo-editor-tab-btn:hover, .echo-pie-btn:hover, .echo-gizmo-btn:hover {
        background: rgba(0, 255, 204, 0.15);
        color: #fff;
      }

      .echo-editor-tab-btn.active, .echo-gizmo-btn.active {
        background: #00ffcc;
        color: #050a10;
        font-weight: bold;
      }

      .echo-pie-status {
        padding: 4px 8px;
        background: rgba(0, 255, 204, 0.1);
        border: 1px solid #00ffcc;
        color: #00ffcc;
        font-weight: bold;
        font-size: 11px;
        border-radius: 2px;
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

      #echo-console-input, #echo-outliner-search {
        background: rgba(0, 0, 0, 0.6);
        border: 1px solid rgba(0, 255, 204, 0.4);
        color: #fff;
        padding: 6px 12px;
        font-family: inherit;
        font-size: 12px;
      }

      #echo-console-input:focus, #echo-outliner-search:focus {
        outline: none;
        border-color: #00ffcc;
        box-shadow: 0 0 8px rgba(0, 255, 204, 0.4);
      }

      /* Hierarchy View */
      .echo-hierarchy-pane {
        width: 300px;
        border-right: 1px solid rgba(0, 255, 204, 0.2);
        overflow-y: auto;
        padding-right: 12px;
        display: flex;
        flex-direction: column;
      }

      .echo-inspector-pane {
        flex: 1;
        padding-left: 16px;
        overflow-y: auto;
      }

      .echo-entity-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 8px;
        cursor: pointer;
        border-radius: 2px;
        margin-bottom: 2px;
        font-size: 11px;
      }
      .echo-entity-row:hover { background: rgba(0, 255, 204, 0.1); }
      .echo-entity-row.selected { background: #00ffcc; color: #000; font-weight: bold; }

      .echo-row-actions {
        display: flex;
        gap: 4px;
      }

      .echo-icon-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        font-size: 11px;
        opacity: 0.7;
      }
      .echo-icon-btn:hover { opacity: 1.0; }

      .echo-prop-input {
        background: rgba(0, 0, 0, 0.6);
        border: 1px solid rgba(0, 255, 204, 0.3);
        color: #00ffcc;
        padding: 2px 6px;
        font-family: inherit;
        font-size: 11px;
        width: 60px;
      }

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
      <!-- Top Control Toolbar (Unreal PIE & Gizmo bar) -->
      <div class="echo-editor-toolbar">
        <span style="font-weight:bold; color:#00ffcc; margin-right:8px;">ECHO PRO EDITOR</span>
        
        <!-- PIE Controls -->
        <button id="btn-pie-play" class="echo-pie-btn" style="color:#00ff88;" title="Play Simulation">▶ Play</button>
        <button id="btn-pie-pause" class="echo-pie-btn" style="color:#ffcc00;" title="Pause Simulation">⏸ Pause</button>
        <button id="btn-pie-step" class="echo-pie-btn" style="color:#00ccff;" title="Step Single Frame">⏭ Step</button>
        <button id="btn-pie-eject" class="echo-pie-btn" style="color:#ff8800;" title="Eject / Possess Player (F8)">⏏ Eject</button>
        <button id="btn-pie-stop" class="echo-pie-btn" style="color:#ff3366;" title="Stop & Restore Simulation">⏹ Stop</button>
        <div id="pie-status-pill" class="echo-pie-status">EDIT</div>

        <div style="width:1px; height:18px; background:rgba(0,255,204,0.3); margin:0 8px;"></div>

        <!-- Transform Gizmo Controls -->
        <button id="btn-gizmo-trans" class="echo-gizmo-btn active" title="Translate Gizmo (W)">W: Pos</button>
        <button id="btn-gizmo-rot" class="echo-gizmo-btn" title="Rotate Gizmo (E)">E: Rot</button>
        <button id="btn-gizmo-scale" class="echo-gizmo-btn" title="Scale Gizmo (R)">R: Scl</button>
        <button id="btn-gizmo-snap" class="echo-gizmo-btn" title="Toggle Grid Snapping">Snap: OFF</button>

        <div style="flex:1;"></div>
        <button id="echo-editor-close" class="echo-editor-tab-btn" style="color:#ff3366;">Close [~]</button>
      </div>

      <!-- Navigation Tabs -->
      <div class="echo-editor-tabs">
        <button id="tab-btn-console" class="echo-editor-tab-btn active">Terminal [~]</button>
        <button id="tab-btn-hierarchy" class="echo-editor-tab-btn">World Outliner & Details</button>
        <button id="tab-btn-profiler" class="echo-editor-tab-btn">HAOS Profiler</button>
        <button id="tab-btn-level" class="echo-editor-tab-btn">Level Pipeline</button>
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

        <!-- Tab 2: World Outliner & Details Inspector -->
        <div id="echo-tab-hierarchy" class="echo-editor-content" style="flex-direction:row;">
          <div class="echo-hierarchy-pane">
            <input type="text" id="echo-outliner-search" placeholder="Search actors..." style="margin-bottom:8px;" />
            <div id="echo-hierarchy-list" style="flex:1; overflow-y:auto;">
              <div>Loading entities...</div>
            </div>
          </div>
          <div class="echo-inspector-pane" id="echo-inspector-content">
            <div style="color:#667;">Select an actor on the left to inspect and edit components.</div>
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
      outlinerSearch: document.getElementById('echo-outliner-search'),
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
      levelJsonPreview: document.getElementById('level-json-preview'),
      btnPiePlay: document.getElementById('btn-pie-play'),
      btnPiePause: document.getElementById('btn-pie-pause'),
      btnPieStep: document.getElementById('btn-pie-step'),
      btnPieEject: document.getElementById('btn-pie-eject'),
      btnPieStop: document.getElementById('btn-pie-stop'),
      pieStatusPill: document.getElementById('pie-status-pill'),
      btnGizmoTrans: document.getElementById('btn-gizmo-trans'),
      btnGizmoRot: document.getElementById('btn-gizmo-rot'),
      btnGizmoScale: document.getElementById('btn-gizmo-scale'),
      btnGizmoSnap: document.getElementById('btn-gizmo-snap')
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
      } else if (e.code === 'F8') {
        // Unreal F8 Eject toggle
        e.preventDefault();
        this.pie?.eject();
        this._updatePIEStatus();
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

    // Outliner search filter
    this._elements.outlinerSearch?.addEventListener('input', (e) => {
      if (this.outliner) {
        this.outliner.setFilter(e.target.value);
        this.refreshHierarchy();
      }
    });

    // PIE Toolbar Button Listeners
    this._elements.btnPiePlay?.addEventListener('click', () => {
      this.pie?.play();
      this._updatePIEStatus();
    });
    this._elements.btnPiePause?.addEventListener('click', () => {
      this.pie?.pause();
      this._updatePIEStatus();
    });
    this._elements.btnPieStep?.addEventListener('click', () => {
      this.pie?.stepFrame();
      this._updatePIEStatus();
    });
    this._elements.btnPieEject?.addEventListener('click', () => {
      this.pie?.eject();
      this._updatePIEStatus();
    });
    this._elements.btnPieStop?.addEventListener('click', () => {
      this.pie?.stop();
      this._updatePIEStatus();
    });

    // Gizmo Toolbar Button Listeners
    this._elements.btnGizmoTrans?.addEventListener('click', () => this._setGizmoMode(GizmoMode.TRANSLATE));
    this._elements.btnGizmoRot?.addEventListener('click', () => this._setGizmoMode(GizmoMode.ROTATE));
    this._elements.btnGizmoScale?.addEventListener('click', () => this._setGizmoMode(GizmoMode.SCALE));
    this._elements.btnGizmoSnap?.addEventListener('click', () => {
      if (this.gizmo) {
        this.gizmo.configureSnapping(!this.gizmo.snappingEnabled);
        this._elements.btnGizmoSnap.textContent = `Snap: ${this.gizmo.snappingEnabled ? 'ON' : 'OFF'}`;
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
   * Update Gizmo mode and button active styling.
   * @private
   */
  _setGizmoMode(mode) {
    if (this.gizmo) this.gizmo.setMode(mode);
    this._elements.btnGizmoTrans?.classList.toggle('active', mode === GizmoMode.TRANSLATE);
    this._elements.btnGizmoRot?.classList.toggle('active', mode === GizmoMode.ROTATE);
    this._elements.btnGizmoScale?.classList.toggle('active', mode === GizmoMode.SCALE);
  }

  /**
   * Update PIE status label.
   * @private
   */
  _updatePIEStatus() {
    if (this._elements.pieStatusPill && this.pie) {
      this._elements.pieStatusPill.textContent = this.pie.getState();
    }
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
   * Populates the World Outliner list.
   */
  refreshHierarchy() {
    if (!this._elements.hierarchyList) return;

    let entries = [];
    if (this.outliner) {
      this.outliner.refresh();
      entries = this.outliner.getFilteredEntities();
    } else {
      const ecs = this.framework.serviceRegistry?.get('ecs')?.ecsManager;
      const entities = Array.from(ecs?.entities || []);
      entries = entities.map(id => ({ id, name: `Actor_${id}`, type: 'Entity', visible: true, locked: false }));
    }

    let html = `<div style="font-weight:bold; margin-bottom:8px; color:#00ffcc;">OUTLINER (${entries.length})</div>`;

    for (const ent of entries) {
      const isSel = this.selectedEntityId === ent.id;
      html += `
        <div class="echo-entity-row ${isSel ? 'selected' : ''}" data-eid="${ent.id}">
          <span>#${ent.id} ${ent.name}</span>
          <div class="echo-row-actions">
            <button class="echo-icon-btn btn-vis" data-eid="${ent.id}">${ent.visible !== false ? '👁' : '🚫'}</button>
            <button class="echo-icon-btn btn-lock" data-eid="${ent.id}">${ent.locked ? '🔒' : '🔓'}</button>
          </div>
        </div>
      `;
    }

    this._elements.hierarchyList.innerHTML = html;

    // Attach row click listeners
    const rows = this._elements.hierarchyList.querySelectorAll('.echo-entity-row');
    rows.forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-vis') || e.target.classList.contains('btn-lock')) return;
        rows.forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');
        const eid = parseInt(row.getAttribute('data-eid'), 10);
        this.selectedEntityId = eid;
        this.inspectEntity(eid);
      });
    });

    // Attach visibility toggles
    this._elements.hierarchyList.querySelectorAll('.btn-vis').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const eid = parseInt(btn.getAttribute('data-eid'), 10);
        const vis = this.outliner ? this.outliner.toggleVisibility(eid) : true;
        btn.textContent = vis ? '👁' : '🚫';
      });
    });

    // Attach lock toggles
    this._elements.hierarchyList.querySelectorAll('.btn-lock').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const eid = parseInt(btn.getAttribute('data-eid'), 10);
        const locked = this.outliner ? this.outliner.toggleLock(eid) : false;
        btn.textContent = locked ? '🔒' : '🔓';
      });
    });
  }

  /**
   * Inspects and displays editable component data for an entity in the Details panel.
   * @param {number} eid
   */
  inspectEntity(eid) {
    if (!this._elements.inspectorContent) return;

    let compData = {};
    if (this.inspector) {
      compData = this.inspector.inspectEntity(eid);
    } else {
      const ecs = this.framework.serviceRegistry?.get('ecs')?.ecsManager;
      if (ecs) {
        for (const [name, store] of ecs.stores.entries()) {
          if (store.has(eid)) compData[name] = store.get(eid);
        }
      }
    }

    let html = `<div style="font-weight:bold; color:#00ffcc; margin-bottom:12px;">DETAILS: ACTOR #${eid}</div>`;

    for (const [name, props] of Object.entries(compData)) {
      html += `<div style="background:rgba(0,0,0,0.3); border:1px solid rgba(0,255,204,0.2); padding:8px; margin-bottom:8px;">`;
      html += `<div style="font-weight:bold; color:#fff; margin-bottom:6px; border-bottom:1px solid rgba(0,255,204,0.1); padding-bottom:4px;">${name}</div>`;

      for (const [k, v] of Object.entries(props)) {
        if (v && typeof v === 'object' && ('x' in v || 'y' in v || 'z' in v)) {
          // 3D vector input (e.g. position, rotation, scale)
          html += `
            <div style="font-size:11px; color:#aab; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
              <strong style="width:70px;">${k}:</strong>
              X: <input type="number" step="0.5" class="echo-prop-input" data-comp="${name}" data-prop="${k}.x" value="${v.x ?? 0}" />
              Y: <input type="number" step="0.5" class="echo-prop-input" data-comp="${name}" data-prop="${k}.y" value="${v.y ?? 0}" />
              Z: <input type="number" step="0.5" class="echo-prop-input" data-comp="${name}" data-prop="${k}.z" value="${v.z ?? 0}" />
            </div>
          `;
        } else {
          const valStr = typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v);
          html += `<div style="font-size:11px; color:#aab; margin-left:4px; margin-bottom:2px;"><strong>${k}:</strong> ${valStr}</div>`;
        }
      }
      html += `</div>`;
    }

    this._elements.inspectorContent.innerHTML = html;

    // Attach change listeners to editable inputs
    this._elements.inspectorContent.querySelectorAll('.echo-prop-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const comp = input.getAttribute('data-comp');
        const prop = input.getAttribute('data-prop');
        const val = parseFloat(input.value);
        if (this.inspector) {
          this.inspector.setProperty(eid, comp, prop, val);
        }
      });
    });
  }

  /**
   * Refreshes the HAOS Profiler metrics.
   */
  refreshProfiler() {
    const haos = this.framework.serviceRegistry?.get('haos');
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
