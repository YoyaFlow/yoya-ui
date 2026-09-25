# Performance benchmark (official js-framework-benchmark)

This page reports yoya-ui's numbers in the official
[js-framework-benchmark](https://github.com/krausest/js-framework-benchmark) (`keyed` category):
the **AST-compiled implementation (`yoya-ui-ast`)** against the official `vanillajs` baseline, with
same-round comparison columns (the runtime build `yoya-ui-runtime`, Vue, React, Solid, Svelte) so both
the movement of each change and the standing against other frameworks are visible. The report page
shades the cells where yoya is faster (green) or slower (red); differences within ±5% stay unshaded.

The numbers are not hand-written: the table block is generated from `benchmark/results.json`,
refreshed by `npm run report:bench:write` and gated by `npm run verify:dist`, so editing a number by hand
fails the gate. See [benchmark/README.md](../benchmark/README.md) for the reproduction steps.

<!-- benchmark:tables:start 由 scripts/benchmark-report.mjs 生成 -->

**Run setup**: official runner `playwright` (headless) + Chrome for Testing 152.0.7977.64; CPU rows are medians of 15 samples (15 iterations per round; multiple rounds merged), memory / size / first paint are single samples; measured 2026-09-25, yoya version `0.7.3` (`e21f35d`).

**Nine standard operations (ms, median)**

| Operation                | yoya now | vanillajs | now ÷ vanilla |
| ------------------------ | -------- | --------- | ------------- |
| 01 create 1k rows        | 35.3     | 30.5      | 1.16×         |
| 02 replace 1k rows       | 38.5     | 32.8      | 1.17×         |
| 03 update every 10th row | 20.5     | 22.4      | 0.92×         |
| 04 select row            | 5.8      | 7.3       | 0.79×         |
| 05 swap rows             | 26.9     | 22.1      | 1.22×         |
| 06 remove one row        | 18.0     | 16.8      | 1.07×         |
| 07 create 10k rows       | 395.7    | 330.4     | 1.20×         |
| 08 append 1k rows        | 39.7     | 34.4      | 1.15×         |
| 09 clear x8              | 20.6     | 15.3      | 1.35×         |

**script / paint split (ms, median)**

| Operation                | yoya script | yoya paint | vanilla script | vanilla paint |
| ------------------------ | ----------- | ---------- | -------------- | ------------- |
| 01 create 1k rows        | 5.5         | 29.2       | 2.2            | 27.8          |
| 02 replace 1k rows       | 8.6         | 29.1       | 4.3            | 27.6          |
| 03 update every 10th row | 1.6         | 17.5       | 0.8            | 19.1          |
| 04 select row            | 0.8         | 4.1        | 0.4            | 5.6           |
| 05 swap rows             | 3.0         | 20.9       | 0.4            | 19.9          |
| 06 remove one row        | 1.4         | 15.3       | 0.4            | 15.3          |
| 07 create 10k rows       | 62.4        | 329.4      | 23.7           | 301.1         |
| 08 append 1k rows        | 6.2         | 32.3       | 2.2            | 31.5          |
| 09 clear x8              | 17.1        | 2.0        | 11.6           | 1.8           |

**Memory / size / first paint**

| Metric                     | yoya now | vanillajs | now ÷ vanilla |
| -------------------------- | -------- | --------- | ------------- |
| 21 ready memory (MB)       | 1.33     | 1.02      | 1.31×         |
| 22 run memory (MB)         | 4.12     | 2.44      | 1.69×         |
| 25 run+clear memory (MB)   | 1.64     | 1.16      | 1.41×         |
| 41 size, uncompressed (KB) | 76.6     | 11.7      | 6.55×         |
| 42 size, brotli (KB)       | 20.6     | 2.5       | 8.24×         |
| 43 first paint (ms)        | 382.5    | 265.4     | 1.44×         |

<!-- benchmark:tables:end -->

## How to read it

- **script / paint split**: the official runner splits each operation into JS execution (script) and
  rendering (layout / paint / commit). yoya-ui's paint bucket matches vanilla in every row except `07`
  (−1.6 to +1.5 ms apart on `01`–`06` / `08` / `09`, i.e. inside the noise); what is left is the script
  bucket, `07`'s paint gap and memory.
- **create-style operations dominate**: `01 / 07 / 08` carry the largest script gap (+3.3 ms for 1k rows,
  +38.7 ms for 10k rows) — node construction, registration and the first DOM write. Incremental operations
  (`03 / 04 / 05 / 06`) are at or below vanilla: `03` 20.5 ms vs 22.4 ms, `04` 5.8 ms vs 7.3 ms.
- **The clear path is the remaining steady gap**: `09_clear1k_x8` is 20.6 ms against vanilla's 15.3 ms
  (script 17.1 ms vs 11.6 ms) — the single-pass destroy plus batched detach, down from 58 ms before that
  work.
- **`04` / `03` also reflect the entry's state model, not only the framework**: the yoya entry derives each
  row's selected class from one shared `selectedId` (`computed(() => selectedId.value === row.id)`), so a
  click wakes every row — the same shape as Vue's `:class` + `v-memo` entry, while React passes a per-row
  flag and memoizes rows, and the hand-written vanilla baseline touches only the two affected rows. Read the
  `04` cell with that in mind; the O(1) alternative (selection state on the row) is documented in
  `docs/component-authoring.md` §6.2.
- **Memory is still the biggest order-of-magnitude gap**: 4.12 MB vs vanilla's 2.44 MB (1.69×) after creating
  1000 rows. What remains is mostly DOM objects and V8 node headers.
- **Size is a known cost**: 76.6 KB / 20.6 KB brotli vs vanilla's 11.7 KB / 2.5 KB brotli — the gap between
  "a DSL plus a component library" and hand-written DOM calls (the compiled entry bundles its fragments and
  runtime hooks into the artifact). Since 0.7.1 `@yoyaflow/yoya-ui/core` is itself a forwarding entry (to
  `@yoyaflow/yoya-core`), so the business code and the compiled unit share one runtime instance: the compiled
  entry lands within ~4% of the runtime-only entry (76.6 KB vs 73.9 KB). Historically the two lived on
  different module graphs (self-contained vs modular), so one bundle carried **two copies of the runtime**
  (145.6 KB, +76%) and the compiled rows subscribed on a second signal instance; the package entry now
  closes that trap, so the entries no longer need an alias — see
  [benchmark/README.md](../benchmark/README.md).
- **first paint is a single sample**: the official runner samples it once; local repeats span roughly
  355–920 ms (382.5 ms this round), so do not read that cell as a precise value — and do not use it to judge
  a KB-level size change.

## Cross-harness numbers are not interchangeable

During development a self-built harness (msedge headless, reading the per-1000-row MB increment) was used
for before/after comparisons on the same machine; it lived in the local scratch area (`.scratch/`, removed
in the 2026-09-25 cleanup — recreate it from the description above if needed). **The absolute
values of the two setups are not interchangeable**: the official runner uses Chrome for Testing 152 with
playwright and times operations, while that harness reads
`performance.measureUserAgentSpecificMemory()` increments. The same code can differ by 1.5–3× between them,
so comparisons only hold within one setup.
