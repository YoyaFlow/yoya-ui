import { initYoyaTheme } from '@yoyaflow/yoya-ui';
import '@yoyaflow/yoya-ui/ui.css';
import './api/domain.api.js';
import './features/system/members/api/member.mock.js';
import './features/system/permissions/api/permission.mock.js';
import './features/system/roles/api/role.mock.js';
import './features/system/dicts/api/dict.mock.js';
import './shell/api/shell.mock.js';
import './shell/api/auth.mock.js';
import ShellState from './shell/api/shell.state.js';
import { AdminShell } from './shell/components/admin-shell.js';

initYoyaTheme();

async function bootstrap() {
  // load() 内部先加载会话并注入全局权限，再按权限过滤菜单 / 创建路由。
  const state = new ShellState();
  await state.load();
  const shell = AdminShell({ state });
  shell.render().bindTo('#app');
  state.start();
}

bootstrap();
