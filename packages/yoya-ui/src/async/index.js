import { registerChildFactories } from '@yoyaflow/yoya-core/internal/core/node.js';
import { HtmlElementNode } from '@yoyaflow/yoya-core/html';
import { VLazyImage, vLazyImage } from './lazy-image.js';
import { VSkeleton, vSkeleton } from './skeleton.js';

const asyncFactories = {
  vLazyImage,
  vSkeleton
};

registerChildFactories(HtmlElementNode, asyncFactories);

export { clearDynamicModuleCache, preloadDynamicModule, vDynamicLoader } from './dynamic-loader.js';
export { VLazyImage, vLazyImage, VSkeleton, vSkeleton };
