# Request and communication helpers

`@yoyaflow/yoya-ui/api` is an **optional communication convention**, not part of the rendering core. It defines three pieces:

1. A request command extends `RequestBase` and describes `address()` / `method()` / `params()` / `body()` with methods.
2. The application registers one transport with `configureRequest({ submit })`.
3. The transport returns a raw envelope, and `Result.from(raw, command)` normalizes it into detail / list / page.

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

## Migration

Before 0.6 these symbols were exported from the root / core entries. The communication layer now has its own `api` subpath:

```diff
-import { RequestBase, Result, configureRequest } from '@yoyaflow/yoya-ui';
+import { RequestBase, Result, configureRequest } from '@yoyaflow/yoya-ui/api';
```

The `core` and root entries no longer export communication symbols. They share no state with node rendering, Signals, or the router; ignoring this convention does not affect the rest of the library.
