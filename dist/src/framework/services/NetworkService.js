// src/framework/services/NetworkService.js
import { Service } from './Service.js';
import { NetworkDriver } from '../../network/NetworkDriver.js';
import { SnapshotInterpolator } from '../../network/SnapshotInterpolator.js';
import { ClientPrediction } from '../../network/ClientPrediction.js';
import { NetworkReplicator, NetworkRole } from '../../network/NetworkReplicator.js';

/**
 * NetworkService manages the multiplayer transport layer, state replication,
 * client-side prediction, and remote entity snapshot interpolation.
 * Conforms to Unreal Engine NetDriver / Replication architecture.
 */
export class NetworkService extends Service {
  /**
   * @param {import('../core/Framework.js').Framework} framework
   * @param {Object} [options]
   */
  constructor(framework, options = {}) {
    super('network', framework);

    this.driver = new NetworkDriver(options);
    this.interpolator = new SnapshotInterpolator(options);
    this.prediction = new ClientPrediction(options);
    this.replicator = new NetworkReplicator(this.driver, true);

    this.isServer = true;
    this.replicationIntervalMs = options.replicationIntervalMs ?? 50; // 20Hz default replication rate
    this._lastReplicationTime = 0;
  }

  /** @override */
  async initialize() {
    console.log('[NetworkService] Initializing Unreal-grade networking pipeline...');
  }

  /** @override */
  async start() {
    console.log('[NetworkService] Network transport, prediction, and replicator active.');
  }

  /**
   * Configure simulated network parameters (ping, jitter, loss).
   * @param {Object} params
   * @param {number} [params.latencyMs]
   * @param {number} [params.jitterMs]
   * @param {number} [params.packetLossRate]
   */
  setSimulationParams(params) {
    this.driver.setDegradationConfig(params);
  }

  /**
   * Frame update. Processes incoming network packets, evaluates interpolations,
   * and triggers authoritative delta replication ticks.
   * @param {number} dt - Frame delta time in seconds.
   */
  update(dt) {
    const now = Date.now();

    // 1. Process and deliver pending network packets
    this.driver.update(now);

    // 2. Server delta replication tick
    if (this.isServer && (now - this._lastReplicationTime >= this.replicationIntervalMs)) {
      this.replicator.replicateState(now);
      this._lastReplicationTime = now;
    }
  }

  /**
   * Register an entity for replication across the network.
   * @param {string} [netId]
   * @param {string} [role=NetworkRole.SIMULATED_PROXY]
   * @param {Record<string, any>} [initialState={}]
   * @returns {string} NetID
   */
  registerEntity(netId, role = NetworkRole.SIMULATED_PROXY, initialState = {}) {
    return this.replicator.registerEntity(netId, role, this.isServer ? 'server' : 'client', initialState);
  }

  /**
   * Record a snapshot for a remote entity in the interpolator.
   * @param {string} netId
   * @param {import('../../network/SnapshotInterpolator.js').EntitySnapshot} snapshot
   */
  pushSnapshot(netId, snapshot) {
    this.interpolator.pushSnapshot(netId, snapshot);
  }

  /**
   * Sample smooth interpolated transform for a remote entity.
   * @param {string} netId
   * @param {number} [serverTimeMs=Date.now()]
   */
  sampleEntityTransform(netId, serverTimeMs = Date.now()) {
    return this.interpolator.sample(netId, serverTimeMs);
  }

  /**
   * Execute client-side predicted movement step.
   * @param {Object} inputs
   * @param {number} dt
   * @param {Function} stepFn
   */
  predictMovement(inputs, dt, stepFn) {
    return this.prediction.predict(inputs, dt, stepFn);
  }

  /**
   * Reconcile client movement state against authoritative server packet.
   * @param {import('../../network/ClientPrediction.js').ServerStateUpdate} serverState
   * @param {Function} stepFn
   */
  reconcileMovement(serverState, stepFn) {
    const result = this.prediction.reconcile(serverState, stepFn);
    if (result.reconciled && this.framework?.eventBus) {
      this.framework.eventBus.publish('network:reconciled', result);
    }
    return result;
  }

  /**
   * Register an RPC handler.
   * @param {string} rpcName
   * @param {(senderId: string, payload: any) => void} handler
   */
  registerRPC(rpcName, handler) {
    this.replicator.registerRPC(rpcName, handler);
  }

  /**
   * Send a Server RPC from client to server.
   * @param {string} rpcName
   * @param {any} payload
   */
  callServerRPC(rpcName, payload) {
    this.replicator.callServerRPC(rpcName, payload);
  }

  /**
   * Send a Multicast RPC to all clients.
   * @param {string} rpcName
   * @param {any} payload
   */
  callMulticastRPC(rpcName, payload) {
    this.replicator.callMulticastRPC(rpcName, payload);
  }

  /** @override */
  async shutdown() {
    this.driver.disconnect();
    this.interpolator.clear();
    console.log('[NetworkService] Shutdown complete.');
  }
}
