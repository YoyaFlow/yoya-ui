import { createRouter, div } from '@yoyaflow/yoya-ui/ssr';

export const messages = {
  'zh-CN': { title: 'SSR 示例', home: '首页' },
  'en-US': { title: 'SSR Demo', home: 'Home' }
};

// 页面即形态 A 组件：服务端与客户端共用同一份定义
export function HomePage(state) {
  const router = createRouter();
  router.mode(state.mode || 'history');
  router.route('/home', '首页'.s('home'));
  router.notFound('未找到');
  router.renderPath(state.path || '/home');

  return div((root) => {
    root.h1('SSR 示例'.s('title'));
    root.child(router);
    root.p('服务端渲染完成，事件由 hydrate 在浏览器端绑定。');
  });
}
