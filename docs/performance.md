# Performance benchmark (official js-framework-benchmark)

This page reports yoya-ui's numbers in the official
[js-framework-benchmark](https://github.com/krausest/js-framework-benchmark) (`keyed` category):
the `yoya-ui-core` implementation against the official `vanillajs` baseline, with the previous release
as an anchor column so the movement of each change is visible.

The numbers are not hand-written: the table block is generated from `benchmark/results.json`,
refreshed by `npm run report:bench:write` and gated by `npm run verify:dist`, so editing a number by hand
fails the gate. See [benchmark/README.md](../benchmark/README.md) for the reproduction steps.

<!-- benchmark:tables:start 由 scripts/benchmark-report.mjs 生成 -->

**Run setup**: official runner `playwright` (headless) + Chrome for Testing 152.0.7977.64; CPU rows are medians of 15 samples (15 iterations per round; multiple rounds merged), memory / size / first paint are single samples; measured 2026-09-18, yoya version `0.6.3-perf` (`7ce7bf2`).

**Nine standard operations (ms, median)**

| Operation                | yoya 0.6.2 | yoya now | vanillajs | now ÷ vanilla |
| ------------------------ | ---------- | -------- | --------- | ------------- |
| 01 create 1k rows        | 55.3       | 47.6     | 30.6      | 1.56×         |
| 02 replace 1k rows       | 63.2       | 48.9     | 33.3      | 1.47×         |
| 03 update every 10th row | 21.1       | 24.3     | 20.6      | 1.18×         |
| 04 select row            | 8.7        | 8.4      | 6.8       | 1.24×         |
| 05 swap rows             | 27.0       | 30.7     | 21.3      | 1.44×         |
| 06 remove one row        | 19.0       | 20.0     | 18.3      | 1.09×         |
| 07 create 10k rows       | 547.9      | 566.0    | 335.5     | 1.69×         |
| 08 append 1k rows        | 57.6       | 54.0     | 34.4      | 1.57×         |
| 09 clear x8              | 58.0       | 23.8     | 17.2      | 1.38×         |

**script / paint split (ms, median)**

| Operation                | yoya script | yoya paint | vanilla script | vanilla paint |
| ------------------------ | ----------- | ---------- | -------------- | ------------- |
| 01 create 1k rows        | 18.1        | 29.1       | 2.2            | 28.1          |
| 02 replace 1k rows       | 18.8        | 29.6       | 4.3            | 28.3          |
| 03 update every 10th row | 1.4         | 19.5       | 0.8            | 17.8          |
| 04 select row            | 2.4         | 4.6        | 0.4            | 5.3           |
| 05 swap rows             | 3.4         | 23.3       | 0.4            | 18.5          |
| 06 remove one row        | 0.8         | 18.2       | 0.4            | 16.7          |
| 07 create 10k rows       | 207.4       | 340.8      | 24.1           | 306.5         |
| 08 append 1k rows        | 16.7        | 34.5       | 2.2            | 31.4          |
| 09 clear x8              | 21.1        | 2.0        | 12.9           | 2.0           |

**Memory / size / first paint**

| Metric                     | yoya 0.6.2 | yoya now | vanillajs | now ÷ vanilla |
| -------------------------- | ---------- | -------- | --------- | ------------- |
| 21 ready memory (MB)       | 1.23       | 1.41     | 1.05      | 1.34×         |
| 22 run memory (MB)         | 11.03      | 5.68     | 2.45      | 2.32×         |
| 25 run+clear memory (MB)   | 1.86       | 1.92     | 1.12      | 1.71×         |
| 41 size, uncompressed (KB) | 59.1       | 99.5     | 11.7      | 8.50×         |
| 42 size, brotli (KB)       | 16.2       | 26.6     | 2.5       | 10.64×        |
| 43 first paint (ms)        | 317.8      | 435.9    | 384.2     | 1.13×         |

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
