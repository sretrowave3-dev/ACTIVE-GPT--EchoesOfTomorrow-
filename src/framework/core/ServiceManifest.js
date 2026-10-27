import { WorldManager } from '../../world/WorldManager.js';
import { ECSService } from '../../ecs/ECSService.js';
import { RenderService } from '../services/RenderService.js';
import { InputService } from '../services/InputService.js';
import { PlayerService } from '../services/PlayerService.js';
import { TimeService } from '../services/TimeService.js';
import { AudioService } from '../services/AudioService.js';
import { UIService } from '../services/UIService.js';

export const ServiceManifest = [
  WorldManager,
  ECSService,
  RenderService,
  InputService,
  PlayerService,
  TimeService,
  AudioService,
  UIService
];
