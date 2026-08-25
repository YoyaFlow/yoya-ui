import { section, vContainer } from '../../index.js';

export function AnchorStandaloneDemo() {
  const addSection = (id, title, text) =>
    section((node) => {
      node.id(id);
      node.style({
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        minHeight: '320px',
        padding: '20px'
      });
      node.h3(title);
      node.p(text);
      node.p('滚动右侧内容时，左侧锚点会自动标记当前区块。');
    });

  return {
    render() {
      return vContainer((page) => {
        page.className('anchor-standalone');
        page.viewport();
        page.vHeader((header) => {
          header.className('anchor-topbar');
          header.styles({
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '0 18px'
          });
          header.hstack((row) => {
            row.style({ alignItems: 'center', gap: '10px', height: '100%' });
            row.strong('文档工作区');
            row.span('章节导航');
          });
        });
        page.vContainer((body) => {
          body.fill();
          body.direction('row');
          body.vAside((aside) => {
            aside.className('anchor-sidebar');
            aside.styles({
              background: '#ffffff',
              borderRight: '1px solid #e2e8f0',
              padding: '16px',
              width: '240px'
            });
            aside.vAnchor((anchor) => {
              anchor.ariaLabel('文档目录');
              anchor.offset(16);
              anchor.target('.anchor-content');
              anchor.vAnchorItem((item) => {
                item.title('开始');
                item.href('#anchor-start');
              });
              anchor.vAnchorItem((item) => {
                item.title('基础用法');
                item.href('#anchor-basic');
                item.nested((sub) => {
                  sub.vAnchorItem({ href: '#anchor-api', title: 'API' });
                  sub.vAnchorItem({ href: '#anchor-events', title: '事件' });
                });
              });
              anchor.vAnchorItem((item) => {
                item.title('自定义');
                item.href('#anchor-custom');
              });
            });
          });
          body.vMain((content) => {
            content.className('anchor-content');
            content.styles({ background: '#f5f7fa', padding: '20px' });
            content.child(addSection('anchor-start', '开始', '介绍页面结构与阅读顺序。'));
            content.child(
              addSection('anchor-basic', '基础用法', '用 vAnchor 声明目录和滚动位置。')
            );
            content.child(addSection('anchor-api', 'API', 'vAnchorItem 支持 href、标题和嵌套项。'));
            content.child(addSection('anchor-events', '事件', '点击链接会平滑滚动并更新当前项。'));
            content.child(
              addSection('anchor-custom', '自定义', '通过 offset 和 target 适配页面布局。')
            );
          });
        });
      });
    }
  };
}
