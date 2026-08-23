const initialAdminUsers = [
  { id: 1, name: 'Ada Lovelace', email: 'ada@example.com', status: 'active', role: '管理员' },
  { id: 2, name: 'Grace Hopper', email: 'grace@example.com', status: 'active', role: '开发者' },
  { id: 3, name: 'Linus Torvalds', email: 'linus@example.com', status: 'inactive', role: '维护者' },
  { id: 4, name: 'Margaret Hamilton', email: 'margaret@example.com', status: 'active', role: '架构师' },
  { id: 5, name: 'Ken Thompson', email: 'ken@example.com', status: 'active', role: '开发者' },
  { id: 6, name: 'Barbara Liskov', email: 'barbara@example.com', status: 'inactive', role: '研究员' },
  { id: 7, name: 'Edsger Dijkstra', email: 'edsger@example.com', status: 'active', role: '研究员' },
  { id: 8, name: 'Donald Knuth', email: 'donald@example.com', status: 'active', role: '顾问' },
  { id: 9, name: 'Frances Allen', email: 'frances@example.com', status: 'inactive', role: '研究员' },
  { id: 10, name: 'James Gosling', email: 'james@example.com', status: 'active', role: '开发者' },
  { id: 11, name: 'Bjarne Stroustrup', email: 'bjarne@example.com', status: 'active', role: '架构师' },
  { id: 12, name: 'Sophie Wilson', email: 'sophie@example.com', status: 'inactive', role: '开发者' }
];

/** 创建一个可替换数据源的本地查询服务。真实项目中可替换为 fetch/API 实现。 */
export function createAdminQuery(records = initialAdminUsers) {
  const data = records.map((record) => ({ ...record }));

  const query = async ({ keyword = '', status = 'all', page = 1, pageSize = 5 } = {}) => {
    await Promise.resolve();
    const normalizedKeyword = keyword.trim().toLowerCase();
    const filtered = data.filter((record) => {
      const matchesKeyword = !normalizedKeyword ||
        record.name.toLowerCase().includes(normalizedKeyword) ||
        record.email.toLowerCase().includes(normalizedKeyword);
      return matchesKeyword && (status === 'all' || record.status === status);
    });
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    return { items: filtered.slice(start, start + pageSize), total: filtered.length,
      page: safePage, pageSize, totalPages };
  };

  query.remove = (id) => {
    const index = data.findIndex((record) => record.id === id);
    if (index === -1) return false;
    data.splice(index, 1);
    return true;
  };

  query.updateStatus = (id, status) => {
    const record = data.find((item) => item.id === id);
    if (!record) return false;
    record.status = status;
    return true;
  };

  return query;
}

export const queryAdminUsers = createAdminQuery();
