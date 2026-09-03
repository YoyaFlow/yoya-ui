import { div } from '../../index.js';

const rows = [
  { id: 'gw', name: 'api-gateway', env: 'prod', status: '运行中', qps: 3200 },
  { id: 'auth', name: 'auth-service', env: 'prod', status: '运行中', qps: 980 },
  { id: 'worker', name: 'worker', env: 'staging', status: '停止', qps: 0 },
  { id: 'cfg', name: 'config-center', env: 'dev', status: '运行中', qps: 120 },
  { id: 'log', name: 'log-collect', env: 'prod', status: '运行中', qps: 5400 },
  { id: 'mq', name: 'mq-broker', env: 'staging', status: '运行中', qps: 760 }
];

const columns = [
  { key: 'name', title: '服务名', dataIndex: 'name', sorter: true, fixed: 'left' },
  { key: 'env', title: '环境', dataIndex: 'env' },
  { key: 'status', title: '状态', dataIndex: 'status' },
  { key: 'qps', title: 'QPS', dataIndex: 'qps', sorter: true, editable: true }
];

export function SuperTableExample() {
  return {
    render() {
      return div((panel) => {
        panel.vSuperTable({
          columns,
          rows,
          pagination: { pageSize: 5 },
          rowSelection: true,
          expandedRowKeys: []
        });
      });
    }
  };
}

