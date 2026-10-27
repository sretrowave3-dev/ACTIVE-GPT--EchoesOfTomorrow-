// src/ui/UIManager.js

/**
 * UIManager handles the DOM UI overlay hierarchy, HUD telemetry,
 * interactive prompts, mission trackers, and pause menu dialogs.
 * Conforms to EDD Chapter 21 (User Interface & User Experience Framework).
 */
export class UIManager {
  /**
   * @param {import('../framework/core/Framework.js').Framework} framework
   */
  constructor(framework) {
    this.framework = framework;
    this.isPaused = false;
    this._mounted = false;
    this._elements = {};
    this._notificationTimer = null;
    this._unsubscribers = [];
  }

  /**
   * Initializes DOM elements, stylesheet, and binds framework event listeners.
   */
  initialize() {
    if (typeof document === 'undefined') {
      return; // Headless environment
    }

    this._injectStyles();
    this._createDOM();
    this._bindEvents();
    this._mounted = true;
  }

  /**
   * Injects cybernetic style rules into the document head.
   * @private
   */
  _injectStyles() {
    if (document.getElementById('echo-ui-styles')) return;

    const style = document.createElement('style');
    style.id = 'echo-ui-styles';
    style.textContent = `
      :root {
        --echo-cyan: #00ffcc;
        --echo-cyan-glow: rgba(0, 255, 204, 0.4);
        --echo-red: #ff3366;
        --echo-red-glow: rgba(255, 51, 102, 0.4);
        --echo-gold: #ffcc00;
        --echo-dark: rgba(10, 15, 25, 0.85);
        --echo-border: rgba(0, 255, 204, 0.35);
      }

      /* HUD Root Container */
      #echo-hud-root {
        position: fixed;
        top: 0; left: 0;
        width: 100vw; height: 100vh;
        pointer-events: none;
        z-index: 100;
        font-family: 'Courier New', Courier, monospace;
        user-select: none;
      }

      /* Vitals Bar (Bottom-Left) */
      .echo-vitals-panel {
        position: absolute;
        bottom: 25px;
        left: 25px;
        width: 260px;
        background: var(--echo-dark);
        border: 1px solid var(--echo-border);
        padding: 12px 16px;
        backdrop-filter: blur(8px);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
        pointer-events: auto;
      }

      .echo-vitals-row {
        margin-bottom: 8px;
      }
      .echo-vitals-row:last-child {
        margin-bottom: 0;
      }

      .echo-bar-label {
        font-size: 11px;
        letter-spacing: 1.5px;
        color: #ccd;
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
        text-transform: uppercase;
      }

      .echo-bar-track {
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        overflow: hidden;
      }

      .echo-bar-fill {
        height: 100%;
        width: 100%;
        transition: width 0.15s ease-out;
      }

      .echo-bar-fill.health {
        background: linear-gradient(90deg, #ff3366, #00ffcc);
        box-shadow: 0 0 8px var(--echo-cyan-glow);
      }

      .echo-bar-fill.stamina {
        background: #00ffcc;
        box-shadow: 0 0 8px var(--echo-cyan-glow);
      }

      /* Objective Panel (Top-Right) */
      .echo-mission-panel {
        position: absolute;
        top: 25px;
        right: 25px;
        width: 320px;
        background: var(--echo-dark);
        border: 1px solid var(--echo-border);
        border-right: 3px solid var(--echo-cyan);
        padding: 14px 18px;
        backdrop-filter: blur(8px);
        color: #fff;
        pointer-events: auto;
      }

      .echo-mission-header {
        font-size: 10px;
        letter-spacing: 2px;
        color: var(--echo-cyan);
        text-transform: uppercase;
        margin-bottom: 6px;
      }

      .echo-mission-title {
        font-size: 13px;
        font-weight: bold;
        letter-spacing: 1px;
        color: #ffffff;
        margin-bottom: 10px;
      }

      .echo-mission-checklist {
        list-style: none;
        padding: 0;
        margin: 0;
        font-size: 12px;
      }

      .echo-mission-item {
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 8px;
        color: #aaa;
        transition: color 0.3s;
      }

      .echo-mission-item.active {
        color: #ffffff;
        font-weight: bold;
      }

      .echo-mission-item.completed {
        color: rgba(255, 255, 255, 0.4);
        text-decoration: line-through;
      }

      .echo-checkbox {
        width: 12px;
        height: 12px;
        border: 1px solid var(--echo-border);
        display: inline-block;
        position: relative;
      }

      .echo-mission-item.completed .echo-checkbox {
        background: var(--echo-cyan);
        border-color: var(--echo-cyan);
      }

      /* Center Interaction Prompt */
      .echo-prompt-container {
        position: absolute;
        top: 58%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--echo-dark);
        border: 1px solid var(--echo-cyan);
        padding: 10px 24px;
        color: #fff;
        font-size: 13px;
        letter-spacing: 1.5px;
        display: none;
        backdrop-filter: blur(8px);
        box-shadow: 0 0 15px var(--echo-cyan-glow);
        text-transform: uppercase;
        animation: pulsePrompt 1.5s infinite alternate ease-in-out;
      }

      @keyframes pulsePrompt {
        from { transform: translate(-50%, -50%) scale(1); box-shadow: 0 0 10px rgba(0, 255, 204, 0.3); }
        to { transform: translate(-50%, -50%) scale(1.03); box-shadow: 0 0 20px rgba(0, 255, 204, 0.8); }
      }

      /* Notification Banner (Top-Center) */
      .echo-banner-container {
        position: absolute;
        top: 30px;
        left: 50%;
        transform: translateX(-50%) translateY(-20px);
        background: rgba(5, 10, 20, 0.95);
        border: 1px solid var(--echo-gold);
        color: var(--echo-gold);
        padding: 12px 32px;
        font-size: 13px;
        letter-spacing: 2px;
        text-transform: uppercase;
        opacity: 0;
        transition: all 0.4s ease-out;
        pointer-events: none;
        box-shadow: 0 0 20px rgba(255, 204, 0, 0.3);
      }

      .echo-banner-container.visible {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }

      /* Pause Menu Modal */
      .echo-pause-modal {
        position: fixed;
        top: 0; left: 0;
        width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(10px);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 200;
        pointer-events: auto;
      }

      .echo-pause-dialog {
        background: var(--echo-dark);
        border: 1px solid var(--echo-cyan);
        padding: 36px 48px;
        text-align: center;
        box-shadow: 0 0 35px var(--echo-cyan-glow);
        width: 440px;
      }

      .echo-pause-title {
        font-size: 20px;
        letter-spacing: 4px;
        color: var(--echo-cyan);
        margin-bottom: 8px;
      }

      .echo-pause-sub {
        font-size: 11px;
        letter-spacing: 2px;
        color: #778;
        margin-bottom: 28px;
        text-transform: uppercase;
      }

      .echo-menu-button {
        width: 100%;
        padding: 12px;
        margin-bottom: 12px;
        background: rgba(0, 255, 204, 0.08);
        border: 1px solid var(--echo-border);
        color: #fff;
        font-family: inherit;
        font-size: 12px;
        letter-spacing: 2px;
        text-transform: uppercase;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .echo-menu-button:hover {
        background: var(--echo-cyan);
        color: #000;
        box-shadow: 0 0 12px var(--echo-cyan-glow);
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Constructs the HUD overlay hierarchy.
   * @private
   */
  _createDOM() {
    const existing = document.getElementById('echo-hud-root');
    if (existing) existing.remove();

    const hudRoot = document.createElement('div');
    hudRoot.id = 'echo-hud-root';

    // 1. Vitals Panel
    const vitalsPanel = document.createElement('div');
    vitalsPanel.className = 'echo-vitals-panel';
    vitalsPanel.innerHTML = `
      <div class="echo-vitals-row">
        <div class="echo-bar-label">
          <span>Integrity</span>
          <span id="echo-health-val">100%</span>
        </div>
        <div class="echo-bar-track">
          <div id="echo-health-fill" class="echo-bar-fill health" style="width: 100%;"></div>
        </div>
      </div>
      <div class="echo-vitals-row">
        <div class="echo-bar-label">
          <span>Stamina</span>
          <span id="echo-stamina-val">100%</span>
        </div>
        <div class="echo-bar-track">
          <div id="echo-stamina-fill" class="echo-bar-fill stamina" style="width: 100%;"></div>
        </div>
      </div>
    `;
    hudRoot.appendChild(vitalsPanel);

    // 2. Mission Panel
    const missionPanel = document.createElement('div');
    missionPanel.className = 'echo-mission-panel';
    missionPanel.innerHTML = `
      <div class="echo-mission-header">// ACTIVE MISSION OBJECTIVES</div>
      <div id="echo-mission-title" class="echo-mission-title">Chapter 1: Whispers in the Static</div>
      <ul id="echo-mission-checklist" class="echo-mission-checklist">
        <li class="echo-mission-item active"><span class="echo-checkbox"></span> Survey Sector Perimeter</li>
        <li class="echo-mission-item"><span class="echo-checkbox"></span> Recover Memory Fragment #01</li>
      </ul>
    `;
    hudRoot.appendChild(missionPanel);

    // 3. Center Interaction Prompt
    const promptContainer = document.createElement('div');
    promptContainer.id = 'echo-interaction-prompt';
    promptContainer.className = 'echo-prompt-container';
    promptContainer.textContent = 'PRESS [E] TO INTERACT';
    hudRoot.appendChild(promptContainer);

    // 4. Notification Banner
    const bannerContainer = document.createElement('div');
    bannerContainer.id = 'echo-banner-container';
    bannerContainer.className = 'echo-banner-container';
    bannerContainer.textContent = 'OBJECTIVE COMPLETE';
    hudRoot.appendChild(bannerContainer);

    // 5. Pause Menu Modal
    const pauseModal = document.createElement('div');
    pauseModal.id = 'echo-pause-modal';
    pauseModal.className = 'echo-pause-modal';
    pauseModal.innerHTML = `
      <div class="echo-pause-dialog">
        <div class="echo-pause-title">SYSTEM PAUSED</div>
        <div class="echo-pause-sub">Tactical Simulation Suspended</div>
        <button id="echo-btn-resume" class="echo-menu-button">Resume Simulation</button>
        <button id="echo-btn-quicksave" class="echo-menu-button">Quick Save [F5]</button>
        <button id="echo-btn-quickload" class="echo-menu-button">Quick Load [F9]</button>
      </div>
    `;
    hudRoot.appendChild(pauseModal);

    document.body.appendChild(hudRoot);

    // Cache element references
    this._elements = {
      root: hudRoot,
      healthVal: document.getElementById('echo-health-val'),
      healthFill: document.getElementById('echo-health-fill'),
      staminaVal: document.getElementById('echo-stamina-val'),
      staminaFill: document.getElementById('echo-stamina-fill'),
      missionTitle: document.getElementById('echo-mission-title'),
      missionChecklist: document.getElementById('echo-mission-checklist'),
      prompt: promptContainer,
      banner: bannerContainer,
      pauseModal: pauseModal,
      btnResume: document.getElementById('echo-btn-resume'),
      btnSave: document.getElementById('echo-btn-quicksave'),
      btnLoad: document.getElementById('echo-btn-quickload')
    };

    // Attach button actions
    this._elements.btnResume?.addEventListener('click', () => {
      this.togglePauseMenu(false);
      this._playUIClick();
    });

    this._elements.btnSave?.addEventListener('click', () => {
      this._playUIClick();
      const saveService = this.framework.serviceRegistry.get('save');
      if (saveService) {
        saveService.quickSave();
      } else {
        this.showNotification('SYSTEM: QUICK SAVE EXECUTED');
      }
    });

    this._elements.btnLoad?.addEventListener('click', () => {
      this._playUIClick();
      const saveService = this.framework.serviceRegistry.get('save');
      if (saveService) {
        saveService.quickLoad();
      } else {
        this.showNotification('SYSTEM: QUICK LOAD EXECUTED');
      }
    });

    // Keyboard listener for Pause toggle [Escape] or [KeyP]
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyP' || (e.code === 'Escape' && this.isPaused)) {
        this.togglePauseMenu(!this.isPaused);
      }
    });
  }

  /**
   * Binds framework EventBus events to HUD updates.
   * @private
   */
  _bindEvents() {
    const bus = this.framework.eventBus;
    if (!bus) return;

    // Vitals events
    const unsubHealth = bus.subscribe('player:health_changed', (sender, data) => {
      this.updateHealth(data.health, data.maxHealth);
    });

    const unsubStamina = bus.subscribe('player:stamina_changed', (sender, data) => {
      this.updateStamina(data.stamina, data.maxStamina);
    });

    // Interaction prompt events
    const unsubPrompt = bus.subscribe('interaction:prompt', (sender, data) => {
      this.showPrompt(data.prompt);
    });

    const unsubClear = bus.subscribe('interaction:clear', () => {
      this.hidePrompt();
    });

    // Mission events
    const unsubMission = bus.subscribe('mission:objective_completed', (sender, data) => {
      this.showNotification(`OBJECTIVE COMPLETED: ${data.title}`);
      this._playUIChime();
      this.refreshMissionList();
    });

    // Persistence events
    const unsubSaved = bus.subscribe('persistence:saved', (sender, data) => {
      this.showNotification(`QUICK SAVE CREATED [${data.slot || 'quicksave'}]`);
      this._playUIChime();
    });

    const unsubLoaded = bus.subscribe('persistence:loaded', (sender, data) => {
      this.showNotification(`STATE RESTORED FROM [${data.slot || 'quicksave'}]`);
      this._playUIChime();
      this.refreshMissionList();
    });

    // Narrative & Story events
    const unsubNarrative = bus.subscribe('narrative:log_unlocked', (sender, data) => {
      this.showNotification(`DATALOG DECRYPTED: ${data.title}`, 4500);
      this._playUIChime();
    });

    const unsubChapter = bus.subscribe('mission:chapter_loaded', (sender, data) => {
      this.showNotification(`NEW CHAPTER: ${data.title}`, 4000);
      this._playUIChime();
      this.refreshMissionList();
    });

    this._unsubscribers.push(
      unsubHealth, unsubStamina, unsubPrompt, unsubClear,
      unsubMission, unsubSaved, unsubLoaded, unsubNarrative, unsubChapter
    );
  }

  /**
   * Update health readout in HUD.
   * @param {number} current
   * @param {number} max
   */
  updateHealth(current, max) {
    if (!this._elements.healthFill) return;
    const ratio = Math.max(0, Math.min(1, current / max));
    const pct = Math.round(ratio * 100);
    this._elements.healthFill.style.width = `${pct}%`;
    if (this._elements.healthVal) {
      this._elements.healthVal.textContent = `${pct}%`;
    }
  }

  /**
   * Update stamina readout in HUD.
   * @param {number} current
   * @param {number} max
   */
  updateStamina(current, max) {
    if (!this._elements.staminaFill) return;
    const ratio = Math.max(0, Math.min(1, current / max));
    const pct = Math.round(ratio * 100);
    this._elements.staminaFill.style.width = `${pct}%`;
    if (this._elements.staminaVal) {
      this._elements.staminaVal.textContent = `${pct}%`;
    }
  }

  /**
   * Show interaction prompt message.
   * @param {string} promptText
   */
  showPrompt(promptText) {
    if (this._elements.prompt) {
      this._elements.prompt.textContent = promptText;
      this._elements.prompt.style.display = 'block';
    }
  }

  /**
   * Hide interaction prompt message.
   */
  hidePrompt() {
    if (this._elements.prompt) {
      this._elements.prompt.style.display = 'none';
    }
  }

  /**
   * Displays a temporary notification banner on screen.
   * @param {string} message
   * @param {number} [durationMs=3500]
   */
  showNotification(message, durationMs = 3500) {
    if (!this._elements.banner) return;

    this._elements.banner.textContent = message;
    this._elements.banner.classList.add('visible');

    if (this._notificationTimer) {
      clearTimeout(this._notificationTimer);
    }

    this._notificationTimer = setTimeout(() => {
      this._elements.banner?.classList.remove('visible');
      this._notificationTimer = null;
    }, durationMs);
  }

  /**
   * Refresh the mission tracker DOM from the active mission manager.
   */
  refreshMissionList() {
    const gameplayService = this.framework.serviceRegistry.get('gameplay');
    if (!gameplayService || !gameplayService.missionManager || !this._elements.missionChecklist) {
      return;
    }

    const mm = gameplayService.missionManager;
    if (this._elements.missionTitle) {
      this._elements.missionTitle.textContent = mm.missionTitle;
    }

    let html = '';
    for (const obj of mm.objectives) {
      const cls = obj.completed ? 'echo-mission-item completed' : 'echo-mission-item active';
      html += `<li class="${cls}"><span class="echo-checkbox"></span> ${obj.title}</li>`;
    }
    this._elements.missionChecklist.innerHTML = html;
  }

  /**
   * Toggle the Pause & System dialog.
   * @param {boolean} [forceState]
   */
  togglePauseMenu(forceState) {
    this.isPaused = (forceState !== undefined) ? forceState : !this.isPaused;
    if (this._elements.pauseModal) {
      this._elements.pauseModal.style.display = this.isPaused ? 'flex' : 'none';
    }

    const inputService = this.framework.serviceRegistry.get('input');
    if (this.isPaused) {
      // Exit pointer lock when paused so user can click menu buttons
      if (document.exitPointerLock) {
        document.exitPointerLock();
      }
    } else {
      // Resume pointer lock on canvas
      if (inputService) {
        inputService.requestPointerLock(document.body);
      }
    }
  }

  /**
   * Plays a UI click sound effect via AudioService.
   * @private
   */
  _playUIClick() {
    const audio = this.framework.serviceRegistry.get('audio');
    if (audio) audio.playSound('click', 0.6);
  }

  /**
   * Plays a UI chime sound effect via AudioService.
   * @private
   */
  _playUIChime() {
    const audio = this.framework.serviceRegistry.get('audio');
    if (audio) audio.playSound('chime', 0.8);
  }

  /**
   * Cleanup DOM elements and event subscriptions.
   */
  destroy() {
    if (this._notificationTimer) {
      clearTimeout(this._notificationTimer);
      this._notificationTimer = null;
    }

    for (const unsub of this._unsubscribers) {
      if (typeof unsub === 'function') unsub();
    }
    this._unsubscribers = [];

    if (this._elements.root && this._elements.root.parentNode) {
      this._elements.root.parentNode.removeChild(this._elements.root);
    }
    const style = document.getElementById('echo-ui-styles');
    if (style && style.parentNode) {
      style.parentNode.removeChild(style);
    }
    this._mounted = false;
  }
}
