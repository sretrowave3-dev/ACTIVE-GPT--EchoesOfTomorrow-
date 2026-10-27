// src/gameplay/MissionManager.js

/**
 * MissionManager coordinates narrative objectives, story checkpoints,
 * and mission progression for Echoes of Tomorrow.
 * Conforms to EDD Chapter 19 §4 (Mission Manager).
 */
export class MissionManager {
  /**
   * @param {import('../framework/events/EventBus.js').EventBus} [eventBus]
   */
  constructor(eventBus = null) {
    this.eventBus = eventBus;
    this.missionTitle = 'Chapter 1: Whispers in the Static';
    this.objectives = [
      {
        id: 'survey_perimeter',
        title: 'Survey Sector Perimeter & Avoid Recon Drone',
        description: 'Explore the grey-box testing facility and observe security drone sweep paths.',
        completed: false
      },
      {
        id: 'memory_fragment_01',
        title: 'Recover Memory Fragment #01',
        description: 'Locate and activate the glowing memory terminal to reconstruct forgotten memories.',
        completed: false
      }
    ];
  }

  /**
   * Complete an objective by ID.
   * @param {string} id
   * @returns {boolean} True if state changed
   */
  completeObjective(id) {
    const obj = this.objectives.find(o => o.id === id);
    if (obj && !obj.completed) {
      obj.completed = true;
      if (this.eventBus) {
        this.eventBus.publish('mission:objective_completed', this, {
          objectiveId: id,
          title: obj.title,
          allCompleted: this.isMissionComplete()
        });
      }
      return true;
    }
    return false;
  }

  /**
   * Checks if all mission objectives are accomplished.
   * @returns {boolean}
   */
  isMissionComplete() {
    return this.objectives.every(o => o.completed);
  }

  /**
   * Retrieves the current primary objective.
   * @returns {Object|null}
   */
  getCurrentObjective() {
    return this.objectives.find(o => !o.completed) || null;
  }

  /**
   * Reset all objectives (e.g. for mission reload).
   */
  reset() {
    for (const obj of this.objectives) {
      obj.completed = false;
    }
  }
}
