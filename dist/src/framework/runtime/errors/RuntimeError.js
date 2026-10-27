/**
 * src/framework/runtime/errors/RuntimeError.js
 *
 * Echo Engine — Runtime Error Base
 */

export class RuntimeError extends Error {
    constructor(message, options = {}) {
        super(message);
        this.name = 'RuntimeError';
        this.severity = options.severity || 'error';
        if (options.cause) this.cause = options.cause;
        if (options.code) this.code = options.code;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}