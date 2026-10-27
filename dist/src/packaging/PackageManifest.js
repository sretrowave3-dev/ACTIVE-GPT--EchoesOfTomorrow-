// src/packaging/PackageManifest.js

/**
 * PackageManifest manages distribution package metadata, asset file tables,
 * and cryptographic integrity signatures.
 * Conforms to EDD Chapter 25 §8 (Manifest Generation).
 */
export class PackageManifest {
  /**
   * @param {string} [gameTitle='Echoes of Tomorrow']
   * @param {string} [version='1.0.0']
   */
  constructor(gameTitle = 'Echoes of Tomorrow', version = '1.0.0') {
    this.game = {
      title: gameTitle,
      version: version,
      buildTimestamp: new Date().toISOString()
    };

    this.engine = {
      name: 'Echo Engine',
      version: '1.0.0',
      targetPlatform: 'web'
    };

    this.levels = [
      'sector_omega.json',
      'sector_pinnacle.json'
    ];

    /** @type {Record<string, { size: number, sha256: string, type: string }>} */
    this.files = {};
  }

  /**
   * Registers a file descriptor in the manifest.
   * @param {string} relativePath
   * @param {number} sizeBytes
   * @param {string} sha256
   * @param {string} [type='asset']
   */
  addFile(relativePath, sizeBytes, sha256, type = 'asset') {
    this.files[relativePath] = {
      size: sizeBytes,
      sha256,
      type
    };
  }

  /**
   * Serializes manifest to JSON formatted string.
   * @returns {string}
   */
  serialize() {
    return JSON.stringify(
      {
        game: this.game,
        engine: this.engine,
        levels: this.levels,
        files: this.files
      },
      null,
      2
    );
  }

  /**
   * Parses a JSON string into a PackageManifest instance.
   * @param {string|Object} input
   * @returns {PackageManifest}
   */
  static parse(input) {
    const data = typeof input === 'string' ? JSON.parse(input) : input;
    const manifest = new PackageManifest(data.game?.title, data.game?.version);
    if (data.game) Object.assign(manifest.game, data.game);
    if (data.engine) Object.assign(manifest.engine, data.engine);
    if (Array.isArray(data.levels)) manifest.levels = [...data.levels];
    if (data.files) manifest.files = { ...data.files };
    return manifest;
  }
}
