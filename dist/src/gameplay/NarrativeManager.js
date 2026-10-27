// src/gameplay/NarrativeManager.js

/**
 * NarrativeManager handles lore archives, voice transcript logs,
 * and memory fragment discovery for Captain Arjun Rao in Echoes of Tomorrow.
 * Conforms to EDD Chapter 1 & Chapter 19 (Narrative & Scripting Framework).
 */
export class NarrativeManager {
  /**
   * @param {import('../framework/events/EventBus.js').EventBus} [eventBus]
   */
  constructor(eventBus = null) {
    this.eventBus = eventBus;

    /** @type {Map<string, Object>} Catalog of story audio datalogs */
    this.logs = new Map([
      [
        'log_01',
        {
          id: 'log_01',
          speaker: 'Captain Arjun Rao',
          title: 'Datalog 07-A: The Monsoon Protocol',
          timestamp: '2088-09-14 // Sector 7 Overlook',
          transcript:
            'The monsoon static isn\'t weather. It\'s an electromagnetic pulse bleeding from the old defense spires. HQ ordered us to hold the perimeter, but the drones... they aren\'t recognizing Indian Armed Forces encryption codes anymore. Something rewrote their core directives.',
          unlocked: false
        }
      ],
      [
        'log_02',
        {
          id: 'log_02',
          speaker: 'Dr. Priya Varma (Lead Cyberneticist)',
          title: 'Datalog 12-C: Project Echo Containment',
          timestamp: '2088-11-03 // Foundry Lab Omega',
          transcript:
            'If you are hearing this, the neural bridge was severed. Rao was the only pilot whose synaptic matrix survived neural synchronization with the mainframe. But the feedback loop didn\'t kill him. It fractured him across the city\'s data grid. He thinks he is still walking these halls.',
          unlocked: false
        }
      ],
      [
        'log_03',
        {
          id: 'log_03',
          speaker: 'Echo Mainframe Core',
          title: 'Datalog 99-Final: Memory Convergence',
          timestamp: '2089-01-01 // Spire Pinnacle',
          transcript:
            'Captain Rao. You are not holding the line. You are the echo holding the memory of what was lost. Retrieve the final fragment to complete the loop, or purge the sector to let the city rest.',
          unlocked: false
        }
      ]
    ]);
  }

  /**
   * Unlocks an audio datalog by ID and publishes an event.
   * @param {string} logId
   * @returns {Object|null} The unlocked log object if newly unlocked
   */
  unlockLog(logId) {
    const log = this.logs.get(logId);
    if (!log) return null;

    if (!log.unlocked) {
      log.unlocked = true;

      if (this.eventBus) {
        this.eventBus.publish('narrative:log_unlocked', this, {
          logId: log.id,
          speaker: log.speaker,
          title: log.title,
          transcript: log.transcript
        });
      }
      return log;
    }
    return log;
  }

  /**
   * Retrieves all logs that have been discovered by the player.
   * @returns {Object[]}
   */
  getUnlockedLogs() {
    return Array.from(this.logs.values()).filter(l => l.unlocked);
  }

  /**
   * Check if a log has been unlocked.
   * @param {string} logId
   * @returns {boolean}
   */
  isLogUnlocked(logId) {
    return Boolean(this.logs.get(logId)?.unlocked);
  }

  /**
   * Reset all unlocked logs (for mission restarts).
   */
  reset() {
    for (const log of this.logs.values()) {
      log.unlocked = false;
    }
  }
}
