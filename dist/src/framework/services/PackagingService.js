// src/framework/services/PackagingService.js
import { Service } from './Service.js';
import { VirtualFileSystem } from '../../packaging/VirtualFileSystem.js';
import { IntegrityVerifier } from '../../packaging/IntegrityVerifier.js';
import { PackageManifest } from '../../packaging/PackageManifest.js';

/**
 * PackagingService coordinates virtual file system resolution, cryptographic integrity
 * validation, and distribution bundle management for the Echo Engine runtime.
 * Conforms to EDD Chapter 25 (Security, Packaging & Deployment Architecture).
 */
export class PackagingService extends Service {
  /**
   * @param {import('../core/Framework.js').Framework} framework
   */
  constructor(framework) {
    super('packaging', framework);
    this.vfs = new VirtualFileSystem();
    this.verifier = IntegrityVerifier;
    this.activeManifest = null;
  }

  /** @override */
  async initialize() {
    // Mount default VFS virtual routes
    this.vfs.mount('vfs://levels/', './assets/levels/');
    this.vfs.mount('vfs://assets/', './assets/');
  }

  /** @override */
  async start() {
    console.log('[PackagingService] Started with active Virtual File System (VFS) and SHA-256 integrity verifier.');
  }

  /**
   * Resolves a virtual URI through the VFS.
   * @param {string} uri
   * @returns {string}
   */
  resolve(uri) {
    return this.vfs.resolvePath(uri);
  }

  /**
   * Reads data via VFS with optional integrity hash verification.
   * @param {string} uri
   * @param {string} [expectedHash]
   * @param {'json'|'text'|'arrayBuffer'} [format='json']
   * @returns {Promise<any>}
   */
  async loadAsset(uri, expectedHash = null, format = 'json') {
    const data = await this.vfs.read(uri, format);
    if (expectedHash && data) {
      const isValid = await this.verifier.verify(typeof data === 'object' ? JSON.stringify(data) : data, expectedHash);
      if (!isValid) {
        throw new Error(`[PackagingService] Integrity verification failed for: ${uri}`);
      }
    }
    return data;
  }

  /**
   * Loads and validates a distribution package manifest.
   * @param {Object|string} manifestData
   */
  loadManifest(manifestData) {
    this.activeManifest = PackageManifest.parse(manifestData);
    console.log(`[PackagingService] Loaded package manifest for "${this.activeManifest.game.title}" v${this.activeManifest.game.version}`);
  }

  /** @override */
  async shutdown() {
    this.vfs.clearCache();
    this.activeManifest = null;
  }
}
