# Menu Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add accessible menu groups and dividers while giving existing menus consistent keyboard navigation across structured command lists.

**Architecture:** `VMenuDivider` and `VMenuGroup` remain lightweight `HtmlElementNode` components registered beside `VMenu` and `VMenuItem`. `VMenu` owns roving focus and recursively queries rendered enabled menu items, so group headings and separators never enter keyboard navigation; the navigation demo exercises the same public factories shown by `ComponentSource`.

**Tech Stack:** Vanilla JavaScript ES modules, Yoya UI `ViewNode` factories, Vitest/jsdom, ESLint, Prettier, Vite.

## Global Constraints

- Reusable/demo components use `function ComponentName(options) { return { render() { return viewNode; } }; }`.
- Demo source panels reuse `ComponentSource`; source strings are generated from component functions.
- Page composition passes component objects to `child(...)`.
- Preserve and do not commit unrelated dirty-worktree changes.
- Every production behavior begins with a failing Vitest assertion.

---

### Task 1: Add public menu structure components

**Files:**

- Modify: `src/components/components.test.js`
- Modify: `src/components/index.js`

**Interfaces:**

- Produces: `VMenuDivider`, `vMenuDivider(setup)`, `VMenuGroup`, and `vMenuGroup(setup)`.
- `VMenuDivider` renders `.yoya-vmenu-divider` with `role="separator"` and an orientation synchronized by its parent menu/group.
- `VMenuGroup` renders `.yoya-vmenu-group` with `role="group"`, a unique title id, `aria-labelledby`, `label(value)`, and child shortcuts.

- [ ] **Step 1: Write failing structure tests**

  Import the new classes/factories and construct:

  ```js
  const menu = vMenu((commands) => {
    commands.vMenuGroup((group) => {
      group.label('文件操作');
      group.vMenuItem('新建');
      group.vMenuItem({ disabled: true, text: '删除' });
    });
    commands.vMenuDivider();
    commands.vMenuItem('退出');
  });
  ```

  Assert `role="group"`, a non-empty title id matching `aria-labelledby`, `role="separator"`, vertical `aria-orientation`, disabled `aria-disabled="true"`, and `root.vMenuGroup(...)` / `root.vMenuDivider(...)` shortcuts.

- [ ] **Step 2: Verify RED**

  Run: `npm test -- src/components/components.test.js`

  Expected: FAIL because `vMenuGroup` and `vMenuDivider` are not functions.

- [ ] **Step 3: Implement minimal structure components**

  Add the two classes beside `VMenuItem`, propagate menu orientation through `VMenu.child()` and `VMenuGroup.child()`, add public factories, and register both in `componentFactories`. Update `VMenuItem.disabled()` to mirror native disabled state to `aria-disabled`.

- [ ] **Step 4: Verify GREEN**

  Run: `npm test -- src/components/components.test.js`

  Expected: PASS.

### Task 2: Add structured keyboard navigation

**Files:**

- Modify: `src/components/components.test.js`
- Modify: `src/components/index.js`

**Interfaces:**

- Vertical menus: `ArrowDown`/`ArrowUp`; horizontal menubars: `ArrowRight`/`ArrowLeft`.
- Both orientations: `Home`/`End`.
- Navigation wraps, skips disabled items, groups, group labels, and dividers, and keeps exactly one enabled item at `tabIndex=0`.

- [ ] **Step 1: Write failing vertical navigation test**

  Render a menu with enabled items separated by a divider and a group containing a disabled item. Focus the first item, dispatch `ArrowDown`, and assert focus moves to the next enabled descendant; dispatch `ArrowUp`, `Home`, and `End` and assert wrapping/endpoints.

- [ ] **Step 2: Verify RED**

  Run: `npm test -- src/components/components.test.js`

  Expected: FAIL because focus does not move and tab stops are not managed.

- [ ] **Step 3: Implement vertical roving focus**

  Bind one keydown handler on `VMenu`, query `.yoya-vmenu-item:not(:disabled)` within the rendered menu, set one `tabIndex=0`, set remaining enabled/disabled items to `-1`, prevent handled key defaults, and focus the calculated item.

- [ ] **Step 4: Write and verify failing horizontal test**

  Set `menu.horizontal()`, dispatch `ArrowRight` and `ArrowLeft`, and assert focus moves while `ArrowDown` remains unhandled.

  Run: `npm test -- src/components/components.test.js`

  Expected: FAIL until horizontal key mapping exists.

- [ ] **Step 5: Implement horizontal mapping and verify GREEN**

  Run: `npm test -- src/components/components.test.js`

  Run: `npm run lint`

  Expected: PASS with no warnings.

### Task 3: Update categorized demos and documentation

**Files:**

- Modify: `examples/components/demos/navigation.js`
- Modify: `examples/components/components-demo.test.js`
- Modify: `examples/components/README.md`
- Modify: `.scratch/yoya-basic-component-gap/issues/03-menu-structure.md`

**Interfaces:**

- `CommandMenuCard` stays a standard object component and demonstrates two labelled groups separated by `vMenuDivider`, including a disabled command.
- The generated source remains derived from `CommandMenuCard` and includes `vMenuGroup`/`vMenuDivider` calls.

- [ ] **Step 1: Write failing demo assertions**

  Assert the rendered navigation category contains two `.yoya-vmenu-group` elements, one separator, correctly associated group headings, and source text containing `menu.vMenuGroup` and `menu.vMenuDivider`.

- [ ] **Step 2: Verify RED**

  Run: `npm test -- examples/components/components-demo.test.js`

  Expected: FAIL because the command demo is still flat.

- [ ] **Step 3: Refactor CommandMenuCard and update docs**

  Nest existing commands into labelled groups, insert the divider, preserve click ids/feedback, document the structure and navigation keys, and check all acceptance boxes in issue 03.

- [ ] **Step 4: Verify demo GREEN**

  Run: `npm test -- examples/components/components-demo.test.js examples/components/component-source.test.js`

  Expected: PASS.

### Task 4: Verify, review, and commit

**Files:**

- Review all files listed above plus this plan.

- [ ] **Step 1: Run final checks**

  Run: targeted `npx prettier --check` for task files.

  Run: `npm run lint`

  Run: `npm test`

  Run: `npm run build`

  Expected: all task checks, lint, tests, and builds pass.

- [ ] **Step 2: Request independent review**

  Review against issue 03 and this plan, fix all Critical/Important findings, and rerun affected checks.

- [ ] **Step 3: Selectively stage and commit**

  Inspect `git diff --cached --stat` and `git diff --cached --check`; commit only menu structure files with:

  ```bash
  git commit -m "feat: add menu groups and dividers"
  ```
