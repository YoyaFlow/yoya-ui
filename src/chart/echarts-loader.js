import * as echartsModule from './echarts.min.js';

/**
 * 统一取 ECharts 库：构建环境下 echarts.min.js 被按 CommonJS 包裹，
 * module.exports 经命名空间默认导出可取；dev/浏览器直载时走 UMD 全局分支。
 */
const echartsLib = echartsModule.default || null;

export const echarts = echartsLib || (typeof window !== 'undefined' ? window.echarts : null);
