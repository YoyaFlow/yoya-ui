import { div } from '../index.js';

export default function FixturePage({ params, query }) {
  return {
    render() {
      return div(`fixture:${params.id}:${query.tab}`);
    }
  };
}
