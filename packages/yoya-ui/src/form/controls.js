/**
 * 表单控件入口（barrel）：实现按组件拆在 `./controls/` 下（波 0 / 票 10），
 * 这里保持拆分前的导出面不变——`packages/yoya-ui/src/form/index.js` 与使用端不需要改 import。
 */
import './controls/registry.js';

export { VInput, vInput } from './controls/input.js';
export { VTextarea, vTextarea } from './controls/textarea.js';
export { VTimer, vTimer } from './controls/timer.js';
export { VTimerRange, vTimerRange } from './controls/timer-range.js';
export { VSelect, vSelect } from './controls/select.js';
export { VCheckbox, vCheckbox } from './controls/checkbox.js';
export { VSwitch, vSwitch } from './controls/switch.js';
export { VCheckboxes, vCheckboxes } from './controls/checkboxes.js';
export { VRadio, vRadio, radioGroups } from './controls/radio.js';
export { VRadios, vRadios } from './controls/radios.js';
export { VField, vField } from './controls/field.js';
export { VFormItem, vFormItem } from './controls/form-item.js';
export { VForm, vForm } from './controls/form.js';
