import { initYoyaTheme } from '@yoyaflow/yoya-ui';
import '@yoyaflow/yoya-ui/ui.css';
import './api/domain.api.js';
import './features/members/api/member.mock.js';
import './features/permissions/api/permission.mock.js';
import './features/roles/api/role.mock.js';
import './features/dicts/api/dict.mock.js';
import { modules } from './app/modules.js';
import { createAppRouter } from './app/router.js';
import { AdminShell } from './app/admin-shell.js';

initYoyaTheme();

const router = createAppRouter();
const shell = AdminShell({ router, modules });
shell.render().bindTo('#app');
router.start();
shell.syncFromUrl();
