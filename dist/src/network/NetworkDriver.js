// src/network/NetworkDriver.js

/**
 * @fileoverview NetworkDriver provides a high-fidelity virtual network transport
 * layer supporting bi-directional packet scheduling, latency simulation, jitter,
 * and packet loss modeling inspired by Unreal Engine's UNetDriver.
 */

/**
 * @typedef {Object} NetworkPacket
 * @property {number} id - Unique monotonic packet ID.
 * @property {string} channel - Channel identifier (e.g. 'unreliable', 'reliable', 'state', 'rpc').
 * @property {number} timestamp - Source transmission timestamp in milliseconds.
 * @property {number} deliverAt - Target delivery timestamp in milliseconds.
 * @property {string} senderId - Identifier of the sender node.
 * @property {string} recipientId - Identifier of target recipient ('server', client ID, or 'broadcast').
 * @property {any} payload - The message or delta payload.
 */

export class NetworkDriver {
  /**
   * @param {Object} [options]
   * @param {number} [options.latencyMs=0] - Base one-way simulation latency in milliseconds.
   * @param {number} [options.jitterMs=0] - Maximum random latency variation in milliseconds.
   * @param {number} [options.packetLossRate=0] - Fractional packet drop probability (0.0 - 1.0).
   * @param {string} [options.nodeId='local'] - Identifier of this local endpoint.
   */
  constructor(options = {}) {
    this.latencyMs = options.latencyMs ?? 0;
    this.jitterMs = options.jitterMs ?? 0;
    this.packetLossRate = options.packetLossRate ?? 0;
    this.nodeId = options.nodeId ?? 'local';

    /** @type {NetworkPacket[]} In-flight packets waiting for scheduled delivery. */
    this._packetQueue = [];

    /** @type {Map<string, Function[]>} Registered packet channel listeners. */
    this._channelListeners = new Map();

    /** @type {NetworkDriver|null} Direct linked peer driver for zero-overhead loopback testing. */
    this._peerDriver = null;

    this._packetSequence = 0;
    this._connected = false;
    this._stats = {
      packetsSent: 0,
      packetsReceived: 0,
      packetsDropped: 0,
      bytesTransferred: 0
    };
  }

  /**
   * Connect this driver to a peer driver (e.g. Server <-> Client loopback connection).
   * @param {NetworkDriver} peer
   */
  connectPeer(peer) {
    this._peerDriver = peer;
    this._connected = true;
    peer._peerDriver = this;
    peer._connected = true;
  }

  /**
   * Disconnect the driver.
   */
  disconnect() {
    this._connected = false;
    if (this._peerDriver) {
      this._peerDriver._connected = false;
      this._peerDriver._peerDriver = null;
      this._peerDriver = null;
    }
    this._packetQueue.length = 0;
  }

  /**
   * @returns {boolean} Whether the driver is connected to a peer or host.
   */
  isConnected() {
    return this._connected;
  }

  /**
   * Subscribe a callback to receive packets on a specific channel.
   * @param {string} channel
   * @param {(packet: NetworkPacket) => void} callback
   */
  subscribe(channel, callback) {
    if (!this._channelListeners.has(channel)) {
      this._channelListeners.set(channel, []);
    }
    this._channelListeners.get(channel).push(callback);
  }

  /**
   * Unsubscribe a callback from a channel.
   * @param {string} channel
   * @param {(packet: NetworkPacket) => void} callback
   */
  unsubscribe(channel, callback) {
    const list = this._channelListeners.get(channel);
    if (!list) return;
    const idx = list.indexOf(callback);
    if (idx !== -1) list.splice(idx, 1);
  }

  /**
   * Configure simulated network degradation parameters.
   * @param {Object} config
   * @param {number} [config.latencyMs]
   * @param {number} [config.jitterMs]
   * @param {number} [config.packetLossRate]
   */
  setDegradationConfig(config) {
    if (config.latencyMs !== undefined) this.latencyMs = Math.max(0, config.latencyMs);
    if (config.jitterMs !== undefined) this.jitterMs = Math.max(0, config.jitterMs);
    if (config.packetLossRate !== undefined) this.packetLossRate = Math.min(1.0, Math.max(0, config.packetLossRate));
  }

  /**
   * Transmit a packet across the network to the peer driver or delivery queue.
   * @param {string} channel - Channel name (e.g. 'state', 'rpc', 'input').
   * @param {any} payload - Serializable data payload.
   * @param {number} [nowMs=Date.now()] - Current simulation time in milliseconds.
   * @param {string} [recipientId='peer']
   * @returns {NetworkPacket|null} The sent packet, or null if dropped by packet loss simulation.
   */
  send(channel, payload, nowMs = Date.now(), recipientId = 'peer') {
    this._stats.packetsSent++;

    // Packet loss simulation
    if (this.packetLossRate > 0 && Math.random() < this.packetLossRate) {
      this._stats.packetsDropped++;
      return null;
    }

    // Jitter calculation
    const jitterOffset = this.jitterMs > 0 ? (Math.random() - 0.5) * 2 * this.jitterMs : 0;
    const delay = Math.max(0, this.latencyMs + jitterOffset);
    const deliverAt = nowMs + delay;

    /** @type {NetworkPacket} */
    const packet = {
      id: ++this._packetSequence,
      channel,
      timestamp: nowMs,
      deliverAt,
      senderId: this.nodeId,
      recipientId,
      payload
    };

    // If connected to a peer driver, enqueue the packet into the peer's incoming queue
    if (this._peerDriver) {
      this._peerDriver._enqueueIncoming(packet);
    } else {
      // Local loopback into own queue
      this._enqueueIncoming(packet);
    }

    return packet;
  }

  /**
   * Internal queue receiver.
   * @param {NetworkPacket} packet
   * @private
   */
  _enqueueIncoming(packet) {
    this._packetQueue.push(packet);
  }

  /**
   * Process all incoming packets that are ready for delivery at time `nowMs`.
   * @param {number} [nowMs=Date.now()] - Current simulation time in milliseconds.
   * @returns {NetworkPacket[]} Array of delivered packets in this update tick.
   */
  update(nowMs = Date.now()) {
    if (this._packetQueue.length === 0) return [];

    const readyPackets = [];
    const remainingPackets = [];

    for (let i = 0; i < this._packetQueue.length; i++) {
      const packet = this._packetQueue[i];
      if (packet.deliverAt <= nowMs) {
        readyPackets.push(packet);
      } else {
        remainingPackets.push(packet);
      }
    }

    this._packetQueue = remainingPackets;

    // Dispatch ready packets to channel listeners
    for (let i = 0; i < readyPackets.length; i++) {
      const packet = readyPackets[i];
      this._stats.packetsReceived++;

      const listeners = this._channelListeners.get(packet.channel);
      if (listeners && listeners.length > 0) {
        for (let j = 0; j < listeners.length; j++) {
          listeners[j](packet);
        }
      }

      // Also dispatch to catch-all wildcard '*' listeners
      const wildcardListeners = this._channelListeners.get('*');
      if (wildcardListeners) {
        for (let j = 0; j < wildcardListeners.length; j++) {
          wildcardListeners[j](packet);
        }
      }
    }

    return readyPackets;
  }

  /**
   * @returns {Object} Network statistics.
   */
  getStats() {
    return { ...this._stats, queuedPackets: this._packetQueue.length };
  }

  /**
   * Reset stats counters.
   */
  resetStats() {
    this._stats.packetsSent = 0;
    this._stats.packetsReceived = 0;
    this._stats.packetsDropped = 0;
    this._stats.bytesTransferred = 0;
  }
}
