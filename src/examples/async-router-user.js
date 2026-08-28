import { div, vText } from '../index.js';

function UserCard({ userId, tab }) {
  return {
    render() {
      return div(`用户卡片：${userId} / ${tab}`);
    }
  };
}

export default function AsyncUserPage({ params, query, router }) {
  const latest = vText('尚未读取');

  return {
    render() {
      return div((page) => {
        page.h3(`用户 ${params.id}`);
        page.p(`query.tab = ${query.tab || 'summary'}`);
        page.child(UserCard({ userId: params.id, tab: query.tab || 'summary' }));
        page.vButton((button) => {
          button.label('读取最新参数');
          button.on('click', () => {
            const current = router.currentParams();
            latest.textContent(`currentParams() = ${JSON.stringify(current)}`);
          });
        });
        page.output((output) => {
          output.attr('data-router-params-live', 'true');
          output.child(latest);
        });
      });
    }
  };
}
