/**
 * 第二个 UI 的入口：与 `apps/main` 同一套写法（页面声明是真相，取数只写逻辑名）。
 * **不许** import 别的 UI 的文件 —— 要共享走项目级 `resources/` / `templates/` / `components/`。
 */
import { createGenUI } from '@yoyaflow/yoya-core/genui';
import { plugin as yoyaUIPlugin } from '@yoyaflow/yoya-ui/genui-plugin';
import daily from './pages/daily.genui.json';
import { custodians } from './actions.js';

const genui = createGenUI();
genui.use(yoyaUIPlugin);

let custodianTree = {};
try {
  custodianTree = custodians();
} catch (error) {
  console.error('[genui] 取数转发没配好：', error.message);
}

genui.fromJson(daily, { custodians: custodianTree, onWarn: (m) => console.warn('[genui]', m) })
  .bindTo(document.getElementById('app'));
