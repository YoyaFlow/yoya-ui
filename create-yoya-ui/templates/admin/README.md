# yoya-ui 后台管理模板

标准管理后台布局：

- 左上角：logo + 系统名
- 中间：顶级导航
- 右上角：用户头像
- 下方：左侧可折叠菜单 + 右侧带标题的 RouterViews 内容区
- 点击顶级导航切换左侧菜单与内容路由

## 启动

```bash
npm install
npm run dev
```

## 结构

```text
src/
  main.js   管理台壳：模块配置、路由、顶部导航、侧栏切换、内容区
```

扩展新模块：在 `main.js` 的 `modules` 数组里加一组 `{ key, label, icon, routes }` 即可。
