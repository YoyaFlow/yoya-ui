import { describe, expect, it } from 'vitest';
import { vTable, vTbody, vTd, vTfoot, vTh, vThead, vTr } from '../index.js';

/** 身份走 `vn` 属性（票 15：组件类名退场）。 */
const GRID = '[vn="VTableGrid"]';
const HEAD = '[vn="VThead"]';
const BODY = '[vn="VTbody"]';
const FOOT = '[vn="VTfoot"]';
const CAPTION = '[vn="VTableCaption"]';

describe('vTable declarative sections', () => {
  it('builds thead, tbody and tfoot through vTable child shortcuts', () => {
    const table = vTable((table) => {
      table.caption('服务列表');
      table.vThead((head) => {
        head.vTr((row) => {
          row.vTh('名称');
          row.vTh('状态');
        });
      });
      table.vTbody((body) => {
        body.vTr((row) => {
          row.vTd('api-gateway');
          row.vTd('运行中');
        });
      });
      table.vTfoot((foot) => {
        foot.vTr((row) => {
          row.vTd((cell) => {
            cell.attr('colspan', 2);
            cell.child('共 1 条');
          });
        });
      });
    });

    const element = table.renderDom();
    const tableElement = element.querySelector(GRID);

    expect(tableElement.querySelectorAll(':scope > thead')).toHaveLength(1);
    expect(tableElement.querySelectorAll(':scope > tbody')).toHaveLength(1);
    expect(tableElement.querySelectorAll(':scope > tfoot')).toHaveLength(1);
    expect(tableElement.querySelector(`${HEAD} th:nth-child(1)`).textContent).toBe('名称');
    expect(tableElement.querySelector(`${BODY} td:nth-child(2)`).textContent).toBe('运行中');
    expect(tableElement.querySelector(`${FOOT} td`).getAttribute('colspan')).toBe('2');
    expect(tableElement.querySelector(CAPTION).textContent).toBe('服务列表');
  });

  it('exposes standalone section, row and cell factories', () => {
    const head = vThead((head) =>
      head.vTr((row) => {
        row.vTh('名称');
        row.vTh('状态');
      })
    );
    const body = vTbody((body) => body.vTr(['api-gateway', '运行中']));
    const foot = vTfoot((foot) => foot.vTr((row) => row.vTd('合计')));

    expect(head.tagName()).toBe('thead');
    expect(head.renderDom().querySelector('th:nth-child(2)').textContent).toBe('状态');
    expect(body.renderDom().querySelector('td:nth-child(1)').textContent).toBe('api-gateway');
    expect(foot.renderDom().querySelector('td').textContent).toBe('合计');
    expect(vTh('名称').textContent()).toBe('名称');
    expect(vTd('值').attr('vn')).toBe('VTd');
    expect(vTh('名称').attr('vn')).toBe('VTh');
    expect(vTr('一行').tagName()).toBe('tr');
  });

  it('keeps declarative rows in the body when vTable.vTr is used directly', () => {
    const table = vTable((table) => {
      table.vThead((head) => head.vTr((row) => row.vTh('名称')));
      table.vTr((row) => row.vTd('api-gateway'));
    });

    const element = table.renderDom();

    expect(element.querySelector(`${BODY} td`).textContent).toBe('api-gateway');
    expect(element.querySelectorAll(`${GRID} > tbody`)).toHaveLength(1);
  });

  it('routes child sections into the internal table element', () => {
    const table = vTable((table) => {
      table.child(vThead((head) => head.vTr((row) => row.vTh('名称'))));
      table.child(vTbody((body) => body.vTr((row) => row.vTd('api-gateway'))));
    });
    const element = table.renderDom();

    expect(element.querySelector(`${GRID} > thead th`).textContent).toBe('名称');
    expect(element.querySelector(`${GRID} > tbody td`).textContent).toBe('api-gateway');
  });

  it('switches back to data-driven columns and rows after declarative sections', () => {
    const table = vTable((table) => {
      table.vThead((head) => head.vTr((row) => row.vTh('自定义')));
      table.vTbody((body) => body.vTr((row) => row.vTd('自定义')));
    });
    const element = table.renderDom();

    table.rows([{ name: 'api-gateway' }]);

    expect(element.querySelector(`${HEAD} th`).textContent).toBe('name');
    expect(element.querySelector(`${BODY} td`).textContent).toBe('api-gateway');
    expect(element.querySelectorAll(`${GRID} > thead`)).toHaveLength(1);
    expect(element.querySelectorAll(`${GRID} > tbody`)).toHaveLength(1);
  });
});
