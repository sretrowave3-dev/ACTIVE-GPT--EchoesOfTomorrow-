import { Service } from './Service.js';

export class PlayerService extends Service {
    constructor(framework) {
        super('player', framework);
    }

    async initialize() {}
    async start() {}
    update(delta) {}
    async shutdown() {}
}
