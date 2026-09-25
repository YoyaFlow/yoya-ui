import { registerChildFactories } from '@yoyaflow/yoya-core/internal/core/node.js';
import { HtmlElementNode } from '@yoyaflow/yoya-core/html';
import { vInput } from './input.js';
import { vTimer } from './timer.js';
import { vTimerRange } from './timer-range.js';
import { vTextarea } from './textarea.js';
import { vSelect } from './select.js';
import { vCheckbox } from './checkbox.js';
import { vSwitch } from './switch.js';
import { vCheckboxes } from './checkboxes.js';
import { vRadio } from './radio.js';
import { vRadios } from './radios.js';
import { vField } from './field.js';
import { vFormItem } from './form-item.js';
import { vForm } from './form.js';

const formComponentFactories = {
  vCheckbox,
  vCheckboxes,
  vField,
  vForm,
  vFormItem,
  vInput,
  vRadio,
  vRadios,
  vSelect,
  vSwitch,
  vTimer,
  vTimerRange,
  vTextarea
};

registerChildFactories(HtmlElementNode, formComponentFactories);
