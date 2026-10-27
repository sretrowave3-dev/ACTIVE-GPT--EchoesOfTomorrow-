/**
 * src/framework/runtime/errors/RuntimeStateError.js
 *
 * Echo Engine — Runtime State Error
 *
 * Thrown when an invalid state transition occurs.
 * (Placeholder for future use.)
 */

import { RuntimeError } from './RuntimeError.js';

export class RuntimeStateError extends RuntimeError {
    /**
     * @param {string} message - Error message
     * @param {Object} [options] - Error options
     * @param {*} [options.cause] - Underlying cause
     * @param {string} [options.code] - Error code
     * @param {string} [options.severity] - Error severity
     */
    constructor(message, options = {}) {
        super(message, options);
        this.name = 'RuntimeStateError';
    }
}