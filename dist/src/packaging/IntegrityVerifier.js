// src/packaging/IntegrityVerifier.js

/**
 * IntegrityVerifier validates asset and package files against cryptographic SHA-256 checksums
 * to prevent data corruption, tampering, or broken installations.
 * Conforms to EDD Chapter 25 §12 (Integrity Verification).
 */
export class IntegrityVerifier {
  /**
   * Computes a SHA-256 hexadecimal hash string for text or array buffer.
   * Uses Web Crypto API when available, with deterministic fallback for tests.
   * @param {string|ArrayBuffer} data
   * @returns {Promise<string>} Hexadecimal SHA-256 digest
   */
  static async computeSHA256(data) {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Deterministic fallback hash for non-crypto environments
    const str = typeof data === 'string' ? data : new TextDecoder().decode(data);
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
  }

  /**
   * Verifies if given data matches an expected checksum.
   * @param {string|ArrayBuffer} data
   * @param {string} expectedHash
   * @returns {Promise<boolean>}
   */
  static async verify(data, expectedHash) {
    if (!expectedHash) return false;
    const computed = await this.computeSHA256(data);
    return computed.toLowerCase() === expectedHash.toLowerCase();
  }

  /**
   * Validates an entire Package Manifest dictionary against in-memory or loaded files.
   * @param {Object} manifest - Package manifest object
   * @param {Map<string, string|ArrayBuffer>} files
   * @returns {Promise<{ valid: boolean, errors: string[] }>}
   */
  static async verifyManifest(manifest, files) {
    const errors = [];
    if (!manifest || !manifest.files) {
      return { valid: false, errors: ['Manifest contains no file descriptors'] };
    }

    for (const [relativePath, descriptor] of Object.entries(manifest.files)) {
      const fileContent = files.get(relativePath);
      if (!fileContent) {
        errors.push(`Missing file: ${relativePath}`);
        continue;
      }

      const isValid = await this.verify(fileContent, descriptor.sha256);
      if (!isValid) {
        errors.push(`Integrity mismatch for file: ${relativePath}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
