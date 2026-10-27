/**
 * src/framework/runtime/errors/RuntimeSessionError.js
 *
 * Echo Engine — Runtime Session Error
 *
 * Thrown when a RuntimeSession operation fails.
 * (Placeholder for future use.)
 */

import { RuntimeError } from './RuntimeError.js';

export class RuntimeSessionError extends RuntimeError {
    /**
     * @param {string} message - Error message
     * @param {Object} [options] - Error options
     * @param {*} [options.cause] - Underlying cause
     * @param {string} [options.code] - Error code
     * @param {string} [options.severity] - Error severity
     */
    constructor(message, options = {}) {
        super(message, options);
        this.name = 'RuntimeSessionError';
    }
}