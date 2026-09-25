// core 入口（**打包器口径**）：转发 `@yoyaflow/yoya-core`，本包不自带 core 副本。
//
// 自包含单文件（CDN 口径）仍然是 `dist/yoya.core.js` / `dist/yoya.core.min.js`——那是**旧发布面**，
// 保留不动；`exports["./core"]` 指向本文件，是为了让打包器用户与 peer 共用同一份 core 实例
// （否则一个 bundle 里会出现两份 core = 两份信号实例）。
export * from '@yoyaflow/yoya-core';
