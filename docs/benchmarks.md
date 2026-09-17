# Core benchmark report

Definitions, comparability rules and the exact measurement recipe live in `benchmarks/PLAN.md`.

## Environment

- browser: msedge / 136.0.3240.64
- machine: win32 10.0.26200 x64 · CPU × 28
- node: v22.21.1 · package: 0.6.0 · commit: da226fe
- runs: 15 measured per operation
- date: 2026-09-17T03:54:47.352Z

## Standard operations (keyed, core base elements)

| Operation  | Median   | p95      | Work     | Rows  | DOM nodes | Guards |
| ---------- | -------- | -------- | -------- | ----- | --------- | ------ |
| `run`      | 42.3 ms  | 58.1 ms  | 18.3 ms  | 1000  | 7002      | pass   |
| `replace`  | 55.3 ms  | 88.9 ms  | 30.5 ms  | 1000  | 7002      | pass   |
| `runlots`  | 509.7 ms | 602.6 ms | 244.9 ms | 10000 | 70002     | pass   |
| `add`      | 50.4 ms  | 55.8 ms  | 20.8 ms  | 2000  | 14002     | pass   |
| `update`   | 17.8 ms  | 33.7 ms  | 0.4 ms   | 1000  | 7002      | pass   |
| `select`   | 5.9 ms   | 13.8 ms  | 0 ms     | 1000  | 7002      | pass   |
| `remove`   | 12.6 ms  | 19.3 ms  | 0.6 ms   | 999   | 6995      | pass   |
| `swaprows` | 29.4 ms  | 36.2 ms  | 4 ms     | 1000  | 7002      | pass   |
| `clear`    | 16.7 ms  | 28.9 ms  | 12 ms    | 0     | 2         | pass   |

### Metrics

- **median / p95 / IQR**: click → DOM settled (the user-visible cost; in headless Chromium the floor is about one frame).
- **work**: click → last DOM change (engine work, insensitive to frame cadence).
- **rows / DOM nodes**: the row count the operation must leave behind, and the real element count.
- **guards**: deterministic regression checks (see below); a guard failure fails the run.

## Startup (median of fresh pages)

- client `bindTo()`: ready 33 ms · first paint 28 ms
- SSR + hydrate: server render 0.9 ms · client hydrate 0.6 ms · ready 32.6 ms

## Memory

- Heap sampled after a forced GC (MB).
- initial 2.57 · 1k rows 16.75 · 10k rows 141.21 · after clear 11.72
- residue after clear 9.15 · after 10 create/clear rounds 16.54

## Virtualized list (logical rows vs real DOM)

| Logical rows | Real nodes | Rendered rows | Jump to end | Append 1k | Heap MB |
| ------------ | ---------- | ------------- | ----------- | --------- | ------- |
| 1000         | 84         | 20            | 11.6 ms     | 11.6 ms   | 3.88    |
| 10000        | 84         | 20            | 11.9 ms     | 11.5 ms   | 4.96    |
| 100000       | 84         | 20            | 11.6 ms     | 12.5 ms   | 15.78   |

## Component overhead: core base elements vs UI components

Both columns are yoya-ui code — **this is not "the library versus plain HTML"**. The left column builds rows from the **core layer** (element factories: `tr/td`), the right column uses the **UI layer** (official components: `vTable/vTr/vTd`). The left column is the **control baseline**, so the difference is what the UI component layer costs. Values are the work time (click → last DOM change, median), which is insensitive to frame latency.

| Operation                    | Core base elements (work) | UI components (work) | Core base element nodes | UI component nodes |
| ---------------------------- | ------------------------- | -------------------- | ----------------------- | ------------------ |
| `run` (create 1,000)         | 18.3 ms                   | 46.8 ms              | 7002                    | 7005               |
| `replace` (replace all)      | 30.5 ms                   | 60.6 ms              | 7002                    | 7005               |
| `runlots` (create 10,000)    | 244.9 ms                  | 476.3 ms             | 70002                   | 70005              |
| `add` (append 1,000)         | 20.8 ms                   | 44.3 ms              | 14002                   | 14005              |
| `update` (update every 10th) | 0.4 ms                    | 0.5 ms               | 7002                    | 7005               |
| `select` (select row)        | 0 ms                      | 0 ms                 | 7002                    | 7005               |
| `remove` (remove row)        | 0.6 ms                    | 0.8 ms               | 6995                    | 6998               |
| `swaprows` (swap rows)       | 4 ms                      | 4.9 ms               | 7002                    | 7005               |
| `clear` (clear)              | 12 ms                     | 14.5 ms              | 2                       | 5                  |

## Comparability and definitions

- Numbers are comparable across versions on the same machine and browser only; the fingerprint above is part of the result.
- The component-overhead and virtualized-list sections are **internal only**: they answer "what does this cost / what does it save", not "who is faster".
- Virtualized rows are reported as `N logical rows (M real DOM nodes)` — logical row count is not DOM node count.
- Bundle sizes come from the artifact report gated by the README size tables; the benchmark does not measure them again.

## Deterministic guards

Guards are hard failures: field updates must not rebuild rows (0 row builds, 0 childList changes), swaps and appends must preserve existing row nodes, and every operation is checked against the expected rows, ids and labels.

## Bundle size (from the artifact report)

- `yoya.core.js`: 21.6 KB min+gzip
- `yoya.ui.js`: 94.2 KB min+gzip
- `yoya.ui-router.full.js`: 106.5 KB min+gzip
