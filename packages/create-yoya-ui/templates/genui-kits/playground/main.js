/**
 * 调试台：`npm run dev` 打开的就是这一页。
 *
 * 它替你把宿主的活干了三件：
 * 1. 按 `kit.json` 装插件（kitPlugin）—— 和 GenUI 宿主 `GenUI.use(...)` 是同一条路；
 * 2. 把 `components/<族>/examples/<示例>.json` 逐个渲染出来（改一处存盘即刷新）；
 * 3. 示例里有 `data` 时给出"写数据模型"的按钮 —— 验证活值是不是真的活着。
 *
 * 这一页只是调试用，不参与 `npm run build`（制品只有 `dist/yoya.kit.js`）。
 */
import { createGenUI } from '@yoyaflow/yoya-core/genui';
import { plugin as yoyaUIPlugin } from '@yoyaflow/yoya-ui/genui-plugin';
import '@yoyaflow/yoya-ui/ui.css';
import kit from '../kit.json';
import { kitPlugin } from '../src/index.js';
import './style.css';

const genui = createGenUI();

genui.use(yoyaUIPlugin);
genui.use(kitPlugin);

const examples = Object.entries(
  import.meta.glob('../components/*/examples/*.json', { eager: true, import: 'default' })
)
  .map(([path, schema]) => ({
    name: path.replace('../components/', '').replace('/', ' · '),
    schema
  }))
  .sort((left, right) => left.name.localeCompare(right.name));

document.querySelector('#title').textContent = `${kit.namespace}@${kit.version}`;
document.querySelector('#subtitle').textContent =
  `${kit.components.length} 个组件 · ${examples.length} 份示例 · runtime.export = ${kit.runtime.export}`;

renderRegistry();
examples.forEach(renderExample);

/** 组件目录：模型看到的选型信息，就是 components/<族>/component.json 里写的那几段。 */
function renderRegistry() {
  const host = document.querySelector('#registry');

  for (const component of kit.components) {
    const row = document.createElement('article');
    row.className = 'registry-row';
    const head = document.createElement('header');
    const name = document.createElement('code');
    name.textContent = component.name;
    const category = document.createElement('span');
    category.className = 'chip';
    category.textContent = component.category;
    head.append(name, category);

    const summary = document.createElement('p');
    summary.textContent = component.summary;
    const contract = document.createElement('p');
    contract.className = 'muted';
    contract.textContent = component.dataContract;

    row.append(head, summary, contract);
    host.append(row);
  }
}

function renderExample({ name, schema }) {
  const stage = document.createElement('article');
  stage.className = 'stage';

  const head = document.createElement('header');
  const title = document.createElement('h3');
  title.textContent = name;
  const actions = document.createElement('div');
  actions.className = 'actions';
  head.append(title, actions);

  const canvas = document.createElement('div');
  canvas.className = 'canvas';
  stage.append(head, canvas);
  document.querySelector('#stages').append(stage);

  let surface = null;

  const mount = () => {
    surface?.destroy?.();
    canvas.replaceChildren();

    try {
      // 每次都从 schema 的副本重建：调试台按"宿主换了一份 schema"的口径走
      surface = genui.fromJson(JSON.parse(JSON.stringify(schema)), {
        onWarn: (message) => console.warn('[genui]', message)
      });
      surface.bindTo(canvas);
    } catch (error) {
      canvas.textContent = `渲染失败：${error.message}`;
      console.error(error);
    }
  };

  const redraw = document.createElement('button');
  redraw.textContent = '重新渲染';
  redraw.addEventListener('click', mount);
  actions.append(redraw);

  for (const path of numericPaths(schema.data)) {
    const button = document.createElement('button');
    button.textContent = `${path} +1`;
    button.addEventListener('click', () => {
      if (!surface) return;
      surface.data.write(path, Number(surface.data.read(path) ?? 0) + 1);
    });
    actions.append(button);
  }

  mount();
}

/** 示例 data 里的数字叶子路径（最多 4 个）：给"写数据模型"的按钮用。 */
function numericPaths(data, prefix = '', found = []) {
  if (!data || typeof data !== 'object' || found.length >= 4) return found;

  for (const [key, value] of Object.entries(data)) {
    const path = `${prefix}/${key}`;

    if (typeof value === 'number') found.push(path);
    else numericPaths(value, path, found);

    if (found.length >= 4) break;
  }

  return found;
}
