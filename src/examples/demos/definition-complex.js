import { hstack, input, li, ul, vStateNode, vText, vstack } from '../../index.js';
import { componentSource } from '../component-source.js';

const initialTasks = [
  { id: 'api', title: '接口联调', done: true },
  { id: 'ui', title: '界面走查', done: false },
  { id: 'doc', title: '补充文档', done: false }
];

// 块组件：PascalCase 命名、输入显式（getter + 回调）、产出 ViewNode
function TaskSummary({ stats }) {
  return hstack({ className: 'demo-task-summary', gap: '10px' }, (row) => {
    row.span((item) => item.child(vText(() => `共 ${stats().total} 项`)));
    row.span((item) => item.child(vText(() => `已完成 ${stats().done} 项`)));
  });
}

function TaskFilter({ onKeyword }) {
  return input((field) => {
    field.className('demo-task-filter');
    field.attr({ 'data-task-filter': 'true', placeholder: '筛选任务…', type: 'text' });
    field.on('input', (event) => onKeyword(event.target.value));
  });
}

function TaskRow({ task, onToggle }) {
  return li((row) => {
    row.className('demo-task-row');
    row.input((box) => {
      box.attr({ 'data-task-toggle': task.id, type: 'checkbox' });
      box.attr('checked', task.done ? true : null);
      box.on('change', () => onToggle(task.id));
    });
    row.span(task.title);
  });
}

function TaskList({ rows, onToggle }) {
  return ul((list) => {
    list.className('demo-task-list');
    list.attr('data-task-list', 'true');
    // 结构随筛选变化：区域负责重建，值变化交给函数值绑定。
    list.rebuildable();
    rows().forEach((task) => list.addChild(task.id, TaskRow({ task, onToggle })));
  });
}

/** 复杂组件：入口组件只做编排，结构块都拆成同文件内的函数组件。 */
export function ComplexWorkbenchExample() {
  return vStateNode({
    state: () => ({ keyword: '', tasks: initialTasks }),
    render(state, api) {
      const rows = () => state.tasks.filter((task) => task.title.includes(state.keyword));
      const stats = () => ({
        done: state.tasks.filter((task) => task.done).length,
        total: state.tasks.length
      });

      return vstack({ className: 'demo-complex-workbench', gap: '12px' }, (panel) => {
        panel.child(TaskSummary({ stats }));
        panel.child(TaskFilter({ onKeyword: (value) => api.setState({ keyword: value }) }));
        panel.child(TaskList({ rows, onToggle: (id) => api.toggle(id) }));
      });
    },
    toggle(id) {
      this.setState((state) => ({
        tasks: state.tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task))
      }));
    }
  });
}

/** 源码面板用：结构块先于入口组件展示，去掉块组件上的 export 前缀。 */
export const complexBlocksSource = [
  '// 结构块也是组件：同一文件内声明，输入显式（getter + 回调），产出 ViewNode',
  [TaskSummary, TaskFilter, TaskRow, TaskList]
    .map((block) => componentSource(block, []).replace(/^export /, ''))
    .join('\n\n')
].join('\n\n');
