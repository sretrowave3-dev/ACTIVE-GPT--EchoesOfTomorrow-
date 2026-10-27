// src/haos/HardwareScanner.js

/**
 * HardwareScanner gathers raw hardware characteristics from the runtime environment
 * without making optimization decisions.
 * Conforms to EDD Chapter 13 §5 (Hardware Scanner).
 */
export class HardwareScanner {
  constructor() {
    this.hardwareInfo = null;
  }

  /**
   * Scans CPU, GPU, memory, display, and storage heuristics.
   * Defensive against headless/Node test environments.
   * @returns {Object} Raw hardware telemetry facts
   */
  scan() {
    const isBrowser = typeof window !== 'undefined' && typeof navigator !== 'undefined';

    // 1. CPU Heuristics
    const logicalCores = isBrowser ? (navigator.hardwareConcurrency || 4) : 4;

    // 2. Memory Heuristics (in Gigabytes)
    // navigator.deviceMemory is available in Chromium-based browsers; default to 8GB if unspecified
    const deviceMemoryGB = (isBrowser && 'deviceMemory' in navigator)
      ? Number(navigator.deviceMemory)
      : 8;

    // 3. Display & Resolution Heuristics
    const screenWidth = isBrowser && window.screen ? window.screen.width : 1920;
    const screenHeight = isBrowser && window.screen ? window.screen.height : 1080;
    const devicePixelRatio = isBrowser ? (window.devicePixelRatio || 1) : 1;

    // 4. GPU Heuristics via WebGL context inspection
    let gpuRenderer = 'Generic Hardware Accelerator';
    let gpuVendor = 'Generic Vendor';
    let maxTextureSize = 4096;
    let webgl2Supported = false;

    if (isBrowser && typeof document !== 'undefined') {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (gl) {
          webgl2Supported = (typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext);
          maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;

          const dbg = gl.getExtension('WEBGL_debug_renderer_info');
          if (dbg) {
            gpuRenderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || gpuRenderer;
            gpuVendor = gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || gpuVendor;
          }
        }
      } catch (e) {
        // Fallback silently if WebGL context creation fails
      }
    }

    this.hardwareInfo = {
      cpu: {
        logicalCores,
        architecture: 'x86_64/arm64'
      },
      memory: {
        systemRamGB: deviceMemoryGB
      },
      display: {
        width: screenWidth,
        height: screenHeight,
        pixelRatio: devicePixelRatio
      },
      gpu: {
        renderer: gpuRenderer,
        vendor: gpuVendor,
        maxTextureSize,
        webgl2Supported
      },
      timestamp: Date.now()
    };

    return this.hardwareInfo;
  }

  /**
   * Returns cached hardware facts or initiates a scan if not yet cached.
   * @returns {Object}
   */
  getHardwareInfo() {
    if (!this.hardwareInfo) {
      return this.scan();
    }
    return this.hardwareInfo;
  }
}
