// src/animation/graph/BlendTree.js
import { GraphNode } from './GraphNode.js';

/**
 * BlendTree evaluates linear and multi-directional blend spaces (1D and 2D),
 * computing continuous interpolation weights between locomotion animation clips.
 * Conforms to EDD Volume V (Animation System & Blend Spaces).
 */
export class BlendTree extends GraphNode {
  /**
   * @param {string} name
   * @param {'1D'|'2D'} [type='1D']
   * @param {string} [parameterX='speed']
   * @param {string} [parameterY='strafe']
   */
  constructor(name, type = '1D', parameterX = 'speed', parameterY = 'strafe') {
    super(name);
    this.type = type;
    this.parameterX = parameterX;
    this.parameterY = parameterY;

    /** @type {Array<{ clipName: string, x: number, y: number }>} Sample points */
    this.samples = [];
  }

  /**
   * Adds a sample point to the blend space.
   * @param {string} clipName
   * @param {number} x
   * @param {number} [y=0]
   */
  addSample(clipName, x, y = 0) {
    this.samples.push({ clipName, x, y });
    if (this.type === '1D') {
      this.samples.sort((a, b) => a.x - b.x);
    }
  }

  /**
   * Evaluates clip weights based on current input parameters.
   * @param {Record<string, any>} parameters
   * @returns {Array<{ clipName: string, weight: number }>}
   */
  evaluateWeights(parameters) {
    if (this.samples.length === 0) return [];
    if (this.samples.length === 1) return [{ clipName: this.samples[0].clipName, weight: 1.0 }];

    const valX = Number(parameters[this.parameterX] || 0);

    if (this.type === '1D') {
      // Clamped 1D piecewise linear interpolation
      if (valX <= this.samples[0].x) {
        return [{ clipName: this.samples[0].clipName, weight: 1.0 }];
      }
      const last = this.samples[this.samples.length - 1];
      if (valX >= last.x) {
        return [{ clipName: last.clipName, weight: 1.0 }];
      }

      for (let i = 0; i < this.samples.length - 1; i++) {
        const s0 = this.samples[i];
        const s1 = this.samples[i + 1];
        if (valX >= s0.x && valX <= s1.x) {
          const span = s1.x - s0.x;
          const factor = span > 1e-5 ? (valX - s0.x) / span : 0;
          return [
            { clipName: s0.clipName, weight: 1.0 - factor },
            { clipName: s1.clipName, weight: factor }
          ];
        }
      }
    }

    // 2D Inverse Distance Weighting (IDW)
    const valY = Number(parameters[this.parameterY] || 0);
    const weights = [];
    let totalInvDist = 0;

    for (const sample of this.samples) {
      const dx = valX - sample.x;
      const dy = valY - sample.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 1e-4) {
        // Exact match
        return [{ clipName: sample.clipName, weight: 1.0 }];
      }

      const invDist = 1.0 / dist;
      weights.push({ clipName: sample.clipName, invDist });
      totalInvDist += invDist;
    }

    return weights.map(w => ({
      clipName: w.clipName,
      weight: totalInvDist > 0 ? w.invDist / totalInvDist : 0
    }));
  }

  /**
   * @override
   * @param {Object} context
   */
  evaluate(context) {
    return {
      weights: this.evaluateWeights(context.parameters || {})
    };
  }
}
