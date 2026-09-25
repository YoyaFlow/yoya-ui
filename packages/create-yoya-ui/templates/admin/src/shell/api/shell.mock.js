// 演示用内存 mock（接入真实后端后删除本文件）。
import { mockRequest } from '../../api/domain.api.js';

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

mockRequest('GET', '/menus', async () => {
  await delay();
  return {
    ok: true,
    data: [
      {
        key: 'dashboard',
        label: '工作台',
        icon: 'D',
        routes: [
          {
            path: '/dashboard/overview',
            title: '数据概览',
            viewKey: 'dashboard-overview',
            permCode: 'dashboard:overview'
          },
          {
            path: '/dashboard/todos',
            title: '待办审批',
            viewKey: 'todo-approval',
            permCode: 'dashboard:todos'
          }
        ]
      },
      {
        key: 'ops',
        label: '运维',
        icon: 'O',
        routes: [
          {
            path: '/ops/services',
            title: '服务清单',
            viewKey: 'service-list',
            permCode: 'ops:service'
          },
          {
            path: '/ops/deploys',
            title: '部署任务',
            viewKey: 'deploy-list',
            permCode: 'ops:deploy'
          }
        ]
      },
      {
        key: 'system',
        label: '系统',
        icon: 'S',
        routes: [
          {
            path: '/system/members',
            title: '成员管理',
            viewKey: 'member-list',
            permCode: 'system:member'
          },
          {
            path: '/system/roles',
            title: '角色管理',
            viewKey: 'role-list',
            permCode: 'system:role'
          },
          {
            path: '/system/permissions',
            title: '权限管理',
            viewKey: 'permission-list',
            permCode: 'system:permission'
          },
          {
            path: '/system/dicts',
            title: '字典管理',
            viewKey: 'dict-list',
            permCode: 'system:dict'
          }
        ]
      }
    ]
  };
});
