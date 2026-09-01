import '@yoyaflow/yoya-ui/ui.css';
import { hydrateOrMount } from '@yoyaflow/yoya-ui/ssr';
import { HomePage, messages } from './home-page.js';

// 自动读 __YOYA_DATA__ → #app 有服务端 HTML 走 hydrate，否则 mount
hydrateOrMount(HomePage, { messages });
