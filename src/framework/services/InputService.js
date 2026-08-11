import { Service } from './Service.js';

export class InputService extends Service {
    constructor(framework) {
        super('input', framework);
    }

    async initialize() {}
    async start() {}
    update(delta) {}
    async shutdown() {}
}
