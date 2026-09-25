/**
 * core-only 消费方（票 06 硬点 1 的"先红后绿"门禁，由 `packages/yoya-core/tsconfig.json` 单独跑）。
 *
 * 这个 program **只有 core 的声明**：没有组件包的类型，也就没有组件包的 `declare module` 增强。
 * 所以"节点上有 HTML 快捷方法、没有组件快捷方法"这件事在这里是可以断言的——
 * 一旦有人把组件类型重新 import 进 core 的声明，`@ts-expect-error` 会立刻变成"没有错误"而报红。
 */
import { div, ref, vText } from './index.js';
import type { HtmlElementNode } from './html.js';

const page: HtmlElementNode = div();

// core 面：HTML 工厂、节点操作、活值绑定都在
page.className('page');
page.attr('data-role', 'page');
page.child(div((row) => row.text(vText(ref('内容')))));

// @ts-expect-error 只装 core 时节点上没有组件快捷方法（`vButton` 由 @yoyaflow/yoya-ui 增强进来）
page.vButton('提交');

// @ts-expect-error 同上：布局快捷方法也属于快线
page.flex({ gap: 8 });

export type { HtmlElementNode };
