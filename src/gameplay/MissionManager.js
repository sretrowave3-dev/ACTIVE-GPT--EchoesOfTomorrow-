// src/gameplay/MissionManager.js

/**
 * MissionManager coordinates narrative objectives, story checkpoints,
 * and multi-chapter campaign progression for Echoes of Tomorrow.
 * Conforms to EDD Chapter 19 §4 (Mission Manager).
 */
export class MissionManager {
  /**
   * @param {import('../framework/events/EventBus.js').EventBus} [eventBus]
   */
  constructor(eventBus = null) {
    this.eventBus = eventBus;
    this.chapters = [
      {
        index: 1,
        title: 'Chapter 1: Whispers in the Static',
        description: 'The Forgotten Sector 7 Testing Ground',
        objectives: [
          {
            id: 'survey_perimeter',
            title: 'Survey Sector Perimeter & Avoid Recon Drone',
            description: 'Explore the facility and observe security drone sweep paths.',
            completed: false
          },
          {
            id: 'memory_fragment_01',
            title: 'Recover Memory Fragment #01',
            description: 'Locate and activate the glowing memory terminal to reconstruct forgotten memories.',
            completed: false
          }
        ]
      },
      {
        index: 2,
        title: 'Chapter 2: The Core Override',
        description: 'Sector Omega Industrial Foundry',
        objectives: [
          {
            id: 'reach_overlook',
            title: 'Navigate to the Foundry Overlook',
            description: 'Cross the catwalks to reach the primary energy conduit.',
            completed: false
          },
          {
            id: 'override_terminal',
            title: 'Trigger Emergency Core Override',
            description: 'Engage terminal Omega-01 to purge reactor coolant.',
            completed: false
          }
        ]
      },
      {
        index: 3,
        title: 'Chapter 3: Echoes of Tomorrow',
        description: 'The Pinnacle Spire & Memory Convergence',
        objectives: [
          {
            id: 'reach_spire_peak',
            title: 'Ascend to the Spire Peak',
            description: 'Overlook the neon storm clouds of Neo-Bengaluru.',
            completed: false
          },
          {
            id: 'purge_static_loop',
            title: 'Purge the Mainframe Static Loop',
            description: 'Reclaim Captain Arjun Rao\'s final consciousness core.',
            completed: false
          }
        ]
      }
    ];

    this.currentChapterIndex = 0;
    this.loadChapter(0);
  }

  /**
   * Load chapter by index (0, 1, or 2).
   * @param {number} idx
   */
  loadChapter(idx) {
    if (idx >= 0 && idx < this.chapters.length) {
      this.currentChapterIndex = idx;
      const ch = this.chapters[idx];
      this.missionTitle = ch.title;
      this.objectives = ch.objectives.map(o => ({ ...o }));
      if (this.eventBus) {
        this.eventBus.publish('mission:chapter_loaded', this, {
          chapterIndex: ch.index,
          title: ch.title,
          description: ch.description
        });
      }
    }
  }

  /**
   * Complete an objective by ID.
   * If all objectives in the chapter are complete, emits completion notification.
   * @param {string} id
   * @returns {boolean} True if state changed
   */
  completeObjective(id) {
    const obj = this.objectives.find(o => o.id === id);
    if (obj && !obj.completed) {
      obj.completed = true;
      const isComplete = this.isMissionComplete();

      if (this.eventBus) {
        this.eventBus.publish('mission:objective_completed', this, {
          objectiveId: id,
          title: obj.title,
          allCompleted: isComplete,
          chapterIndex: this.chapters[this.currentChapterIndex]?.index
        });
      }

      if (isComplete) {
        if (this.eventBus) {
          this.eventBus.publish('mission:chapter_completed', this, {
            chapterIndex: this.chapters[this.currentChapterIndex]?.index,
            title: this.missionTitle
          });
        }
      }

      return true;
    }
    return false;
  }

  /**
   * Advance to the next chapter in the campaign.
   * @returns {boolean}
   */
  advanceToNextChapter() {
    if (this.currentChapterIndex < this.chapters.length - 1) {
      this.loadChapter(this.currentChapterIndex + 1);
      return true;
    }
    return false;
  }

  /**
   * Checks if all mission objectives of the active chapter are accomplished.
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
   * Reset all objectives across all chapters.
   */
  reset() {
    this.currentChapterIndex = 0;
    for (const ch of this.chapters) {
      for (const obj of ch.objectives) {
        obj.completed = false;
      }
    }
    this.loadChapter(0);
  }
}
