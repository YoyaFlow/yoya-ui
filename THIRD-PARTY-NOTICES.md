# Third-party notices

## @preact/signals-core (vendored snapshot)

- File: `src/core/signals/vendor/signals-core.js`
- Version: `1.14.4`
- Source: <https://github.com/preactjs/signals> (`packages/core`)
- License: MIT — Copyright (c) 2022-present Preact Team
- License text: [`LICENSES/preact-signals-MIT.txt`](LICENSES/preact-signals-MIT.txt)
- Modifications: dropped the `sourceMappingURL` line; prepended a license banner.

The snapshot is frozen on purpose and is not updated with upstream releases. Newer upstream
versions are consumed through a signals engine plugin instead (see `docs/` signals guide).
The vendored file is excluded from lint and formatting so it stays diffable against upstream.
