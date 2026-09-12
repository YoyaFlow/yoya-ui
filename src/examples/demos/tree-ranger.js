import {
  div,
  DownloadOutlined,
  FileOutlined,
  FolderOutlined,
  ImageOutlined,
  MoreHorizontalOutlined,
  TrashOutlined,
  vTreeRanger
} from '../../index.js';

export function TreeRangerExample() {
  const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

  function buildChildren(selection) {
    const depth = selection.length;
    if (depth >= 5) {
      return [];
    }
    const label = depth === 0 ? '一级' : `层级 ${depth + 1}`;
    return Array.from({ length: 150 }, (_, index) => ({
      id: `${selection.map((item) => item.id).join('/')}/${index}`,
      name: `${label} · 节点 ${index + 1}`
    }));
  }

  const browser = vTreeRanger({
    visibleColumns: 3,
    columns: [
      {
        title: (level) => (level === 0 ? '一级目录' : `层级 ${level + 1}`),
        load: ({ selection }) => delay().then(() => buildChildren(selection)),
        renderItem: (item) => div(item.name),
        itemKey: (item) => item.id
      }
    ]
  });

  return {
    render() {
      return div((root) => {
        root.style('height', '360px');
        root.child(browser);
      });
    }
  };
}

export function TreeRangerFileExample() {
  const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

  function buildChildren(selection) {
    const depth = selection.length;
    if (depth >= 3) {
      return [];
    }
    const label = depth === 0 ? 'workspace' : '目录';
    const folders = Array.from({ length: 10 }, (_, index) => ({
      id: `${selection.map((item) => item.id).join('/')}/dir-${index}`,
      name: `${label}-${index + 1}`,
      type: 'folder'
    }));
    const files = Array.from({ length: 6 }, (_, index) => ({
      id: `${selection.map((item) => item.id).join('/')}/file-${index}`,
      name: index % 3 === 0 ? `photo-${index + 1}.png` : `file-${index + 1}.js`,
      type: index % 3 === 0 ? 'image' : 'file'
    }));
    return [...folders, ...files];
  }

  function fileIcon(item) {
    const size = { height: '14px', width: '14px' };
    if (item.type === 'folder') {
      return FolderOutlined().styles(size);
    }
    if (item.type === 'image') {
      return ImageOutlined().styles(size);
    }
    return FileOutlined().styles(size);
  }

  const browser = vTreeRanger((tree) => {
    tree.visibleColumns(3);
    tree.columns([
      {
        title: (level) => (level === 0 ? '工作区' : `目录 ${level + 1}`),
        load: ({ selection }) => delay().then(() => buildChildren(selection)),
        icon: fileIcon,
        renderItem: (item) => div(item.name),
        itemKey: (item) => item.id
      }
    ]);
  });

  return {
    render() {
      return div((root) => {
        root.style('height', '360px');
        root.child(browser);
      });
    }
  };
}

export function TreeRangerActionsExample() {
  const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

  function buildChildren(selection) {
    const depth = selection.length;
    if (depth >= 4) {
      return [];
    }
    const label = depth === 0 ? '分组' : `层级 ${depth + 1}`;
    return Array.from({ length: 120 }, (_, index) => ({
      id: `${selection.map((item) => item.id).join('/')}/${index}`,
      name: `${label} · 节点 ${index + 1}`
    }));
  }

  function actionIcon(icon, title) {
    return div((action) => {
      action.attr({ role: 'button', tabindex: '0', title }).styles({
        cursor: 'pointer',
        display: 'inline-flex',
        marginLeft: '6px',
        opacity: '0.55',
        padding: '2px'
      });
      action.on('click', (event) => {
        event.stopPropagation();
      });
      action.child(icon().styles({ height: '13px', width: '13px' }));
    });
  }

  function renderRow(item) {
    return div((row) => {
      row
        .styles({ alignItems: 'center', display: 'flex', minWidth: '0', width: '100%' })
        .div((name) => {
          name
            .styles({ flex: '1 1 auto', overflow: 'hidden', textOverflow: 'ellipsis' })
            .text(item.name);
        });
      row.div((actions) => {
        actions.style('display', 'inline-flex');
        actions.child(actionIcon(DownloadOutlined, '下载'));
        actions.child(actionIcon(TrashOutlined, '删除'));
        actions.child(actionIcon(MoreHorizontalOutlined, '更多'));
      });
    });
  }

  const browser = vTreeRanger({
    visibleColumns: 3,
    columns: [
      {
        title: (level) => (level === 0 ? '资源列表' : `层级 ${level + 1}`),
        load: ({ selection }) => delay().then(() => buildChildren(selection)),
        renderItem: (item) => renderRow(item),
        itemKey: (item) => item.id
      }
    ]
  });

  return {
    render() {
      return div((root) => {
        root.style('height', '360px');
        root.child(browser);
      });
    }
  };
}

export function TreeRangerLazyExample() {
  const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));
  const PAGE_SIZE = 200;
  const TOTAL = 10000;

  function buildPage(selection, page) {
    const depth = selection.length;
    if (depth >= 3) {
      return { hasMore: false, items: [] };
    }
    const prefix = selection.map((item) => item.id).join('/');
    const start = (page - 1) * PAGE_SIZE;
    return {
      hasMore: start + PAGE_SIZE < TOTAL,
      items: Array.from({ length: PAGE_SIZE }, (_, index) => ({
        id: `${prefix}/${start + index}`,
        name: `层级 ${depth + 1} · 节点 ${start + index + 1}`
      }))
    };
  }

  const browser = vTreeRanger((tree) => {
    tree.visibleColumns(3);
    tree.columns([
      {
        title: (level) => (level === 0 ? '一级目录' : `层级 ${level + 1}`),
        pageSize: PAGE_SIZE,
        load: ({ selection, page }) => delay().then(() => buildPage(selection, page)),
        renderItem: (item) => div(item.name),
        itemKey: (item) => item.id
      }
    ]);
  });

  return {
    render() {
      return div((root) => {
        root.style('height', '360px');
        root.child(browser);
      });
    }
  };
}
