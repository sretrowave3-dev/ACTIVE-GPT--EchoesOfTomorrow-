import { AssetLoader } from '../AssetLoader.js';
import { AssetType } from '../AssetType.js';

export class MaterialLoader extends AssetLoader {
  supports(type) {
    return type === AssetType.MATERIAL;
  }

  async load(descriptor) {
    // TODO: load material definition from descriptor.path
    return { placeholder: true, type: 'Material', path: descriptor.path };
  }

  async unload(resource) {
    // TODO: release material data
  }
}