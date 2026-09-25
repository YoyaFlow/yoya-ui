/**
 * 演示站自用：ECharts 由页面用 `<script>` 全局引入（`window.echarts`），这里只负责读取它，
 * **不打包 echarts 本身**（否则产物被 CommonJS 包裹后全局丢失）。
 *
 * 使用者项目里不需要这个文件：把 `echarts` 实例直接交给 `vEchart` 的 `echartsLib()`
 * 就行（`chart.echartsLib(myEcharts)`），import 路径见 docs/install.md。
 */
export const echarts = typeof window !== 'undefined' ? window.echarts : null;
