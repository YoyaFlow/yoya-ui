/**
 * yoya-ui 的 genui-kit manifest 生成——薄 wrapper，只调通用生成器。
 *
 * 生成器是独立包 @yoyaflow/yoya-kitgen（core 仓 genui 目录，同仓 workspace 解析）；本仓只保留 kitgen.config.js
 * （目录→分类、工厂发现策略、黑名单）。
 */
import { writeKit } from '@yoyaflow/yoya-core/genui/kitgen';
import config from '../kitgen.config.js';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const result = await writeKit(config, {
  resolveFrom: dirname(fileURLToPath(import.meta.url)) + '/..'
});
const { components, documented, htmlElements, svgFactories, version } = result.summary;

console.log(`genui-kit.json 生成完毕：`);
console.log(`  工厂组件：${components}（JSDoc 文档 ${documented}，其余 needsDocs）`);
console.log(`  HTML 元素：${htmlElements} · SVG 工厂：${svgFactories}`);
console.log(`  版本钉：${version}`);
