import { div } from '../../index.js';

const nodes = [
  {
    id: 'server',
    name: '服务器',
    kind: '分组',
    children: [
      {
        id: 'gateway',
        name: 'api-gateway',
        kind: '服务',
        children: [{ id: 'gw-a', name: '实例 gw-a', kind: '实例' }]
      },
      { id: 'worker', name: 'worker', kind: '服务' }
    ]
  },
  { id: 'database', name: '数据库', kind: '分组' }
];

const columns = [
  { key: 'name', title: '名称', dataIndex: 'name' },
  { key: 'kind', title: '类型', dataIndex: 'kind' }
];

export function TreeTableExample() {
  return {
    render() {
      return div((panel) => {
        panel.vTreeTable({
          columns,
          nodes,
          rowSelection: true,
          expandedKeys: ['server']
        });
      });
    }
  };
}

