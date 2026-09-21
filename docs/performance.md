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

**Run setup**: official runner `playwright` (headless) + Chrome for Testing 152.0.7977.64; CPU rows are medians of 15 samples (15 iterations per round; multiple rounds merged), memory / size / first paint are single samples; measured 2026-09-20, yoya version `0.6.13` (`fd7ed2d`).

**Nine standard operations (ms, median)**

| Operation                | yoya now | vanillajs | now ÷ vanilla |
| ------------------------ | -------- | --------- | ------------- |
| 01 create 1k rows        | 34.6     | 31.2      | 1.11×         |
| 02 replace 1k rows       | 37.9     | 32.6      | 1.16×         |
| 03 update every 10th row | 26.5     | 24.9      | 1.06×         |
| 04 select row            | 7.5      | 8.5       | 0.88×         |
| 05 swap rows             | 28.1     | 24.5      | 1.15×         |
| 06 remove one row        | 21.9     | 20.4      | 1.07×         |
| 07 create 10k rows       | 400.4    | 356.0     | 1.12×         |
| 08 append 1k rows        | 43.3     | 38.0      | 1.14×         |
| 09 clear x8              | 24.7     | 17.8      | 1.39×         |

**script / paint split (ms, median)**

| Operation                | yoya script | yoya paint | vanilla script | vanilla paint |
| ------------------------ | ----------- | ---------- | -------------- | ------------- |
| 01 create 1k rows        | 5.2         | 28.6       | 2.2            | 28.6          |
| 02 replace 1k rows       | 8.1         | 29.0       | 4.3            | 27.9          |
| 03 update every 10th row | 1.8         | 22.5       | 0.8            | 21.4          |
| 04 select row            | 1.0         | 5.6        | 0.4            | 6.9           |
| 05 swap rows             | 3.4         | 22.3       | 0.4            | 21.7          |
| 06 remove one row        | 1.5         | 19.2       | 0.4            | 18.9          |
| 07 create 10k rows       | 58.4        | 337.7      | 25.3           | 324.7         |
| 08 append 1k rows        | 6.0         | 36.2       | 2.3            | 34.9          |
| 09 clear x8              | 20.4        | 2.6        | 13.5           | 2.1           |

**Memory / size / first paint**

| Metric                     | yoya now | vanillajs | now ÷ vanilla |
| -------------------------- | -------- | --------- | ------------- |
| 21 ready memory (MB)       | 1.35     | 1.05      | 1.29×         |
| 22 run memory (MB)         | 4.07     | 2.45      | 1.67×         |
| 25 run+clear memory (MB)   | 1.69     | 1.16      | 1.45×         |
| 41 size, uncompressed (KB) | 78.3     | 11.7      | 6.69×         |
| 42 size, brotli (KB)       | 21.2     | 2.5       | 8.48×         |
| 43 first paint (ms)        | 403.5    | 342.8     | 1.18×         |

<!-- benchmark:tables:end -->

## How to read it

- **script / paint split**: the official runner splits each operation into JS execution (script) and
  rendering (layout / paint / commit). yoya-ui's paint bucket matches vanilla in every row except `07`
  (0.0–1.3 ms apart on `01`–`06` / `08` / `09`, i.e. inside the noise); what is left is the script bucket,
  `07`'s ~13 ms paint gap and memory.
- **create-style operations dominate**: `01 / 07 / 08` carry the largest script gap (+3.0 ms for 1k rows,
  +33.1 ms for 10k rows) — node construction, registration and the first DOM write. Incremental operations
  (`03 / 04 / 05 / 06`) are already close to vanilla, and `04` lands ahead (7.5 ms vs 8.5 ms).
- **The clear path is the remaining steady gap**: `09_clear1k_x8` is 24.7 ms against vanilla's 17.8 ms
  (script 20.4 ms vs 13.5 ms) — the single-pass destroy plus batched detach, down from 58 ms before that
  work.
- **`04` / `03` also reflect the entry's state model, not only the framework**: the yoya entry derives each
  row's selected class from one shared `selectedId` (`computed(() => selectedId.value === row.id)`), so a
  click wakes every row — the same shape as Vue's `:class` + `v-memo` entry, while React passes a per-row
  flag and memoizes rows, and the hand-written vanilla baseline touches only the two affected rows. Read the
  `04` cell with that in mind; the O(1) alternative (selection state on the row) is documented in
  `docs/component-authoring.md` §6.2.
- **Memory is still the biggest order-of-magnitude gap**: 4.07 MB vs vanilla's 2.45 MB (1.67×) after creating
  1000 rows. What remains is mostly DOM objects and V8 node headers.
- **Size is a known cost**: 78.3 KB / 21.2 KB brotli vs vanilla's 11.7 KB / 2.5 KB brotli — the gap between
  "a DSL plus a component library" and hand-written DOM calls (the compiled entry bundles its fragments and
  runtime hooks into the artifact).
- **first paint is a single sample**: the official runner samples it once; local repeats span roughly
  300–440 ms (403.5 ms this round), so do not read that cell as a precise value — and do not use it to judge
  a KB-level size change.

## Cross-harness numbers are not interchangeable

This repository also keeps a self-built harness (`.scratch/perf-1x/`, msedge headless, reading the
per-1000-row MB increment). It exists for before/after comparisons on the same machine. **The absolute
values of the two setups are not interchangeable**: the official runner uses Chrome for Testing 152 with
playwright and times operations, while the harness reads
`performance.measureUserAgentSpecificMemory()` increments. The same code can differ by 1.5–3× between them,
so comparisons only hold within one setup.
