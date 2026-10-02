# templates/ —— 项目级模板（可填参的页面骨架）

**一个模板一个文件**：`templates/<name>.json` —— 与 `components/` 同级（跨 UI 复用是常态）。

```json
{
  "name": "订单列表页",
  "description": "一句话说清它填什么参数、出什么页面",
  "params": { "标题": { "type": "string", "default": "订单" } },
  "schema": { "protocol": "yoya-genui", "version": "0.2", "root": { "type": "p", "text": "{{标题}}" } }
}
```

- 宿主启动时扫这个目录 → `list_templates` 直接看得见（可 diff / blame / 单独改一个）；
- 新沉淀走 `save_template`（落成新文件），重复需求走 `render_template`（零 LLM 填参）；
- 没有这个目录的项目仍用过渡期的 `state/templates.json` 账本。
