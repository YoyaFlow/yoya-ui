import { div } from '../index.js';

export default function FixturePage({ params, query }) {
  // 形态 A 薄工厂（票 07）：页面工厂直接返回视图。
  return div(`fixture:${params.id}:${query.tab}`);
}
