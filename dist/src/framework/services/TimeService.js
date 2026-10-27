import { Service } from './Service.js';
import { EventBus } from '../events/EventBus.js';
import { TimeManager } from '../../time/TimeManager.js';
import { DiagnosticsCollector } from '../../time/DiagnosticsCollector.js';
import { TimeEvents } from '../../time/TimeEvents.js';
import { ScheduledEvent } from '../../time/ScheduledEvent.js';

export class TimeService extends Service {
  constructor(framework) {
    super('time', framework);
    this._eventBus = framework.eventBus || new EventBus();
    this._diagnosticsCollector = new DiagnosticsCollector();
    this._timeManager = new TimeManager(
      () => true,
      (event) => this._eventBus.publish(event.eventType, this, event.payload),
      this._diagnosticsCollector
    );
    this._diagnosticsLogAccumulator = 0;
    this._repeatSubscription = this._eventBus.subscribe(TimeEvents.SCHEDULED_FIRE, (event) => {
      const payload = event.payload;
      if (payload?.repeat && Number.isFinite(payload.interval) && payload.interval > 0) {
        const nextFireTime = this._timeManager.getCurrentTime() + payload.interval;
        this._timeManager.scheduleEvent(
          new ScheduledEvent(nextFireTime, 0, TimeEvents.SCHEDULED_FIRE, {
            ...payload,
            repeat: true
          })
        );
      }
    });
  }

  async initialize() {
    const initialEvent = this._createRepeatingFireEvent(2, 'Time system startup pulse', 2);
    this._timeManager.scheduleEvent(initialEvent);
  }

  _createRepeatingFireEvent(fireTime, message, interval) {
    return new ScheduledEvent(fireTime, 0, TimeEvents.SCHEDULED_FIRE, {
      message,
      interval,
      repeat: true
    });
  }

  update(delta) {
    this._timeManager.update(delta);
    this._eventBus.publish(TimeEvents.WORLD_TIME_UPDATED, this, {
      currentTime: this._timeManager.getCurrentTime(),
      delta
    });
    this._eventBus.dispatch();

    this._diagnosticsLogAccumulator += delta;
    if (this._diagnosticsLogAccumulator >= 1) {
      this._diagnosticsLogAccumulator = 0;
      console.debug('[TimeService Diagnostics]', this._diagnosticsCollector.getSnapshot());
    }
  }

  async shutdown() {
    if (typeof this._repeatSubscription === 'function') {
      this._repeatSubscription();
      this._repeatSubscription = null;
    }
    this._timeManager.reset();
  }

  get timeManager() {
    return this._timeManager;
  }
}
