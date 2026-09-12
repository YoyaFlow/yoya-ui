import { computed, ref, vPagination, vText, vstack } from '../../index.js';

export function PaginationExample1() {
  const currentPage = ref(1);

  return {
    render() {
      return vstack({ gap: '12px' }, (stack) => {
        stack.child(
          vPagination({
            page: 1,
            pageSize: 10,
            total: 42,
            onChange({ page }) {
              currentPage.value = page;
            }
          })
        );
        stack.output((out) => {
          out.attr('data-pagination-status', 'true');
          out.child(vText(computed(() => `第 ${currentPage.value} 页，每页 10 条`)));
        });
      });
    }
  };
}
