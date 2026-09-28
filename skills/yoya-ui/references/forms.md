# 表单收集与校验

## 基本用法

```js
import { vForm, vFormItem, vInput, vSelect } from '@yoyaflow/yoya-ui';

const form = vForm((form) => {
  form.vFormItem((item) => {
    item.label('服务名').name('service');
    item.control((editor) => editor.vInput({ name: 'service', value: 'api-gateway' }));
  });
  form.vFormItem((item) => {
    item.label('环境').name('env').required({ message: '请选择环境' });
    item.control((editor) => editor.vSelect({ name: 'env', options: ['dev', 'prod'] }));
  });
  form.on('submit', (event) => {
    event.preventDefault();
    if (form.validate()) {
      console.log(form.values());
    }
  });
});
```

## 关键 API

- `form.values()`：读取整张表单值（控件按 `name()` 收集）
- `form.values(obj)`：回填表单值
- `form.validate()`：校验必填与自定义规则，返回是否通过；`formItem.validate(callback)` 添加自定义校验
- `formItem.required({ message, indicator })`：必填与错误提示
- `formItem.hint(text)`：字段提示；`formItem.error(text)`：手动错误态
- `form.reset()` / `form.submit()`

## 自定义控件接入

任何控件只要实现 `_collectValue()` 即可被 `vFormItem` 读取；在表单内用 `item.control((editor) => editor.vMyControl(...))` 挂载。没有 `_collectValue` 的第三方元素用 `item.control((editor) => editor.collectValue(() => element.value))` 桥接。

## 控件通用 API

`value(next)`（读写）、`disabled(next)`、`required(next)`、`name(next)` 大多数控件都支持，且 getter 无参返回当前状态；`onChange(handler)` 或 `change(handler)` 注册变化回调。

**值位传可写句柄 = 自动双向绑定**：`vInput({ value: name })`、`vTextarea({ value: draft })`、`vSelect({ value: selected })`、`vSlider({ value: progress })`（日期/时间用 `vTimer`，起止区间用 `vTimerRange`）输入即写回句柄，
句柄变即刷控件；两侧都比较值是否已相同，所以不会回声、也不会顶光标。`onInput` / `onChange` 与内置回写
**共存**（同一事件名多 handler），需要 `Number()` / trim 这类转换就加自己的 handler，不用替掉内置的。
程序化写控件（`editor.value(next)`、`form.values({...})` 回填）同样会回写句柄——句柄是唯一真源。
