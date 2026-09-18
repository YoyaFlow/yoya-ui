# Performance benchmark (official js-framework-benchmark)

This page reports yoya-ui's numbers in the official
[js-framework-benchmark](https://github.com/krausest/js-framework-benchmark) (`keyed` category):
the `yoya-ui-core` implementation against the official `vanillajs` baseline, with the previous release
as an anchor column so the movement of each change is visible.

The numbers are not hand-written: the table block is generated from `benchmark/results.json`,
refreshed by `npm run report:bench:write` and gated by `npm run verify:dist`, so editing a number by hand
fails the gate. See [benchmark/README.md](../benchmark/README.md) for the reproduction steps.

<!-- benchmark:tables:start 由 scripts/benchmark-report.mjs 生成 -->

**Run setup**: official runner `playwright` (headless) + Chrome for Testing 152.0.7977.64; CPU rows are medians of 30 samples (15 iterations per round; multiple rounds merged), memory / size / first paint are single samples; measured 2026-09-18, yoya version `0.6.3-perf` (`7ce7bf2`).

**Nine standard operations (ms, median)**

| Operation                | yoya 0.6.2 | yoya now | vanillajs | now ÷ vanilla |
| ------------------------ | ---------- | -------- | --------- | ------------- |
| 01 create 1k rows        | 55.3       | 49.1     | 31.0      | 1.58×         |
| 02 replace 1k rows       | 63.2       | 49.9     | 34.2      | 1.46×         |
| 03 update every 10th row | 21.1       | 21.1     | 21.8      | 0.97×         |
| 04 select row            | 8.7        | 7.8      | 7.0       | 1.13×         |
| 05 swap rows             | 27.0       | 27.8     | 22.8      | 1.22×         |
| 06 remove one row        | 19.0       | 18.6     | 18.0      | 1.03×         |
| 07 create 10k rows       | 547.9      | 505.9    | 343.0     | 1.47×         |
| 08 append 1k rows        | 57.6       | 50.9     | 35.0      | 1.46×         |
| 09 clear x8              | 58.0       | 26.1     | 15.0      | 1.74×         |

**script / paint split (ms, median)**

| Operation                | yoya script | yoya paint | vanilla script | vanilla paint |
| ------------------------ | ----------- | ---------- | -------------- | ------------- |
| 01 create 1k rows        | 18.0        | 30.2       | 2.2            | 28.3          |
| 02 replace 1k rows       | 19.0        | 30.2       | 4.4            | 29.3          |
| 03 update every 10th row | 1.4         | 17.2       | 0.8            | 17.8          |
| 04 select row            | 2.2         | 4.3        | 0.4            | 5.4           |
| 05 swap rows             | 3.0         | 22.3       | 0.4            | 20.5          |
| 06 remove one row        | 0.8         | 16.6       | 0.4            | 16.4          |
| 07 create 10k rows       | 192.6       | 307.5      | 25.1           | 312.5         |
| 08 append 1k rows        | 16.3        | 33.6       | 2.2            | 31.8          |
| 09 clear x8              | 22.5        | 2.2        | 11.4           | 1.9           |

**Memory / size / first paint**

| Metric                     | yoya 0.6.2 | yoya now | vanillajs | now ÷ vanilla |
| -------------------------- | ---------- | -------- | --------- | ------------- |
| 21 ready memory (MB)       | 1.23       | 1.37     | 1.05      | 1.30×         |
| 22 run memory (MB)         | 11.03      | 5.67     | 2.40      | 2.36×         |
| 25 run+clear memory (MB)   | 1.86       | 1.84     | 1.16      | 1.59×         |
| 41 size, uncompressed (KB) | 59.1       | 99.5     | 11.7      | 8.50×         |
| 42 size, brotli (KB)       | 16.2       | 26.6     | 2.5       | 10.64×        |
| 43 first paint (ms)        | 317.8      | 396.3    | 387.3     | 1.02×         |

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
- **Memory is still the biggest order-of-magnitude gap**: 6.15 MB vs vanilla's 2.45 MB (2.51×) after creating
  1000 rows — 44% below 0.6.2's 11.03 MB. What remains is mostly DOM objects and V8 node headers.
- **Size is a known cost**: the non-tree-shakeable core makes a page 5–7× vanilla's size
  (62.7 KB / 17.1 KB brotli vs 11.7 KB / 2.5 KB brotli) — the gap between "a DSL plus a component library"
  and hand-written DOM calls.
- **first paint is a single sample**: the official runner samples it once; five local repeats span roughly
  303–410 ms (median 306.8 ms), so do not read that cell as a precise value — and do not use it to judge a
  KB-level size change.

## Cross-harness numbers are not interchangeable

This repository also keeps a self-built harness (`.scratch/perf-1x/`, msedge headless, reading the
per-1000-row MB increment). It exists for before/after comparisons on the same machine. **The absolute
values of the two setups are not interchangeable**: the official runner uses Chrome for Testing 152 with
playwright and times operations, while the harness reads
`performance.measureUserAgentSpecificMemory()` increments. The same 0.6.2 code can differ by 1.5–3× between
them (for example, the 1k-create script bucket: 26.0 ms official vs 14.6 ms in the harness), so comparisons
only hold within one setup.
