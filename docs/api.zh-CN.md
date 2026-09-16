# 请求与通讯辅助约定

`@yoyaflow/yoya-ui/api` 是一组**可选的通讯辅助约束**，不是渲染核心的一部分。它只约定三件事：

1. 请求命令继承 `RequestBase`，用方法描述 `address()` / `method()` / `params()` / `body()`；
2. 应用启动时用 `configureRequest({ submit })` 注册传输层；
3. 传输返回统一 raw 结构，由 `Result.from(raw, command)` 归一为 detail / list / page。

```js
import { configureRequest, RequestBase, Result } from '@yoyaflow/yoya-ui/api';

class MemberQuery extends RequestBase {
  constructor({ page = 1 } = {}) {
    super();
    this.page = page;
  }

  address() {
    return '/members';
  }

  params() {
    return { page: this.page };
  }
}

configureRequest({
  async submit(request) {
    const response = await fetch(request.address());
    return Result.from(await response.json(), request);
  }
});

const result = await new MemberQuery({ page: 2 }).submit();
```

## 迁移

0.6 之前这些符号从 root / core 入口导出。现在通讯层独立为 `api` 子入口：

```diff
-import { RequestBase, Result, configureRequest } from '@yoyaflow/yoya-ui';
+import { RequestBase, Result, configureRequest } from '@yoyaflow/yoya-ui/api';
```

`core` 与 root 入口不再导出通讯符号。它们与节点渲染、Signals、router 无共享状态；不使用这组约定不会影响库的其他能力。
