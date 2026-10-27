import { WorldManager } from '../../world/WorldManager.js';
import { ECSService } from '../../ecs/ECSService.js';
import { PhysicsService } from '../services/PhysicsService.js';
import { AIService } from '../services/AIService.js';
import { RenderService } from '../services/RenderService.js';
import { InputService } from '../services/InputService.js';
import { PlayerService } from '../services/PlayerService.js';
import { GameplayService } from '../services/GameplayService.js';
import { TimeService } from '../services/TimeService.js';
import { AudioService } from '../services/AudioService.js';
import { UIService } from '../services/UIService.js';
import { SaveService } from '../services/SaveService.js';
import { HAOSService } from '../services/HAOSService.js';
import { EditorService } from '../services/EditorService.js';
import { PackagingService } from '../services/PackagingService.js';
import { NetworkService } from '../services/NetworkService.js';

export const ServiceManifest = [
  WorldManager,
  ECSService,
  PhysicsService,
  AIService,
  RenderService,
  InputService,
  PlayerService,
  GameplayService,
  TimeService,
  AudioService,
  UIService,
  SaveService,
  HAOSService,
  EditorService,
  PackagingService,
  NetworkService
];
