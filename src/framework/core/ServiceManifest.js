import { RenderService } from '../services/RenderService.js';
import { InputService } from '../services/InputService.js';
import { PlayerService } from '../services/PlayerService.js';
import { AudioService } from '../services/AudioService.js';
import { UIService } from '../services/UIService.js';
import { WorldManager } from '../../world/WorldManager.js';
import { TimeService } from '../services/TimeService.js';
import { ECSService } from '../../ecs/ECSService.js';

export const ServiceManifest = [
  RenderService,
  InputService,
  PlayerService,
  AudioService,
  UIService,
  WorldManager,
  TimeService,
  ECSService
];