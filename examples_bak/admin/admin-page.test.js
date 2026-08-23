import { beforeEach, describe, expect, it } from 'vitest';
import {
  AdminPagination,
  AdminSearchForm,
  AdminStatusBadge,
  AdminUserTable,
  renderAdminPage
} from './admin-page.js';
import { createAdminQuery, queryAdminUsers } from './admin-service.js';

describe('admin page example', () => {
  beforeEach(() => {
    document.body.innerHTML = '<main id="admin-root"></main>';
  });

  it('queries local data with keyword, status and pagination parameters', async () => {
    const result = await queryAdminUsers({ keyword: 'Ada', status: 'active', page: 1, pageSize: 2 });

    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(2);
    expect(result.items[0]).toMatchObject({ name: 'Ada Lovelace', status: 'active' });
  });

  it('renders a searchable paginated table and row actions', async () => {
    const root = renderAdminPage('#admin-root');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(root.tagName()).toBe('section');
    expect(document.querySelectorAll('[data-admin-row]')).toHaveLength(5);
    expect(document.querySelector('.yoya-vpagination-summary').textContent).toContain('共 12 条');
    expect(document.querySelector('.yoya-vpagination-summary').textContent).toContain('第 1 / 3 页');

    const keyword = document.querySelector('#admin-keyword');
    keyword.value = 'Ada';
    document.querySelector('#admin-search-form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.querySelectorAll('[data-admin-row]')).toHaveLength(1);
    expect(document.body.textContent).toContain('Ada Lovelace');
    expect(document.querySelector('.yoya-vpagination-summary').textContent).toContain('共 1 条');

    const reset = document.querySelector('#admin-reset');
    reset.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.querySelector('#admin-keyword').value).toBe('');
    expect(document.querySelectorAll('[data-admin-row]')).toHaveLength(5);

    document.querySelector('[data-action="next"]').click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.querySelector('.yoya-vpagination-summary').textContent).toContain('第 2 / 3 页');
    expect(document.querySelectorAll('[data-admin-row]')).toHaveLength(5);

    const pageSize = document.querySelector('[data-role="page-size"]');
    pageSize.value = '10';
    pageSize.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.querySelector('.yoya-vpagination-summary').textContent).toContain('第 1 / 2 页');
    expect(document.querySelectorAll('[data-admin-row]')).toHaveLength(10);

    document.querySelector('[data-admin-action="delete"]').click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.body.textContent).toContain('已删除');
  });

  it('creates an isolated query function with custom records', async () => {
    const query = createAdminQuery([
      { id: 1, name: 'Only User', email: 'only@example.com', status: 'active', role: 'Admin' }
    ]);

    const result = await query({ page: 1, pageSize: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('Only User');
  });

  it('builds the status cell as a function component factory', () => {
    const factory = AdminStatusBadge({ status: 'active' });

    expect(typeof factory).toBe('function');
    expect(factory().commit().textContent).toBe('启用');
    expect(factory().commit().className).toBe('status status-active');
  });

  it('builds search, table, and pagination as independent components', () => {
    const search = AdminSearchForm({ onSubmit() {}, onReset() {} });
    const users = AdminUserTable({});
    const pagination = AdminPagination({ onChange() {} });

    expect(typeof search.render).toBe('function');
    expect(typeof search.getValues).toBe('function');
    expect(typeof users.render).toBe('function');
    expect(typeof users.renderRows).toBe('function');
    expect(typeof pagination.render).toBe('function');
    expect(typeof pagination.update).toBe('function');
    expect(typeof pagination.change).toBe('function');
    expect(typeof pagination.setFeedback).toBe('function');
    expect(search.render().commit().id).toBe('admin-search-form');
    expect(users.render().commit().querySelector('tbody')).not.toBeNull();
    expect(pagination.render().commit().querySelector('.yoya-vpagination')).not.toBeNull();
    expect(search).not.toHaveProperty('keywordInput');
    expect(search).not.toHaveProperty('statusSelect');
  });

  it('keeps pagination display state inside the pagination component', () => {
    const pagination = AdminPagination({ onChange() {} });
    const element = pagination.render().commit();

    pagination.update({ total: 12, page: 2, pageSize: 5, totalPages: 3 });
    pagination.setFeedback('已更新 Ada');

    expect(element.querySelector('.yoya-vpagination-summary').textContent).toContain('共 12 条');
    expect(element.querySelector('.yoya-vpagination-summary').textContent).toContain('第 2 / 3 页');
    expect(element.querySelector('#admin-feedback').textContent).toBe('已更新 Ada');
  });

  it('lets the table component expose row rendering on its component object', () => {
    const users = AdminUserTable({
      onToggle() {},
      onDelete() {}
    });
    const grid = users.render();
    grid.commit();

    users.renderRows([
      { id: 1, name: 'Alpha', email: 'alpha@example.com', status: 'active', role: 'Admin' }
    ]);

    expect(grid.commit().querySelectorAll('[data-admin-row]')).toHaveLength(1);
    expect(grid.commit().textContent).toContain('Alpha');
    expect(typeof users.renderRows).toBe('function');
  });
});
