import { RuntimeError } from './RuntimeError.js';

/**
 * Represents an error thrown due to invalid or inconsistent runtime configuration.
 * 
 * @class RuntimeConfigurationError
 * @extends {RuntimeError}
 */
export class RuntimeConfigurationError extends RuntimeError {
    /**
     * Creates an instance of RuntimeConfigurationError.
     * 
     * @param {string} message - The error message.
     */
    constructor(message) {
        super(message);
        this.name = 'RuntimeConfigurationError';
    }
}