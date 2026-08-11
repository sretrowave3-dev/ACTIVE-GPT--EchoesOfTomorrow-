import { Service } from './Service.js';

export class UIService extends Service {
    constructor(framework) {
        super('ui', framework);
    }

    async initialize() {}
    async start() {}
    update(delta) {}
    async shutdown() {}
}
