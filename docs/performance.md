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

**Run setup**: official runner `playwright` (headless) + Chrome for Testing 152.0.7977.64; CPU rows are medians of 15 samples (15 iterations per round; multiple rounds merged), memory / size / first paint are single samples; measured 2026-09-20, yoya version `0.6.11` (`cc61971`).

**Nine standard operations (ms, median)**

| Operation                | yoya now | vanillajs | now ÷ vanilla |
| ------------------------ | -------- | --------- | ------------- |
| 01 create 1k rows        | 34.5     | 30.7      | 1.12×         |
| 02 replace 1k rows       | 37.7     | 32.1      | 1.17×         |
| 03 update every 10th row | 23.6     | 21.5      | 1.10×         |
| 04 select row            | 5.9      | 7.4       | 0.80×         |
| 05 swap rows             | 148.5    | 22.9      | 6.48×         |
| 06 remove one row        | 17.7     | 17.1      | 1.04×         |
| 07 create 10k rows       | 407.4    | 365.3     | 1.12×         |
| 08 append 1k rows        | 38.9     | 35.1      | 1.11×         |
| 09 clear x8              | 23.7     | 16.1      | 1.47×         |

**script / paint split (ms, median)**

| Operation                | yoya script | yoya paint | vanilla script | vanilla paint |
| ------------------------ | ----------- | ---------- | -------------- | ------------- |
| 01 create 1k rows        | 5.2         | 28.5       | 2.1            | 28.1          |
| 02 replace 1k rows       | 8.3         | 28.7       | 4.3            | 27.2          |
| 03 update every 10th row | 1.6         | 19.6       | 0.8            | 17.5          |
| 04 select row            | 0.8         | 4.2        | 0.4            | 5.9           |
| 05 swap rows             | 19.7        | 125.6      | 0.4            | 20.6          |
| 06 remove one row        | 0.8         | 15.8       | 0.4            | 16.0          |
| 07 create 10k rows       | 55.9        | 339.4      | 24.9           | 332.2         |
| 08 append 1k rows        | 5.2         | 32.7       | 2.2            | 32.1          |
| 09 clear x8              | 19.9        | 2.2        | 11.9           | 2.0           |

**Memory / size / first paint**

| Metric                     | yoya now | vanillajs | now ÷ vanilla |
| -------------------------- | -------- | --------- | ------------- |
| 21 ready memory (MB)       | 1.34     | 1.05      | 1.28×         |
| 22 run memory (MB)         | 3.99     | 2.44      | 1.64×         |
| 25 run+clear memory (MB)   | 1.69     | 1.09      | 1.56×         |
| 41 size, uncompressed (KB) | 78.2     | 11.7      | 6.68×         |
| 42 size, brotli (KB)       | 21.1     | 2.5       | 8.44×         |
| 43 first paint (ms)        | 381.9    | 269.2     | 1.42×         |

<!-- benchmark:tables:end -->

## How to read it

- **script / paint split**: the official runner splits each operation into JS execution (script) and
  rendering (layout / paint / commit). yoya-ui's paint bucket matches vanilla (0.2–3 ms apart, inside the
  noise); what is left is the script bucket and memory.
- **create-style operations dominate**: `01 / 07 / 08` carry the largest script gap (~18 ms for 1k rows,
  ~195 ms for 10k rows) — node construction, registration and the first DOM write. Incremental operations
  (`03 / 04 / 05 / 06`) are already close to vanilla.
- **The clear path has caught up**: `09_clear1k_x8` went from 58 ms to 22.5 ms (vanilla: 15.5 ms), the result
  of the single-pass destroy plus batched detach.
- **`04` / `03` also reflect the entry's state model, not only the framework**: the yoya entry derives each
  row's selected class from one shared `selectedId` (`computed(() => selectedId.value === row.id)`), so a
  click wakes every row — the same shape as Vue's `:class` + `v-memo` entry, while React passes a per-row
  flag and memoizes rows, and the hand-written vanilla baseline touches only the two affected rows. Read the
  `04` cell with that in mind; the O(1) alternative (selection state on the row) is documented in
  `docs/component-authoring.md` §6.2.
- **Memory is still the biggest order-of-magnitude gap**: 3.92 MB vs vanilla's 2.43 MB (1.61×) after creating
  1000 rows. What remains is mostly DOM objects and V8 node headers.
- **Size is a known cost**: 83.8 KB / 20.9 KB brotli vs vanilla's 11.7 KB / 2.5 KB brotli — the gap between
  "a DSL plus a component library" and hand-written DOM calls (the compiled entry bundles its fragments and
  runtime hooks into the artifact).
- **first paint is a single sample**: the official runner samples it once; local repeats span roughly
  300–430 ms (339.5 ms this round), so do not read that cell as a precise value — and do not use it to judge
  a KB-level size change.

## Cross-harness numbers are not interchangeable

This repository also keeps a self-built harness (`.scratch/perf-1x/`, msedge headless, reading the
per-1000-row MB increment). It exists for before/after comparisons on the same machine. **The absolute
values of the two setups are not interchangeable**: the official runner uses Chrome for Testing 152 with
playwright and times operations, while the harness reads
`performance.measureUserAgentSpecificMemory()` increments. The same code can differ by 1.5–3× between them,
so comparisons only hold within one setup.
