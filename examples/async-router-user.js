import { div, ref, vText } from '@yoyaflow/yoya-ui';

function UserCard({ userId, tab }) {
  return div(`用户卡片：${userId} / ${tab}`);
}

export default function AsyncUserPage({ params, query, router }) {
  const latest = ref('尚未读取');

  return div((page) => {
    page.h3(`用户 ${params.id}`);
    page.p(`query.tab = ${query.tab || 'summary'}`);
    page.child(UserCard({ userId: params.id, tab: query.tab || 'summary' }));
    page.vButton('读取最新参数', (button) => {
      button.on('click', () => {
        const current = router.currentParams();
        latest.value = `currentParams() = ${JSON.stringify(current)}`;
      });
    });
    page.output((output) => {
      output.attr('data-router-params-live', 'true');
      output.child(vText(latest));
    });
  });
}
