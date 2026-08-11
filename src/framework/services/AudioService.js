import { Service } from './Service.js';

export class AudioService extends Service {
    constructor(framework) {
        super('audio', framework);
    }

    async initialize() {}
    async start() {}
    update(delta) {}
    async shutdown() {}
}
