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

**Run setup**: official runner `playwright` (headless) + Chrome for Testing 152.0.7977.64; CPU rows are medians of 15 samples (15 iterations per round; multiple rounds merged), memory / size / first paint are single samples; measured 2026-09-20, yoya version `0.6.12` (`76c515b`).

**Nine standard operations (ms, median)**

| Operation                | yoya now | vanillajs | now ÷ vanilla |
| ------------------------ | -------- | --------- | ------------- |
| 01 create 1k rows        | 35.0     | 30.5      | 1.15×         |
| 02 replace 1k rows       | 37.0     | 33.4      | 1.11×         |
| 03 update every 10th row | 21.9     | 23.0      | 0.95×         |
| 04 select row            | 7.4      | 7.5       | 0.99×         |
| 05 swap rows             | 27.4     | 24.1      | 1.14×         |
| 06 remove one row        | 20.8     | 20.0      | 1.04×         |
| 07 create 10k rows       | 393.5    | 337.1     | 1.17×         |
| 08 append 1k rows        | 41.3     | 38.7      | 1.07×         |
| 09 clear x8              | 22.1     | 15.5      | 1.43×         |

**script / paint split (ms, median)**

| Operation                | yoya script | yoya paint | vanilla script | vanilla paint |
| ------------------------ | ----------- | ---------- | -------------- | ------------- |
| 01 create 1k rows        | 5.1         | 29.6       | 2.2            | 27.8          |
| 02 replace 1k rows       | 8.0         | 28.4       | 4.3            | 28.8          |
| 03 update every 10th row | 1.6         | 18.1       | 0.8            | 20.2          |
| 04 select row            | 1.0         | 5.2        | 0.4            | 5.9           |
| 05 swap rows             | 3.2         | 21.5       | 0.4            | 21.0          |
| 06 remove one row        | 1.4         | 17.1       | 0.4            | 18.5          |
| 07 create 10k rows       | 57.7        | 332.1      | 24.1           | 308.1         |
| 08 append 1k rows        | 5.6         | 34.6       | 2.3            | 35.6          |
| 09 clear x8              | 17.5        | 2.2        | 11.9           | 2.0           |

**Memory / size / first paint**

| Metric                     | yoya now | vanillajs | now ÷ vanilla |
| -------------------------- | -------- | --------- | ------------- |
| 21 ready memory (MB)       | 1.36     | 1.06      | 1.28×         |
| 22 run memory (MB)         | 4.08     | 2.45      | 1.66×         |
| 25 run+clear memory (MB)   | 1.69     | 1.09      | 1.55×         |
| 41 size, uncompressed (KB) | 78.3     | 11.7      | 6.69×         |
| 42 size, brotli (KB)       | 21.2     | 2.5       | 8.48×         |
| 43 first paint (ms)        | 370.4    | 276.4     | 1.34×         |

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
