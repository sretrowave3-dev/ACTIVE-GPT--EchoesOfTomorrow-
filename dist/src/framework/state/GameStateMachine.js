export class GameStateMachine {
    constructor(framework) {
        this.framework = framework;
        this.state = 'initialized';
    }

    transition(nextState) {
        if (typeof nextState !== 'string' || nextState.length === 0) {
            throw new TypeError('GameStateMachine.transition expects a non-empty string');
        }
        this.state = nextState;
    }
}
