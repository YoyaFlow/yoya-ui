import { button, div, footer, form, section, span, table, vPagination, vText } from '../../src/index.js';
import { createAdminQuery } from './admin-service.js';

const statusLabels = {
  active: '启用',
  inactive: '停用'
};

export function AdminStatusBadge({ status }) {
  return () => span(statusLabels[status] || status)
    .className(`status status-${status}`)
    .attr('data-admin-status', status);
}

export function AdminRowActions({ record, onToggle, onDelete }) {
  return () => div((actions) => {
    actions.className('admin-row-actions');
    actions.child(
      button((control) => {
        control.attr('type', 'button').attr('data-admin-action', 'toggle');
        control.text(record.status === 'active' ? '停用' : '启用');
        control.on('click', onToggle);
      }),
      button((control) => {
        control.attr('type', 'button').attr('data-admin-action', 'delete');
        control.text('删除');
        control.on('click', onDelete);
      })
    );
  });
}

export function AdminSearchForm({ onSubmit, onReset }) {
  const values = { keyword: '', status: 'all' };
  let keywordInput = null;
  let statusSelect = null;
  return {
    getValues() {
      return { ...values };
    },
    reset() {
      values.keyword = '';
      values.status = 'all';
      keywordInput?.attr('value', '');
      statusSelect?.attr('value', 'all');
      onReset();
    },
    render() {
      return form((search) => {
        search.id('admin-search-form').className('admin-search-form');
        search.attr('aria-label', '用户查询');
        search.label((label) => label.attr('for', 'admin-keyword').text('关键词'));
        search.input((input) => {
          keywordInput = input;
          input.id('admin-keyword').attr('type', 'search').attr('placeholder', '姓名或邮箱');
          input.on('input', (event) => {
            values.keyword = event.target.value;
          });
        });
        search.label((label) => label.attr('for', 'admin-status').text('状态'));
        search.select((select) => {
          statusSelect = select;
          select.id('admin-status');
          select.option((option) => option.attr('value', 'all').text('全部'));
          select.option((option) => option.attr('value', 'active').text('启用'));
          select.option((option) => option.attr('value', 'inactive').text('停用'));
          select.on('change', (event) => {
            values.status = event.target.value;
          });
        });
        search.button((control) => control.attr('type', 'submit').text('查询'));
        search.button((control) => {
          control.id('admin-reset').attr('type', 'button').text('重置');
          control.on('click', this.reset.bind(this));
        });
        search.on('submit', (event) => {
          event.preventDefault();
          const formElement = event.currentTarget;
          values.keyword = formElement.elements.namedItem('admin-keyword')?.value || '';
          values.status = formElement.elements.namedItem('admin-status')?.value || 'all';
          onSubmit(this.getValues(), event);
        });
      });
    }
  };
}

export function AdminUserTable({
  onToggle = () => {},
  onDelete = () => {}
}) {
  let tableBody = null;
  return {
    renderRows(records = []) {
      tableBody.clearChildren();
      records.forEach((record) => {
        tableBody.tr((row) => {
          row.attr('data-admin-row', record.id);
          row.td(record.name);
          row.td(record.email);
          row.td(record.role);
          row.td((status) => status.child(AdminStatusBadge({ status: record.status })));
          row.td((actions) => actions.child(AdminRowActions({
            record,
            onToggle: () => onToggle(record),
            onDelete: () => onDelete(record)
          })));
        });
      });
      tableBody.commit();
    },
    render() {
      return table((grid) => {
        grid.className('admin-table');
        grid.thead((head) => {
          head.tr((row) => {
            row.th('姓名');
            row.th('邮箱');
            row.th('角色');
            row.th('状态');
            row.th('操作');
          });
        });
        grid.tbody((body) => {
          tableBody = body;
        });
      });
    }
  };
}

export function AdminPagination({
  onChange,
  pageSizes = [5, 10, 20]
}) {
  const pagination = vPagination({
    pageSizes,
    onChange
  });
  const feedbackText = vText('');

  return {
    update(result = {}) {
      pagination.update(result);
      return this;
    },
    setFeedback(message = '') {
      feedbackText.textContent(message);
      return this;
    },
    change(handler) {
      pagination.change(handler);
      return this;
    },
    render() {
      return footer((container) => {
        container.className('admin-pagination');
        container.child(pagination);
        container.p((feedback) => feedback.id('admin-feedback').child(feedbackText));
      });
    }
  };
}

export { createAdminQuery, queryAdminUsers } from './admin-service.js';

/**
 * 渲染标准管理列表页：查询表单、表格、行操作和分页都由一个模块管理。
 */
export function renderAdminPage(target = '#app') {
  const query = createAdminQuery();
  const state = { keyword: '', page: 1, pageSize: 5, status: 'all' };

  const setFeedback = (message) => {
    pagination.setFeedback(message);
  };

  const refreshUsers = async () => {
    const result = await query({ ...state, pageSize: state.pageSize });
    state.page = result.page;
    state.pageSize = result.pageSize;
    userTable.renderRows(result.items);
    pagination.update(result);
    return result;
  };

  const searchUsers = ({ keyword = '', status = 'all' } = {}) => {
    state.keyword = keyword;
    state.status = status;
    state.page = 1;
    return refreshUsers();
  };

  const resetUsers = () => {
    state.keyword = '';
    state.status = 'all';
    state.page = 1;
    setFeedback('');
    return refreshUsers();
  };

  const toggleUser = async (record) => {
    query.updateStatus(record.id, record.status === 'active' ? 'inactive' : 'active');
    setFeedback(`已更新 ${record.name}`);
    return refreshUsers();
  };

  const deleteUser = async (record) => {
    query.remove(record.id);
    setFeedback(`已删除 ${record.name}`);
    return refreshUsers();
  };

  const searchForm = AdminSearchForm({
    onReset: resetUsers,
    onSubmit: (values) => searchUsers(values)
  });
  const userTable = AdminUserTable({
    onToggle: toggleUser,
    onDelete: deleteUser
  });
  const pagination = AdminPagination({
    onChange: ({ page, pageSize }) => {
      state.page = page;
      state.pageSize = pageSize;
      return refreshUsers();
    }
  });

  const root = section((page) => {
    page.id('admin-page').className('admin-page');
    page.header((header) => {
      header.h1('用户管理');
      header.p('搜索、筛选、批量查看和维护用户状态。');
    });

    page.child(
      searchForm,
      userTable,
      pagination
    );
  });

  root.bindTo(target);
  refreshUsers();
  return root;
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  renderAdminPage('#app');
}
