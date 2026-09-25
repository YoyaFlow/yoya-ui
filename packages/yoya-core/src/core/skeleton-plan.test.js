import { describe, expect, it } from 'vitest';
import { computed, div, ref, span, tr, vText } from '@yoyaflow/yoya-core';
import {
  materializeSkeleton,
  promoteSkeleton,
  recordSkeleton,
  resolveSkeleton,
  skeletonShapeSignature,
  skeletonStats
} from '../testing/skeleton-plan.js';

const selectedId = ref(null);

/** 官方 keyed 条目同构的一行（8 元素 + 2 文本 + 类名绑定 + 2 事件）。 */
function officialRow(row) {
  return tr((line) => {
    line.attr('data-row-id', String(row.id));
    line.td((cell) => cell.className('col-md-1').child(String(row.id)));
    line.td((cell) => {
      cell.className('col-md-4');
      cell.a((link) => link.child(vText(row.label)));
    });
    line.td((cell) => {
      cell.className('col-md-1');
      cell.a((link) => {
        link.span((icon) =>
          icon.className('glyphicon glyphicon-remove').attr('aria-hidden', 'true')
        );
        link.on('click', (event) => event.stopPropagation());
      });
    });
    line.td((cell) => cell.className('col-md-6'));
    line.toggleClass(
      'danger',
      computed(() => selectedId.value === row.id)
    );
    line.on('click', () => {
      selectedId.value = row.id;
    });
  });
}

const makeRow = (id) => ({ id, label: ref(`label ${id}`) });

describe('skeleton plan', () => {
  it('records the official row and keeps the same shape for a different instance', () => {
    const first = recordSkeleton(officialRow(makeRow(1)));
    const second = recordSkeleton(officialRow(makeRow(2)));

    expect(first.foldable).toBe(true);
    expect(skeletonStats(first)).toMatchObject({ elements: 8, texts: 2 });
    expect(skeletonShapeSignature(first)).toBe(skeletonShapeSignature(second));
  });

  it('promotes per-instance literals to slots but keeps static classes and structure', () => {
    const plan = recordSkeleton(officialRow(makeRow(1)));
    const { matches, plan: promoted } = promoteSkeleton(plan, officialRow(makeRow(2)));

    expect(matches).toBe(true);
    const row = promoted.nodes[promoted.root];
    // 行 id 逐实例变化 → 属性槽位
    expect(row.attrs).toEqual([['data-row-id', '*']]);
    // 类名全部是字面量 → 保持静态
    expect(row.children.map((index) => promoted.nodes[index].classText)).toEqual([
      'col-md-1',
      'col-md-4',
      'col-md-1',
      'col-md-6'
    ]);
    // 第 2 个 td 的行内文本是绑定来源 → 一直是槽位
    const labelCell = promoted.nodes[row.children[1]];
    const labelLink = promoted.nodes[labelCell.children[0]];
    expect(promoted.nodes[labelLink.children[0]].content).toBe('*');
    // id 单元格是字面量但逐行变化 → 提升后也是槽位
    const idCell = promoted.nodes[row.children[0]];
    expect(promoted.nodes[idCell.children[0]].content).toBe('*');
  });

  it('reproduces a second instance byte for byte from plan + positional values', () => {
    const first = officialRow(makeRow(1));
    const second = officialRow(makeRow(2));
    const { plan } = promoteSkeleton(recordSkeleton(first), second);

    const resolved = resolveSkeleton(plan, second);
    const rebuilt = materializeSkeleton(resolved);

    expect(rebuilt.toHTML()).toBe(second.toHTML());
    expect(rebuilt.toHTML()).toContain('data-row-id="2"');
  });

  it('reports a shape mismatch instead of promoting', () => {
    const plan = recordSkeleton(officialRow(makeRow(1)));
    const other = div((node) => node.span('x'));

    expect(promoteSkeleton(plan, other)).toEqual({ matches: false, plan: null });
  });

  it('marks mountable, region and component subtrees as not foldable', () => {
    const shown = ref(true);
    const mountable = div((node) => {
      node.mountable(shown);
      node.child('x');
    });
    expect(skeletonStats(recordSkeleton(mountable))).toMatchObject({
      foldable: false,
      reason: 'mountable'
    });

    const region = div((node) => {
      node.rebuildable();
      node.child('x');
    });
    expect(skeletonStats(recordSkeleton(region))).toMatchObject({
      foldable: false,
      reason: 'region'
    });

    const component = div((node) => node.child(() => span('x')));
    expect(skeletonStats(recordSkeleton(component))).toMatchObject({
      foldable: false,
      reason: 'component'
    });
  });

  it('promotes a literal text that differs between instances', () => {
    const build = (text) =>
      div((node) => {
        node.span('fixed');
        node.span(text);
      });
    const { matches, plan } = promoteSkeleton(recordSkeleton(build('one')), build('two'));

    expect(matches).toBe(true);
    const root = plan.nodes[plan.root];
    const firstSpanText = plan.nodes[plan.nodes[root.children[0]].children[0]];
    const secondSpanText = plan.nodes[plan.nodes[root.children[1]].children[0]];
    expect(firstSpanText.content).toBe('fixed');
    expect(secondSpanText.content).toBe('*');
    expect(materializeSkeleton(resolveSkeleton(plan, build('two'))).toHTML()).toBe(
      build('two').toHTML()
    );
  });

  it('keeps plan data free of nodes and DOM references', () => {
    const plan = recordSkeleton(officialRow(makeRow(1)));
    const json = JSON.stringify(plan);
    const roundTrip = JSON.parse(json);

    expect(json).not.toContain('_el');
    expect(roundTrip).toEqual(plan);
    expect(skeletonStats(plan).bytes).toBe(json.length);
  });
});
