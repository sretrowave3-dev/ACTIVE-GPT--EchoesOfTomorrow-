/**
 * src/framework/runtime/pipeline/PipelineResult.js
 *
 * Echo Engine — Pipeline Result
 *
 * Result of executing a frame pipeline.
 * Contains success flag, errors, stage results, and metadata.
 */

export class PipelineResult {
    /**
     * @param {Object} [options] - Result options
     * @param {boolean} [options.success] - Whether the pipeline succeeded
     * @param {Array<Error>} [options.errors] - Errors that occurred
     * @param {Array<Object>} [options.stageResults] - Results per stage
     * @param {Object} [options.data] - Additional data
     */
    constructor(options = {}) {
        /** @type {boolean} */
        this.success = options.success ?? true;

        /** @type {Error[]} */
        this.errors = options.errors ? [...options.errors] : [];

        /** @type {Array<{stage: string, result: *, timestamp: number}>} */
        this.stageResults = options.stageResults ? [...options.stageResults] : [];

        /** @type {Object} */
        this.data = options.data ? { ...options.data } : {};

        /** @type {number} */
        this.timestamp =  clock.now();
    }

    /**
     * Add an error to the result.
     * @param {Error} error - Error to add
     */
    addError(error) {
        this.errors.push(error);
        this.success = false;
    }

    /**
     * Add a stage result.
     * @param {string} stageName - Name of the stage
     * @param {*} result - Result data
     */
    addStageResult(stageName, result) {
        this.stageResults.push({
            stage: stageName,
            result,
            timestamp: performance.now()
        });
    }

    /**
     * Check if the pipeline succeeded.
     * @returns {boolean} True if no errors occurred
     */
    isSuccess() {
        return this.success;
    }

    /**
     * Get the first error if any.
     * @returns {Error|null} First error or null
     */
    getFirstError() {
        return this.errors.length > 0 ? this.errors[0] : null;
    }

    /**
     * Get all errors.
     * @returns {Error[]} All errors
     */
    getErrors() {
        return [...this.errors];
    }
}