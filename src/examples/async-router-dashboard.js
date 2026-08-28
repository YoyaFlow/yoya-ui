import { div } from '../index.js';

export default function AsyncDashboardPage({ params, query }) {
  return {
    render() {
      return div((page) => {
        page.h3(`分析面板 ${params.id}`);
        page.p(`当前标签：${query.tab || 'overview'}`);
        page.p('该页通过 export default 定义，由异步路由自动执行并传入 context。');
      });
    }
  };
}
