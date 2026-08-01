/**
 * src/framework/runtime/errors/MissingDependencyError.js
 *
 * Echo Engine — Missing Dependency Error
 *
 * Thrown when a required dependency is missing or invalid during runtime construction.
 */

import { RuntimeError } from './RuntimeError.js';

export class MissingDependencyError extends RuntimeError {
    /**
     * @param {string} message - Error message
     * @param {Object} [options] - Error options
     * @param {*} [options.cause] - Underlying cause
     * @param {string} [options.code] - Error code
     * @param {string} [options.severity] - Error severity
     */
    constructor(message, options = {}) {
        super(message, options);
        this.name = 'MissingDependencyError';
    }
}