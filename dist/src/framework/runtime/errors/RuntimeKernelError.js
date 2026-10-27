/**
 * src/framework/runtime/errors/RuntimeKernelError.js
 *
 * Echo Engine — Runtime Kernel Error
 *
 * Thrown when a RuntimeKernel operation fails.
 */

import { RuntimeError } from './RuntimeError.js';

export class RuntimeKernelError extends RuntimeError {
    /**
     * @param {string} message - Error message
     * @param {Object} [options] - Error options
     * @param {*} [options.cause] - Underlying cause
     * @param {string} [options.code] - Error code
     * @param {string} [options.severity] - Error severity
     */
    constructor(message, options = {}) {
        super(message, options);
        this.name = 'RuntimeKernelError';
    }
}