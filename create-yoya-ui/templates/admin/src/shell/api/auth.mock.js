// 会话演示用内存 mock（接入真实后端后删除本文件）。
// 想观察权限效果：增删下方权限码即可。
// 例如去掉 'ops:deploy' 隐藏「部署任务」菜单；去掉 'system:member:remove' 禁用「删除」按钮。
import { mockRequest } from '../../api/domain.api.js';

mockRequest('GET', '/auth/me', async () => ({
  ok: true,
  data: {
    user: { name: '管理员', account: 'admin' },
    roles: ['admin'],
    permissions: [
      'dashboard:overview',
      'dashboard:todos',
      'ops:service',
      'system:member',
      'system:member:create',
      'system:member:update',
      'system:role',
      'system:permission',
      'system:dict'
    ]
  }
}));
