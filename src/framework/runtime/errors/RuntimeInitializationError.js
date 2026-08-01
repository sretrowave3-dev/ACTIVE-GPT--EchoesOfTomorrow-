/**
 * src/framework/runtime/errors/RuntimeInitializationError.js
 *
 * Echo Engine — Runtime Initialization Error
 *
 * Thrown when a runtime component fails to initialize.
 */

import { RuntimeError } from './RuntimeError.js';

export class RuntimeInitializationError extends RuntimeError {
    /**
     * @param {string} message - Error message
     * @param {Object} [options] - Error options
     * @param {*} [options.cause] - Underlying cause
     * @param {string} [options.code] - Error code
     * @param {string} [options.severity] - Error severity
     */
    constructor(message, options = {}) {
        super(message, options);
        this.name = 'RuntimeInitializationError';
    }
}