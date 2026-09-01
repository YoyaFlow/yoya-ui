import { registerChildFactories } from '../core/node.js';
import { HtmlElementNode } from '../html/index.js';
import { VLazyImage, vLazyImage } from './lazy-image.js';
import { VSkeleton, vSkeleton } from './skeleton.js';

const asyncFactories = {
  vLazyImage,
  vSkeleton
};

registerChildFactories(HtmlElementNode, asyncFactories);

export {
  clearDynamicModuleCache,
  preloadDynamicModule,
  vDynamicLoader
} from './dynamic-loader.js';
export { VLazyImage, vLazyImage, VSkeleton, vSkeleton };
