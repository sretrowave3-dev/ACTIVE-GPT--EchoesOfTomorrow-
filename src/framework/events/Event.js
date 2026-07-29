/**
 * Immutable event payload.
 */
export class Event {
  constructor(type, sender, payload = null) {
    this.type = type;
    this.sender = sender;
    this.payload = payload;
    this.timestamp = performance.now();

    Object.freeze(this);
  }
}