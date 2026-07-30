/**
 * Echo Sandbox — Animation Adapter
 *
 * Queries Animation state and provides structured data
 * about the animation system.
 */

import { EngineAdapter } from './EngineAdapter.js';

export class AnimationAdapter extends EngineAdapter {
    constructor(framework) {
        super(framework);
        this._animationSystems = [];
        this._initAnimation();
    }

    /**
     * Initialize animation references.
     * @private
     */
    _initAnimation() {
        // Animation systems are inside ECS
        const ecsService = this.getService('ecs');
        if (ecsService && ecsService.scheduler) {
            this._animationSystems = (ecsService.scheduler.systems || [])
                .filter(s => s.constructor.name === 'AnimationSystem' ||
                            s.constructor.name.includes('Animation'));
        }
    }

    /**
     * Get animation status.
     * @returns {Object} Animation status
     */
    getStatus() {
        this._initAnimation();
        return {
            ready: this._animationSystems.length > 0,
            systemCount: this._animationSystems.length,
            systemNames: this._animationSystems.map(s => s.constructor.name)
        };
    }

    /**
     * Get animation system details.
     * @returns {Object} Animation system details
     */
    getSystemDetails() {
        this._initAnimation();
        if (this._animationSystems.length === 0) {
            return { active: false, systems: [] };
        }

        return {
            active: true,
            systems: this._animationSystems.map(system => ({
                name: system.constructor.name,
                enabled: system.isEnabled ? system.isEnabled() : true,
                priority: system.priority || 0,
                // Check if system has a required signature
                requiredSignature: system.requiredSignature ? true : false
            }))
        };
    }

    /**
     * Check if animation is actively playing.
     * @returns {boolean} True if animation is active
     */
    isActive() {
        return this._animationSystems.some(s => s.isEnabled ? s.isEnabled() : true);
    }

    /**
     * Get animation component count.
     * @returns {number} Number of animation components
     */
    getComponentCount() {
        const ecsService = this.getService('ecs');
        if (!ecsService || !ecsService.ecsManager) return 0;

        const ecs = ecsService.ecsManager;
        const typeId = ecs.getTypeId('Animation');
        if (typeId === undefined) return 0;

        const store = ecs.getStore(typeId);
        return store?.count?.() || 0;
    }

    /**
     * Refresh animation references.
     * @returns {Array} Animation systems
     */
    refresh() {
        this._initAnimation();
        return this._animationSystems;
    }
}

