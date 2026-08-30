/**
 * ECharts 库由页面通过 <script> 标签全局引入（window.echarts），
 * 模块只负责读取，不打包 echarts.min.js，避免 UMD 被 CommonJS 包裹后全局丢失。
 */
export const echarts = typeof window !== 'undefined' ? window.echarts : null;
