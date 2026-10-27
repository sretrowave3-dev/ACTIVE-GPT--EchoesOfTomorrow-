// src/network/NetworkReplicator.js

/**
 * @fileoverview NetworkReplicator provides authoritative entity state replication,
 * delta compression, dirty-checking, and Remote Procedure Call (RPC) dispatching
 * inspired by Unreal Engine's replication system.
 */

export const NetworkRole = {
  NONE: 'ROLE_NONE',
  SIMULATED_PROXY: 'ROLE_SIMULATED_PROXY',
  AUTONOMOUS_PROXY: 'ROLE_AUTONOMOUS_PROXY',
  AUTHORITY: 'ROLE_AUTHORITY'
};

export const RPCType = {
  SERVER: 'SERVER_RPC',
  CLIENT: 'CLIENT_RPC',
  MULTICAST: 'MULTICAST_RPC'
};

/**
 * @typedef {Object} ReplicatedEntity
 * @property {string} netId - Global unique network ID.
 * @property {string} role - NetworkRole enum value.
 * @property {string} ownerId - Client identifier that owns this entity ('server' or client ID).
 * @property {Record<string, any>} state - Active replicated state.
 * @property {Record<string, any>} lastAckState - Last acknowledged replicated state for delta compression.
 */

export class NetworkReplicator {
  /**
   * @param {import('./NetworkDriver.js').NetworkDriver} driver
   * @param {boolean} [isServer=true]
   */
  constructor(driver, isServer = true) {
    this.driver = driver;
    this.isServer = isServer;

    /** @type {Map<string, ReplicatedEntity>} Registered network entities */
    this.entities = new Map();

    /** @type {Map<string, Function>} Registered RPC callback handlers */
    this.rpcHandlers = new Map();

    this._nextNetId = 1000;

    // Set up channel listeners on driver
    this._setupDriverListeners();
  }

  /**
   * Register RPC listeners and state delta channels on the network driver.
   * @private
   */
  _setupDriverListeners() {
    // Listen for delta state updates
    this.driver.subscribe('replicated_state', packet => {
      this._handleStateDelta(packet.payload);
    });

    // Listen for RPC invocations
    this.driver.subscribe('rpc', packet => {
      this._handleRPC(packet);
    });
  }

  /**
   * Register a new entity for network replication.
   * @param {string} [customNetId]
   * @param {string} [role=NetworkRole.SIMULATED_PROXY]
   * @param {string} [ownerId='server']
   * @param {Record<string, any>} [initialState={}]
   * @returns {string} The assigned netId.
   */
  registerEntity(customNetId, role = NetworkRole.SIMULATED_PROXY, ownerId = 'server', initialState = {}) {
    const netId = customNetId || `NET_${++this._nextNetId}`;

    this.entities.set(netId, {
      netId,
      role,
      ownerId,
      state: { ...initialState },
      lastAckState: {}
    });

    return netId;
  }

  /**
   * Unregister an entity from replication.
   * @param {string} netId
   */
  unregisterEntity(netId) {
    this.entities.delete(netId);
  }

  /**
   * Update entity state properties locally.
   * @param {string} netId
   * @param {Record<string, any>} updates
   */
  updateEntityState(netId, updates) {
    const ent = this.entities.get(netId);
    if (!ent) return;

    for (const [key, val] of Object.entries(updates)) {
      ent.state[key] = Array.isArray(val) ? [...val] : val;
    }
  }

  /**
   * Retrieve current state for an entity.
   * @param {string} netId
   * @returns {Record<string, any>|null}
   */
  getEntityState(netId) {
    const ent = this.entities.get(netId);
    return ent ? { ...ent.state } : null;
  }

  /**
   * Compute delta compressed packet of changed fields for all replicated entities.
   * Generates a packet containing ONLY modified fields compared to `lastAckState`.
   * @returns {Array<{ netId: string, delta: Record<string, any> }>}
   */
  generateStateDeltas() {
    const deltas = [];

    for (const [netId, ent] of this.entities) {
      const delta = {};
      let hasChanges = false;

      for (const [key, val] of Object.entries(ent.state)) {
        const lastVal = ent.lastAckState[key];

        if (this._isDifferent(val, lastVal)) {
          delta[key] = Array.isArray(val) ? [...val] : val;
          ent.lastAckState[key] = Array.isArray(val) ? [...val] : val;
          hasChanges = true;
        }
      }

      if (hasChanges) {
        deltas.push({ netId, delta });
      }
    }

    return deltas;
  }

  /**
   * Send replicated state deltas across the network driver.
   * @param {number} [nowMs=Date.now()]
   * @returns {number} Number of entities with replicated delta changes.
   */
  replicateState(nowMs = Date.now()) {
    const deltas = this.generateStateDeltas();
    if (deltas.length > 0) {
      this.driver.send('replicated_state', { timestamp: nowMs, deltas }, nowMs);
    }
    return deltas.length;
  }

  /**
   * Handle incoming replicated state delta packets.
   * @param {Object} payload
   * @private
   */
  _handleStateDelta(payload) {
    if (!payload || !Array.isArray(payload.deltas)) return;

    for (let i = 0; i < payload.deltas.length; i++) {
      const { netId, delta } = payload.deltas[i];
      let ent = this.entities.get(netId);

      // Auto-register if not known on client
      if (!ent) {
        this.registerEntity(netId, NetworkRole.SIMULATED_PROXY, 'server', delta);
      } else {
        // Apply delta
        for (const [key, val] of Object.entries(delta)) {
          ent.state[key] = Array.isArray(val) ? [...val] : val;
        }
      }
    }
  }

  /**
   * Compare two values for deep equality (primitives or 1D arrays).
   * @private
   */
  _isDifferent(a, b) {
    if (a === b) return false;
    if (a === undefined || b === undefined) return true;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return true;
      for (let i = 0; i < a.length; i++) {
        if (Math.abs(a[i] - b[i]) > 0.0001) return true;
      }
      return false;
    }
    return true;
  }

  /**
   * Register a Remote Procedure Call (RPC) handler.
   * @param {string} rpcName
   * @param {(senderId: string, payload: any) => void} handler
   */
  registerRPC(rpcName, handler) {
    this.rpcHandlers.set(rpcName, handler);
  }

  /**
   * Call a Server RPC (from client to server).
   * @param {string} rpcName
   * @param {any} payload
   */
  callServerRPC(rpcName, payload) {
    this.driver.send('rpc', {
      type: RPCType.SERVER,
      rpcName,
      payload
    }, Date.now(), 'server');
  }

  /**
   * Call a Multicast RPC (from server to all connected clients).
   * @param {string} rpcName
   * @param {any} payload
   */
  callMulticastRPC(rpcName, payload) {
    this.driver.send('rpc', {
      type: RPCType.MULTICAST,
      rpcName,
      payload
    }, Date.now(), 'broadcast');
  }

  /**
   * Handle incoming RPC packet and execute registered callback.
   * @private
   */
  _handleRPC(packet) {
    const { rpcName, payload } = packet.payload || {};
    if (!rpcName) return;

    const handler = this.rpcHandlers.get(rpcName);
    if (handler) {
      handler(packet.senderId, payload);
    }
  }
}
