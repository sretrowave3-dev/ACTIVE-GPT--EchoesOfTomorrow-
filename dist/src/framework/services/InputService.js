import { Service } from './Service.js';

/**
 * InputService provides device abstraction and action mapping for keyboard,
 * mouse, and pointer-lock state across the engine.
 * Conforms to EDD Chapter 22 (Input System & Device Abstraction).
 */
export class InputService extends Service {
  /**
   * @param {import('../core/Framework.js').Framework} framework
   */
  constructor(framework) {
    super('input', framework);

    /** @type {Set<string>} @private */
    this._keysDown = new Set();

    /** @type {Map<string, string[]>} @private */
    this._actionBindings = new Map([
      ['moveForward', ['KeyW', 'ArrowUp']],
      ['moveBackward', ['KeyS', 'ArrowDown']],
      ['moveLeft', ['KeyA', 'ArrowLeft']],
      ['moveRight', ['KeyD', 'ArrowRight']],
      ['jump', ['Space']],
      ['sprint', ['ShiftLeft', 'ShiftRight']],
      ['interact', ['KeyE']]
    ]);

    /** @type {number} @private */
    this._mouseDeltaX = 0;
    /** @type {number} @private */
    this._mouseDeltaY = 0;
    /** @type {number} @private */
    this._mouseX = 0;
    /** @type {number} @private */
    this._mouseY = 0;
    /** @type {boolean} @private */
    this._isPointerLocked = false;
    /** @type {HTMLElement|null} @private */
    this._lockTarget = null;

    // Bound event handlers
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onPointerLockChange = this._onPointerLockChange.bind(this);
  }

  /** @override */
  async initialize() {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
  }

  /** @override */
  async start() {
    console.log('[InputService] Initialized and listening for input.');
  }

  /**
   * Bind an action name to physical key codes.
   * @param {string} actionName
   * @param {string[]} keyCodes
   */
  bindAction(actionName, keyCodes) {
    this._actionBindings.set(actionName, [...keyCodes]);
  }

  /**
   * Checks whether a specific physical key code is currently held down.
   * @param {string} code
   * @returns {boolean}
   */
  isKeyDown(code) {
    return this._keysDown.has(code);
  }

  /**
   * Checks whether an abstract action is active.
   * @param {string} actionName
   * @returns {boolean}
   */
  isActionActive(actionName) {
    const bindings = this._actionBindings.get(actionName);
    if (!bindings) return false;
    for (let i = 0; i < bindings.length; i++) {
      if (this._keysDown.has(bindings[i])) {
        return true;
      }
    }
    return false;
  }

  /**
   * Retrieves accumulated mouse delta without clearing it.
   * @returns {{ x: number, y: number }}
   */
  getMouseDelta() {
    return { x: this._mouseDeltaX, y: this._mouseDeltaY };
  }

  /**
   * Consumes and returns the accumulated mouse delta, resetting it to zero for the next frame.
   * @returns {{ x: number, y: number }}
   */
  consumeMouseDelta() {
    const delta = { x: this._mouseDeltaX, y: this._mouseDeltaY };
    this._mouseDeltaX = 0;
    this._mouseDeltaY = 0;
    return delta;
  }

  /**
   * Checks whether the browser pointer lock is currently active.
   * @returns {boolean}
   */
  isPointerLocked() {
    return this._isPointerLocked;
  }

  /**
   * Requests pointer lock on the specified DOM element.
   * @param {HTMLElement} [element]
   */
  requestPointerLock(element = document.body) {
    this._lockTarget = element;
    if (element && typeof element.requestPointerLock === 'function') {
      element.requestPointerLock();
    }
  }

  /**
   * Exits pointer lock.
   */
  exitPointerLock() {
    if (typeof document !== 'undefined' && document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  /** @private */
  _onKeyDown(event) {
    this._keysDown.add(event.code);
    if (this.framework && this.framework.eventBus) {
      this.framework.eventBus.publish('input:keydown', this, { code: event.code });
    }
  }

  /** @private */
  _onKeyUp(event) {
    this._keysDown.delete(event.code);
    if (this.framework && this.framework.eventBus) {
      this.framework.eventBus.publish('input:keyup', this, { code: event.code });
    }
  }

  /** @private */
  _onMouseMove(event) {
    this._mouseX = event.clientX;
    this._mouseY = event.clientY;

    if (this._isPointerLocked) {
      this._mouseDeltaX += event.movementX || 0;
      this._mouseDeltaY += event.movementY || 0;
    }
  }

  /** @private */
  _onPointerLockChange() {
    this._isPointerLocked = (typeof document !== 'undefined') &&
      Boolean(document.pointerLockElement && (this._lockTarget === null || document.pointerLockElement === this._lockTarget));

    if (this.framework && this.framework.eventBus) {
      this.framework.eventBus.publish('input:pointerlockchange', this, {
        isLocked: this._isPointerLocked
      });
    }
  }

  /** @override */
  update(delta) {
    // Input phase processing: events are dispatched by EventBus in main loop
  }

  /** @override */
  async shutdown() {
    if (typeof window === 'undefined') return;

    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);

    this._keysDown.clear();
    this._mouseDeltaX = 0;
    this._mouseDeltaY = 0;
    this._isPointerLocked = false;
  }
}
