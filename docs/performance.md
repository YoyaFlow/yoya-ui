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

**Run setup**: official runner `playwright` (headless) + Chrome for Testing 152.0.7977.64; CPU rows are medians of 15 samples (15 iterations per round; multiple rounds merged), memory / size / first paint are single samples; measured 2026-09-25, yoya version `0.7.0` (`76f5c1a`).

**Nine standard operations (ms, median)**

| Operation                | yoya now | vanillajs | now ÷ vanilla |
| ------------------------ | -------- | --------- | ------------- |
| 01 create 1k rows        | 35.7     | 31.0      | 1.15×         |
| 02 replace 1k rows       | 37.4     | 33.0      | 1.13×         |
| 03 update every 10th row | 21.3     | 22.8      | 0.93×         |
| 04 select row            | 6.0      | 6.8       | 0.88×         |
| 05 swap rows             | 24.1     | 21.9      | 1.10×         |
| 06 remove one row        | 18.3     | 16.5      | 1.11×         |
| 07 create 10k rows       | 426.5    | 335.4     | 1.27×         |
| 08 append 1k rows        | 39.8     | 33.9      | 1.17×         |
| 09 clear x8              | 20.3     | 14.7      | 1.38×         |

**script / paint split (ms, median)**

| Operation                | yoya script | yoya paint | vanilla script | vanilla paint |
| ------------------------ | ----------- | ---------- | -------------- | ------------- |
| 01 create 1k rows        | 5.7         | 29.2       | 2.2            | 28.4          |
| 02 replace 1k rows       | 8.6         | 28.0       | 4.4            | 28.1          |
| 03 update every 10th row | 1.6         | 17.7       | 0.8            | 19.4          |
| 04 select row            | 0.8         | 4.0        | 0.4            | 5.4           |
| 05 swap rows             | 3.0         | 19.7       | 0.4            | 18.7          |
| 06 remove one row        | 1.5         | 15.8       | 0.4            | 15.2          |
| 07 create 10k rows       | 64.8        | 357.4      | 23.7           | 307.2         |
| 08 append 1k rows        | 6.0         | 32.7       | 2.2            | 30.9          |
| 09 clear x8              | 18.6        | 1.5        | 11.3           | 1.8           |

**Memory / size / first paint**

| Metric                     | yoya now | vanillajs | now ÷ vanilla |
| -------------------------- | -------- | --------- | ------------- |
| 21 ready memory (MB)       | 1.33     | 1.05      | 1.26×         |
| 22 run memory (MB)         | 4.15     | 2.46      | 1.69×         |
| 25 run+clear memory (MB)   | 1.73     | 1.15      | 1.51×         |
| 41 size, uncompressed (KB) | 83.4     | 11.7      | 7.13×         |
| 42 size, brotli (KB)       | 22.3     | 2.5       | 8.92×         |
| 43 first paint (ms)        | 357.4    | 467.4     | 0.76×         |

<!-- benchmark:tables:end -->

## How to read it

- **script / paint split**: the official runner splits each operation into JS execution (script) and
  rendering (layout / paint / commit). yoya-ui's paint bucket matches vanilla in every row except `07`
  (−1.7 to +1.8 ms apart on `01`–`06` / `08` / `09`, i.e. inside the noise); what is left is the script
  bucket, `07`'s paint gap and memory.
- **create-style operations dominate**: `01 / 07 / 08` carry the largest script gap (+3.5 ms for 1k rows,
  +41.1 ms for 10k rows) — node construction, registration and the first DOM write. Incremental operations
  (`03 / 04 / 05 / 06`) are at or below vanilla: `03` 21.3 ms vs 22.8 ms, `04` 6.0 ms vs 6.8 ms.
- **The clear path is the remaining steady gap**: `09_clear1k_x8` is 20.3 ms against vanilla's 14.7 ms
  (script 18.6 ms vs 11.3 ms) — the single-pass destroy plus batched detach, down from 58 ms before that
  work.
- **`04` / `03` also reflect the entry's state model, not only the framework**: the yoya entry derives each
  row's selected class from one shared `selectedId` (`computed(() => selectedId.value === row.id)`), so a
  click wakes every row — the same shape as Vue's `:class` + `v-memo` entry, while React passes a per-row
  flag and memoizes rows, and the hand-written vanilla baseline touches only the two affected rows. Read the
  `04` cell with that in mind; the O(1) alternative (selection state on the row) is documented in
  `docs/component-authoring.md` §6.2.
- **Memory is still the biggest order-of-magnitude gap**: 4.15 MB vs vanilla's 2.46 MB (1.69×) after creating
  1000 rows. What remains is mostly DOM objects and V8 node headers.
- **Size is a known cost**: 83.4 KB / 22.3 KB brotli vs vanilla's 11.7 KB / 2.5 KB brotli — the gap between
  "a DSL plus a component library" and hand-written DOM calls (the compiled entry bundles its fragments and
  runtime hooks into the artifact). Both entries alias the app's `@yoyaflow/yoya-ui/core` import to
  `@yoyaflow/yoya-core`, so the business code and the compiled unit share one runtime instance: the compiled
  entry lands within ~4% of the runtime-only entry (83.4 KB vs 80.6 KB). Skip that alias and the artifact
  carries **two copies of the runtime** (145.6 KB, +76%) and the compiled rows subscribe on a second signal
  instance — see [benchmark/README.md](../benchmark/README.md).
- **first paint is a single sample**: the official runner samples it once; local repeats span roughly
  355–920 ms (357.4 ms this round), so do not read that cell as a precise value — and do not use it to judge
  a KB-level size change.

## Cross-harness numbers are not interchangeable

During development a self-built harness (msedge headless, reading the per-1000-row MB increment) was used
for before/after comparisons on the same machine; it lived in the local scratch area (`.scratch/`, removed
in the 2026-09-25 cleanup — recreate it from the description above if needed). **The absolute
values of the two setups are not interchangeable**: the official runner uses Chrome for Testing 152 with
playwright and times operations, while that harness reads
`performance.measureUserAgentSpecificMemory()` increments. The same code can differ by 1.5–3× between them,
so comparisons only hold within one setup.
