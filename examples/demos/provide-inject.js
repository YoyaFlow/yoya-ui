import {
  computed,
  div,
  inject,
  provide,
  ref,
  vDynamicLoader,
  vNode,
  vText,
  vstack
} from '../../src/index.js';

/**
 * 跨层共享：工作区声明一次，两层消费组件直接 inject，中间组件不透传 props。
 * 值里放句柄，命令方法改 ref，视图原地更新。
 */
export function ProvideInjectWorkspaceExample() {
  const name = ref('yoya-ui');
  const owner = ref('Ada');
  const members = ref(6);
  const dirty = ref(false);

  function ProjectSummary() {
    const project = inject('project');
    const state = computed(() => (project.dirty.value ? '有未保存改动' : '已同步'));

    return vstack({ gap: '6px' }, (block) => {
      block.p((line) => {
        line.span('项目：');
        line.child(project.name);
        line.span('，');
        line.child(project.members);
        line.span(' 人');
      });
      block.output((out) => {
        out.attr('data-project-state', 'true');
        out.child(vText(state));
      });
    });
  }

  function ProjectOwner() {
    const project = inject('project');

    return div((row) => {
      row.attr('data-project-owner', 'true');
      row.span('负责人：');
      row.child(project.owner);
    });
  }

  return vNode((api) => {
    api.rename = (next) => {
      name.value = next;
      dirty.value = true;
      return api;
    };
    api.transfer = (next) => {
      owner.value = next;
      dirty.value = true;
      return api;
    };

    provide('project', { name, owner, members, dirty });

    return vstack({ gap: '10px' }, (stack) => {
      stack.child(ProjectSummary());
      stack.child(ProjectOwner());
    });
  });
}

/** 就近覆盖：同一个 key，内层声明只作用于自己的子树，兄弟不受影响。 */
export function ProvideInjectOverrideExample() {
  const theme = ref('light');

  function ThemeScope(scope) {
    const value = inject('theme', '未声明');

    return div((chip) => {
      chip.attr('data-theme-scope', scope);
      chip.span(scope);
      chip.span('：');
      chip.child(value);
    });
  }

  return vNode((api) => {
    api.toggle = () => {
      theme.value = theme.value === 'light' ? 'dark' : 'light';
      return api;
    };

    provide('theme', theme);

    return vstack({ gap: '8px' }, (stack) => {
      stack.child(ThemeScope('外层'));
      stack.div((panel) => {
        provide('theme', 'dark');
        panel.child(ThemeScope('内层'));
      });
      stack.child(ThemeScope('外层兄弟'));
    });
  });
}

/** 先挂后建：异步视图在挂到树上之前就构建完了，inject 仍沿父链读到祖先声明。 */
export function ProvideInjectAsyncExample() {
  const tenant = ref('acme');

  function TenantBadge() {
    const value = inject('tenant', '未声明');

    return div((badge) => {
      badge.attr('data-async-tenant', 'true');
      badge.span('租户：');
      badge.child(value);
    });
  }

  const loader = vDynamicLoader({
    auto: false,
    loader: () => Promise.resolve('loaded'),
    views: { loaded: () => TenantBadge() }
  });

  return vNode((api) => {
    api.load = () => loader.load().catch(() => loader);
    api.setTenant = (next) => {
      tenant.value = next;
      return api;
    };

    provide('tenant', tenant);

    return vstack({ gap: '10px' }, (stack) => {
      stack.child(loader);
    });
  });
}
