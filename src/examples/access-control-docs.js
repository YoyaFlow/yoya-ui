import { section } from '../index.js';
import { ComponentSource } from './component-source.js';
import { AccessControlMembers } from './demos/access-control.js';

const accessDemoDefinitions = Object.freeze([
  {
    id: 'members',
    title: '成员编辑（权限对比）',
    description:
      '同一控件在不同持有权限下渲染：有写可编辑、只读禁用、无权限隐藏；并展示操作按钮的三种状态。',
    component: AccessControlMembers,
    sourceComponent: AccessControlMembers,
    imports: ['createAccess', 'div', 'installAccess', 'vInput'],
    sourceTitle: '权限控制使用源码'
  }
]);

export function AccessControlDocumentationPage() {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-access-docs');
        page.attr('data-component-route-item', 'guides:access-control');

        page.header((header) => {
          header.className('components-access-docs-header');
          header.h1('权限控制');
          header.p(
            'read / write 两级权限。组件只声明裸资源码，读/写级别由用户持有的权限决定；渲染管线自动显隐与禁用。'
          );
        });

        page.section((usage) => {
          usage.className('components-access-docs-usage');
          usage.h2('何时使用');
          usage.ul((list) => {
            list.li('需要按当前用户控制页面内容显隐。');
            list.li('表单与操作按钮在只读角色下禁用或隐藏。');
            list.li('改状态的操作要求写权限。');
          });
        });

        page.section((api) => {
          api.className('components-access-docs-api');
          api.h2('常用 API');
          api.table((table) => {
            table.thead((head) => {
              head.tr((row) => {
                row.th('API');
                row.th('用途');
                row.th('示例');
              });
            });
            table.tbody((body) => {
              [
                [
                  'installAccess(access)',
                  'SPA 一次设全局权限上下文。',
                  "installAccess(createAccess({ permissions: ['system:member'] }))"
                ],
                [
                  'createAccess({ permissions, roles, superAdmins })',
                  '创建权限上下文：裸码可读可写，r. 只读。',
                  "createAccess({ permissions: ['system:member'] })"
                ],
                [
                  'access.canRead / canWrite',
                  '判断用户对资源是否可读、可写。',
                  "access.canWrite('system:member')"
                ],
                [
                  'node.access(code)',
                  '组件只写裸资源码；无读隐藏，有读无写只读/禁用。',
                  "vInput({ access: 'system:member' })"
                ],
                [
                  'renderToString(page, { access })',
                  'SSR：把 access 传给入口，内部自动作用域。',
                  'renderToString(page, { access })'
                ]
              ].forEach(([name, purpose, example]) => {
                body.tr((row) => {
                  row.td((cell) => cell.code(name));
                  row.td(purpose);
                  row.td((cell) => cell.code(example));
                });
              });
            });
          });
        });

        page.section((setup) => {
          setup.className('components-access-docs-setup');
          setup.h2('初始化');
          setup.p(
            '权限上下文需先注入：SPA 用 installAccess 设一次；SSR 把 access 传给入口，入口内部自动作用域。'
          );
          setup.pre((pre) => {
            pre.className('access-api-signature');
            pre.code(
              "// SPA：登录后设一次\nimport { createAccess, installAccess } from '@yoyaflow/yoya-ui';\n\ninstallAccess(createAccess({ permissions: ['system:member'], roles: ['admin'] }));"
            );
          });
          setup.pre((pre) => {
            pre.className('access-api-signature');
            pre.code(
              "// SSR：每请求把 access 传给入口\nimport { createAccess } from '@yoyaflow/yoya-ui';\nimport { renderToString } from '@yoyaflow/yoya-ui/ssr';\n\nrenderToString(page, {\n  state,\n  access: createAccess({ permissions: ['system:member'], roles: ['admin'] })\n});"
            );
          });
        });

        page.section((examples) => {
          examples.className('components-access-docs-examples');
          examples.h2('代码演示');
          accessDemoDefinitions.forEach((demo) => {
            examples.child(AccessExampleSection(demo));
          });
        });
      });
    }
  };
}

function AccessExampleSection(demo) {
  const liveDemo = demo.component();
  const sourcePanel = ComponentSource({
    component: demo.component,
    sourceComponent: demo.sourceComponent,
    imports: demo.imports,
    title: demo.sourceTitle
  });

  return {
    render() {
      return section((example) => {
        example.className('components-access-demo');
        example.attr('data-access-demo', demo.id);
        example.h3(demo.title);
        example.p(demo.description);
        example.div((live) => {
          live.className('components-access-demo-live');
          live.attr('data-access-demo-live', 'true');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}
