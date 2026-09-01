import { MemberListPage } from '../features/members/pages/member-list-page.js';
import { PermissionListPage } from '../features/permissions/pages/permission-list-page.js';
import { RoleListPage } from '../features/roles/pages/role-list-page.js';
import { DictListPage } from '../features/dicts/pages/dict-list-page.js';

export const modules = [
  {
    key: 'dashboard',
    label: '工作台',
    icon: 'D',
    routes: [
      { path: '/dashboard/overview', title: '数据概览', text: '关键指标、趋势与告警一览。' },
      { path: '/dashboard/todos', title: '待办审批', text: '待处理审批与任务。' }
    ]
  },
  {
    key: 'ops',
    label: '运维',
    icon: 'O',
    routes: [
      { path: '/ops/services', title: '服务清单', text: '服务列表与健康状态。' },
      { path: '/ops/deploys', title: '部署任务', text: '发布记录与执行状态。' }
    ]
  },
  {
    key: 'system',
    label: '系统',
    icon: 'S',
    routes: [
      { path: '/system/members', title: '成员管理', view: MemberListPage },
      { path: '/system/roles', title: '角色管理', view: RoleListPage },
      { path: '/system/permissions', title: '权限管理', view: PermissionListPage },
      { path: '/system/dicts', title: '字典管理', view: DictListPage }
    ]
  }
];
