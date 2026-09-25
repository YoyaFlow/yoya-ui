import type {
  ComponentNode,
  ChildInput,
  ElementFactory,
  ElementOptions,
  PropValue,
  SetupCallback,
  SetupInput
} from './core.js';
import type { HtmlElementNode } from './html.js';

export interface SelectOption {
  label?: ChildInput;
  value?: unknown;
  disabled?: boolean;
  [key: string]: any;
}

export interface CheckboxOption {
  label?: ChildInput;
  value?: unknown;
  disabled?: boolean;
  [key: string]: any;
}

export interface RadioOption {
  label?: ChildInput;
  value?: unknown;
  disabled?: boolean;
  [key: string]: any;
}

export interface UploadFileEntry {
  name?: string;
  size?: number;
  status?: 'ready' | 'uploading' | 'success' | 'error' | string;
  progress?: number;
  [key: string]: any;
}

/** `vUpload({ … })` 的可派发键（定义函数无 props）。 */
export interface UploadOptions {
  accept?: string;
  children?: ChildInput;
  disabled?: boolean;
  dropZone?: SetupInput<HtmlElementNode>;
  files?: Array<File | UploadFileEntry>;
  items?: Array<File | UploadFileEntry>;
  multiple?: boolean;
  name?: string;
  [key: string]: unknown;
}

/** `vColorPicker({ … })` 的可派发键（定义函数无 props）。 */
export interface ColorPickerOptions {
  alpha?: PropValue<number>;
  color?: PropValue<string | null>;
  onChange?: (color: string | null, alpha: number, picker: VColorPicker) => void;
  open?: PropValue<boolean>;
  palette?: PropValue<Array<string>>;
  value?: PropValue<string | null>;
  [key: string]: unknown;
}

/** Color picker with a custom popup: palette, alpha slider and effect preview. */
export interface VColorPicker extends ComponentNode {
  value(): string | null;
  value(next: string | null): VColorPicker;
  alpha(): number;
  alpha(next: number): VColorPicker;
  rgba(): string | null;
  clearValue(): VColorPicker;
  open(value?: boolean): VColorPicker;
  close(): VColorPicker;
  toggle(): VColorPicker;
  palette(): string[];
  palette(next: Array<string>): VColorPicker;
  change(): Array<(color: string | null, alpha: number, picker: VColorPicker) => void>;
  change(
    handler: (color: string | null, alpha: number, picker: VColorPicker) => void
  ): VColorPicker;
  onChange(
    handler: (color: string | null, alpha: number, picker: VColorPicker) => void
  ): VColorPicker;
}

export const VColorPicker: { (): VColorPicker };

/** `vSvgIconPicker({ … })` 的可派发键（定义函数无 props）。 */
export interface SvgIconPickerOptions {
  disabled?: PropValue<boolean>;
  icons?: PropValue<Array<string | { icon: () => unknown; name: string }>>;
  onChange?: (name: string | null, picker: VSvgIconPicker) => void;
  open?: PropValue<boolean>;
  required?: PropValue<boolean>;
  value?: PropValue<string | null>;
  [key: string]: unknown;
}

/** SVG icon picker with a dialog: opens an icon grid for selection. */
export interface VSvgIconPicker extends ComponentNode {
  value(): string | null;
  value(next: string | null): VSvgIconPicker;
  clearValue(): VSvgIconPicker;
  disabled(): boolean;
  disabled(next: boolean): VSvgIconPicker;
  name(): string;
  name(next: string): this;
  required(): boolean;
  required(next: boolean): VSvgIconPicker;
  icons(): string[];
  icons(next: Array<string | { icon: () => any; name: string }>): VSvgIconPicker;
  open(value?: boolean): VSvgIconPicker;
  close(): VSvgIconPicker;
  toggle(): VSvgIconPicker;
  change(): Array<(name: string | null, picker: VSvgIconPicker) => void>;
  change(handler: (name: string | null, picker: VSvgIconPicker) => void): VSvgIconPicker;
  onChange(handler: (name: string | null, picker: VSvgIconPicker) => void): VSvgIconPicker;
}

export const VSvgIconPicker: { (): VSvgIconPicker };

/** `vSlider({ … })` 的可派发键（定义函数无 props）。 */
export interface SliderOptions {
  disabled?: PropValue<boolean>;
  max?: PropValue<number>;
  min?: PropValue<number>;
  onChange?: (value: number, slider: VSlider) => void;
  required?: PropValue<boolean>;
  showValue?: PropValue<boolean>;
  step?: PropValue<number>;
  value?: PropValue<number>;
  vertical?: PropValue<boolean>;
  [key: string]: unknown;
}

/** Slider input with min/max/step constraints. */
export interface VSlider extends ComponentNode {
  value(): number;
  value(next: number): VSlider;
  min(): number;
  min(next: number): VSlider;
  max(): number;
  max(next: number): VSlider;
  step(): number;
  step(next: number): VSlider;
  showValue(): boolean;
  showValue(next: boolean): VSlider;
  vertical(): boolean;
  vertical(next: boolean): VSlider;
  disabled(): boolean;
  disabled(next: boolean): VSlider;
  required(): boolean;
  required(next: boolean): VSlider;
  change(): Array<(value: number, slider: VSlider) => void>;
  change(handler: (value: number, slider: VSlider) => void): VSlider;
  onChange(handler: (value: number, slider: VSlider) => void): VSlider;
}

export const VSlider: { (): VSlider };

export interface CascaderOption {
  label: string;
  value: string | number;
  children?: CascaderOption[];
}

/** `vCascader({ … })` 的可派发键（定义函数无 props）。 */
export interface CascaderOptions {
  disabled?: PropValue<boolean>;
  onChange?: (value: Array<string | number>, cascader: VCascader) => void;
  options?: PropValue<Array<CascaderOption>>;
  placeholder?: PropValue<string>;
  required?: PropValue<boolean>;
  value?: PropValue<Array<string | number> | string | number | null>;
  [key: string]: unknown;
}

/** Cascader: multi-level selection from an option tree. */
export interface VCascader extends ComponentNode {
  options(): CascaderOption[];
  options(next: Array<CascaderOption>): VCascader;
  value(): Array<string | number>;
  value(next: Array<string | number> | string | number | null): VCascader;
  disabled(): boolean;
  disabled(next: boolean): VCascader;
  required(): boolean;
  required(next: boolean): VCascader;
  placeholder(): string;
  placeholder(next: string): VCascader;
  open(value?: boolean): VCascader;
  close(): VCascader;
  toggle(): VCascader;
  change(): Array<(value: Array<string | number>, cascader: VCascader) => void>;
  change(handler: (value: Array<string | number>, cascader: VCascader) => void): VCascader;
  onChange(handler: (value: Array<string | number>, cascader: VCascader) => void): VCascader;
}

export const VCascader: { (): VCascader };

/** `vTagsInput({ … })` 的可派发键（定义函数无 props）。 */
export interface TagsInputOptions {
  disabled?: PropValue<boolean>;
  onChange?: (value: string[], tagsInput: VTagsInput) => void;
  placeholder?: PropValue<string>;
  required?: PropValue<boolean>;
  value?: PropValue<Array<string | number>>;
  [key: string]: unknown;
}

/** Tags input: enter/comma adds tags, backspace/× removes. */
export interface VTagsInput extends ComponentNode {
  value(): string[];
  value(next: Array<string | number>): VTagsInput;
  disabled(): boolean;
  disabled(next: boolean): VTagsInput;
  required(): boolean;
  required(next: boolean): VTagsInput;
  placeholder(): string;
  placeholder(next: string): VTagsInput;
  change(): Array<(value: string[], tagsInput: VTagsInput) => void>;
  change(handler: (value: string[], tagsInput: VTagsInput) => void): VTagsInput;
  onChange(handler: (value: string[], tagsInput: VTagsInput) => void): VTagsInput;
}

export const VTagsInput: { (): VTagsInput };

export interface AutocompleteOption {
  label: string;
  value: string | number;
}

/** `vAutocomplete({ … })` 的可派发键（定义函数无 props）。 */
export interface AutocompleteOptions {
  disabled?: PropValue<boolean>;
  limit?: PropValue<number>;
  onChange?: (value: string, autocomplete: VAutocomplete) => void;
  options?:
    | PropValue<Array<AutocompleteOption | string | number>>
    | ((query: string) => Array<AutocompleteOption | string | number>);
  placeholder?: PropValue<string>;
  required?: PropValue<boolean>;
  value?: PropValue<string | number | null>;
  [key: string]: unknown;
}

/** Autocomplete input with a suggestion list. */
export interface VAutocomplete extends ComponentNode {
  value(): string;
  value(next: string | number | null): VAutocomplete;
  options(
    next:
      | Array<AutocompleteOption | string | number>
      | ((query: string) => Array<AutocompleteOption | string | number>)
  ): VAutocomplete;
  limit(): number;
  limit(next: number): VAutocomplete;
  isDisabled(): boolean;
  disabled(): boolean;
  disabled(next: boolean): VAutocomplete;
  required(): boolean;
  required(next: boolean): VAutocomplete;
  placeholder(): string;
  placeholder(next: string): VAutocomplete;
  close(): VAutocomplete;
  change(): Array<(value: string, autocomplete: VAutocomplete) => void>;
  change(handler: (value: string, autocomplete: VAutocomplete) => void): VAutocomplete;
  onChange(handler: (value: string, autocomplete: VAutocomplete) => void): VAutocomplete;
}

export const VAutocomplete: { (): VAutocomplete };

/** `vInput({ … })` 的可派发键（定义函数无 props；元素级配置按控件语义路由到内层 input）。 */
export interface InputOptions {
  clearable?: PropValue<boolean>;
  disabled?: PropValue<boolean>;
  error?: PropValue<string | boolean | null>;
  name?: string;
  placeholder?: PropValue<string>;
  readonly?: PropValue<boolean>;
  required?: PropValue<boolean>;
  type?: PropValue<string>;
  value?: PropValue<string | number | null>;
  [key: string]: unknown;
}

/** Text input control. */
export interface VInput extends ComponentNode {
  type(): string;
  type(value: string): VInput;
  value(): string | number | null;
  value(value: string | number | null): VInput;
  text(value?: ChildInput): this;
  content(value: ChildInput): VInput;
  placeholder(value: string): VInput;
  disabled(value: boolean): VInput;
  readonly(value: boolean): VInput;
  required(value: boolean): VInput;
  error(value: string | boolean | null): VInput;
  clearable(value: boolean): VInput;
  clear(): VInput;
  /** 取用方法：包在里面的原生输入元素（浮动编辑面等族内用法）。 */
  inputUnit(): HtmlElementNode;
}

export const VInput: { (): VInput };

/** `vTimer({ … })` 的可派发键（`VInput` 的全部 props + `mode`）。 */
export interface TimerOptions extends InputOptions {
  mode?: PropValue<string>;
}

/** Time input with mode support. */
export interface VTimer extends VInput {
  mode(): string;
  mode(value: string): VTimer;
  type(): string;
  type(value: string): this;
}

export const VTimer: { (): VTimer };

/** `vTimerRange({ … })` 的可派发键（定义函数无 props）。 */
export interface TimerRangeOptions {
  disabled?: PropValue<boolean>;
  end?: PropValue<string>;
  mode?: PropValue<string>;
  name?: string;
  readonly?: PropValue<boolean>;
  required?: PropValue<boolean>;
  start?: PropValue<string>;
  value?: PropValue<{ start?: string; end?: string }>;
  [key: string]: unknown;
}

/** Time range input (start/end). */
export interface VTimerRange extends ComponentNode {
  mode(): string;
  mode(value: string): VTimerRange;
  start(): string;
  start(value: string): VTimerRange;
  end(): string;
  end(value: string): VTimerRange;
  value(): { start: string; end: string };
  value(value: { start?: string; end?: string }): VTimerRange;
  disabled(value: boolean): VTimerRange;
  readonly(value: boolean): VTimerRange;
  required(value: boolean): VTimerRange;
}

export const VTimerRange: { (): VTimerRange };

/** `vTextarea({ … })` 的可派发键（定义函数无 props）。 */
export interface TextareaOptions {
  clearable?: PropValue<boolean>;
  disabled?: PropValue<boolean>;
  error?: PropValue<string | boolean | null>;
  name?: string;
  placeholder?: PropValue<string>;
  readonly?: PropValue<boolean>;
  required?: PropValue<boolean>;
  rows?: PropValue<number>;
  value?: PropValue<string | number | null>;
  [key: string]: unknown;
}

/** Multi-line textarea. */
export interface VTextarea extends ComponentNode {
  value(): string | number | null;
  value(value: string | number | null): VTextarea;
  text(value?: ChildInput): this;
  content(value: ChildInput): VTextarea;
  placeholder(value: string): VTextarea;
  disabled(value: boolean): VTextarea;
  readonly(value: boolean): VTextarea;
  required(value: boolean): VTextarea;
  error(value: string | boolean | null): VTextarea;
  rows(value: number): VTextarea;
  clearable(value: boolean): VTextarea;
  clear(): VTextarea;
  /** 取用方法：包在里面的原生输入元素（浮动编辑面等族内用法）。 */
  inputUnit(): HtmlElementNode;
}

export const VTextarea: { (): VTextarea };

/** `vSelect({ … })` 的可派发键（定义函数无 props）。 */
export interface SelectOptions {
  clearable?: PropValue<boolean>;
  disabled?: PropValue<boolean>;
  error?: PropValue<string | boolean | null>;
  name?: string;
  options?: PropValue<Array<string | number | SelectOption>>;
  placeholder?: PropValue<string>;
  required?: PropValue<boolean>;
  value?: PropValue<unknown>;
  [key: string]: unknown;
}

/** Select control. */
export interface VSelect extends ComponentNode {
  value(): unknown;
  value(value: unknown): VSelect;
  text(value?: ChildInput): this;
  content(value: ChildInput): VSelect;
  placeholder(value: string): VSelect;
  options(value: Array<string | number | SelectOption>): VSelect;
  disabled(value: boolean): VSelect;
  required(value: boolean): VSelect;
  error(value: string | boolean | null): VSelect;
  clearable(value: boolean): VSelect;
  clear(): VSelect;
}

export const VSelect: { (): VSelect };

/** Shared boolean control (checkbox/switch/radio) surface. */
export interface BooleanControl extends HtmlElementNode {
  label(content?: ChildInput): this;
  text(content?: ChildInput): this;
  content(content: ChildInput): BooleanControl;
  description(content: ChildInput): BooleanControl;
  checked(): boolean;
  checked(value: boolean): BooleanControl;
  value(): unknown;
  value(value: unknown): BooleanControl;
  optionValue(value: unknown): BooleanControl;
  disabled(value: boolean): BooleanControl;
  required(value: boolean): BooleanControl;
  indeterminate(value: boolean): BooleanControl;
}

/** `VCheckbox({ … })` / `VSwitch({ … })` / `VRadio({ … })` 的直接参数。 */
export interface BooleanControlOptions {
  checked?: PropValue<boolean>;
  children?: ChildInput;
  content?: ChildInput;
  description?: ChildInput;
  disabled?: PropValue<boolean>;
  label?: ChildInput;
  name?: string;
  optionValue?: unknown;
  required?: PropValue<boolean>;
  text?: ChildInput;
  value?: unknown;
  [key: string]: unknown;
}

/** `VCheckbox` 独有的 props（`indeterminate` 只有它和 `VCheckboxes` 有）。 */
export interface CheckboxOptions extends BooleanControlOptions {
  indeterminate?: PropValue<boolean>;
}

export interface VCheckbox extends ComponentNode {
  label(content?: ChildInput): this;
  text(content?: ChildInput): this;
  content(content: ChildInput): VCheckbox;
  description(content: ChildInput): VCheckbox;
  checked(): boolean;
  checked(value: boolean): VCheckbox;
  value(): unknown;
  value(value: unknown): VCheckbox;
  optionValue(value: unknown): VCheckbox;
  disabled(value: boolean): VCheckbox;
  required(value: boolean): VCheckbox;
  indeterminate(value: boolean): VCheckbox;
}

export const VCheckbox: { (props?: CheckboxOptions): VCheckbox };

/** `VSwitch({ … })` 的直接参数。 */
export interface SwitchOptions extends BooleanControlOptions {}

export interface VSwitch extends ComponentNode {
  label(content?: ChildInput): this;
  text(content?: ChildInput): this;
  content(content: ChildInput): VSwitch;
  description(content: ChildInput): VSwitch;
  checked(): boolean;
  checked(value: boolean): VSwitch;
  value(): unknown;
  value(value: unknown): VSwitch;
  optionValue(value: unknown): VSwitch;
  disabled(value: boolean): VSwitch;
  required(value: boolean): VSwitch;
}

export const VSwitch: { (props?: SwitchOptions): VSwitch };

/** `VRadio({ … })` 的直接参数。 */
export interface RadioOptions extends BooleanControlOptions {}

export interface VRadio extends ComponentNode {
  label(content?: ChildInput): this;
  text(content?: ChildInput): this;
  content(content: ChildInput): VRadio;
  description(content: ChildInput): VRadio;
  checked(): boolean;
  checked(value: boolean): VRadio;
  value(): unknown;
  value(value: unknown): VRadio;
  optionValue(value: unknown): VRadio;
  disabled(value: boolean): VRadio;
  required(value: boolean): VRadio;
}

export const VRadio: { (props?: RadioOptions): VRadio };

/** `VCheckboxes({ … })` 的直接参数。 */
export interface CheckboxesOptions {
  children?: PropValue<Array<string | number | CheckboxOption>>;
  columns?: PropValue<number | null>;
  disabled?: PropValue<boolean>;
  multiple?: PropValue<boolean>;
  name?: string;
  options?: PropValue<Array<string | number | CheckboxOption>>;
  required?: PropValue<boolean>;
  value?: PropValue<Array<unknown>>;
  [key: string]: unknown;
}

/** Checkbox group. */
export interface VCheckboxes extends ComponentNode {
  name(): string;
  name(value: string | null): this;
  multiple(): boolean;
  multiple(value: boolean): VCheckboxes;
  required(): boolean;
  required(value: boolean): VCheckboxes;
  disabled(): boolean;
  disabled(value: boolean): VCheckboxes;
  isDisabled(): boolean;
  /** 列数（几何走 CSS 变量 `--yoya-checkboxes-columns`）：`>= 1` 才算列数，其余等于"不设列"。 */
  columns(): number | null;
  columns(value: number | null): VCheckboxes;
  options(): Array<string | number | CheckboxOption>;
  options(value: Array<string | number | CheckboxOption>): VCheckboxes;
  value(): unknown[];
  value(value: Array<unknown>): VCheckboxes;
  checkedValues(value: Array<unknown>): VCheckboxes;
  clear(): VCheckboxes;
}

export const VCheckboxes: { (props?: CheckboxesOptions): VCheckboxes };

/** `VRadios({ … })` 的直接参数。 */
export interface RadiosOptions {
  change?: (value: unknown, radios: VRadios) => void;
  children?: PropValue<Array<string | number | RadioOption>>;
  disabled?: PropValue<boolean>;
  name?: string;
  options?: PropValue<Array<string | number | RadioOption>>;
  required?: PropValue<boolean>;
  value?: PropValue<unknown>;
  [key: string]: unknown;
}

/** Radio group. */
export interface VRadios extends ComponentNode {
  name(): string;
  name(value: string | null): this;
  required(): boolean;
  required(value: boolean): VRadios;
  disabled(): boolean;
  disabled(value: boolean): VRadios;
  isDisabled(): boolean;
  /** 变更回调：第二参是**组件句柄**。 */
  change(handler: (value: unknown, radios: VRadios) => void): VRadios;
  options(): Array<string | number | RadioOption>;
  options(value: Array<string | number | RadioOption>): VRadios;
  value(): unknown;
  value(value: unknown): VRadios;
  checkedValue(value: unknown): VRadios;
  clear(): VRadios;
}

export const VRadios: { (props?: RadiosOptions): VRadios };

/** `vField({ … })` 的可派发键（定义函数无 props）。 */
export interface FieldOptions {
  children?: ChildInput;
  control?: ChildInput | SetupCallback<HtmlElementNode>;
  display?: ChildInput;
  displayClass?: string;
  displayStyle?: Record<string, string | number | null>;
  editor?: ChildInput | SetupCallback<HtmlElementNode>;
  error?: PropValue<string | boolean | null>;
  formatter?: ((value: unknown, field: VField) => ChildInput) | null;
  hint?: ChildInput;
  label?: ChildInput;
  mode?: PropValue<'view' | 'edit'>;
  value?: PropValue<unknown>;
  [key: string]: unknown;
}

/** Field wrapper with view/edit modes. */
export interface VField extends ComponentNode {
  label(value?: ChildInput): this;
  hint(value: ChildInput): VField;
  error(value: string | boolean | null): VField;
  display(value: ChildInput): VField;
  formatter(handler: ((value: unknown, field: VField) => ChildInput) | null): VField;
  displayClass(...classes: string[]): VField;
  displayStyle(style: Record<string, string | number | null>): VField;
  control(setup: ChildInput | SetupCallback<HtmlElementNode>): VField;
  editor(setup: ChildInput | SetupCallback<HtmlElementNode>): VField;
  value(): unknown;
  value(value: unknown): VField;
  mode(): 'view' | 'edit';
  mode(value: 'view' | 'edit'): VField;
  view(): VField;
  edit(): VField;
  cancel(): VField;
}

export const VField: { (): VField };

export type FormItemRule = (
  value: unknown,
  values: Record<string, unknown>
) => string | boolean | undefined | void;

/** `vFormItem({ … })` 的可派发键（定义函数无 props）。 */
export interface FormItemOptions {
  children?: ChildInput;
  control?: ChildInput | SetupCallback<HtmlElementNode>;
  editor?: ChildInput | SetupCallback<HtmlElementNode>;
  error?: PropValue<string | boolean | null>;
  hint?: ChildInput;
  label?: ChildInput;
  name?: string | number;
  required?: PropValue<boolean>;
  rules?: FormItemRule | FormItemRule[];
  validate?: (error: string | null, value: unknown) => void;
  value?: PropValue<unknown>;
  [key: string]: unknown;
}

/** Form item with name/label/validation. */
export interface VFormItem extends ComponentNode {
  name(): string;
  name(value: string | number): this;
  label(value?: ChildInput): this;
  hint(value: ChildInput): VFormItem;
  error(value: string | boolean | null): VFormItem;
  control(setup: ChildInput | SetupCallback<HtmlElementNode>): VFormItem;
  editor(setup: ChildInput | SetupCallback<HtmlElementNode>): VFormItem;
  required(value?: boolean, messageOrOptions?: string | Record<string, unknown>): VFormItem;
  validate(callback: (error: string | null, value: unknown) => void): VFormItem;
  rules(callbacks: FormItemRule | FormItemRule[]): VFormItem;
  value(): unknown;
  value(value: unknown): VFormItem;
  /** 族内校验入口（vForm 逐项调）：判定必填 / 校验器并写错误，返回是否通过。 */
  check(formValues?: Record<string, unknown>): boolean;
}

export const VFormItem: { (): VFormItem };

/** `vForm({ … })` 的可派发键（定义函数无 props）。 */
export interface FormOptions {
  children?: ChildInput;
  values?: PropValue<Record<string, unknown>>;
  [key: string]: unknown;
}

/** Form with values/validation/reset/submit. */
export interface VForm extends ComponentNode {
  values(): Record<string, unknown>;
  values(value: Record<string, unknown>): VForm;
  value(name: string): unknown;
  validate(): boolean;
  reset(): VForm;
  submit(): boolean;
}

export const VForm: { (): VForm };

/**
 * `vRate({ … })` 的 props——只收数据 + 元素选项：本组件的键走命令，其余按引擎的元素分派落视图根。
 */
export interface RateOptions {
  value?: number;
  count?: number;
  /** `count` 的兼容别名。 */
  max?: number;
  allowHalf?: boolean;
  allowClear?: boolean;
  /** `allowClear` 的兼容别名。 */
  clearable?: boolean;
  character?: string;
  size?: number | string;
  name?: string;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  error?: boolean | null;
  [key: string]: unknown;
}

/** Star rating control. */
export interface VRate extends ComponentNode {
  value(): number;
  value(value: number): VRate;
  count(): number;
  count(value: number): VRate;
  max(): number;
  max(value: number): VRate;
  allowHalf(): boolean;
  allowHalf(value: boolean): VRate;
  allowClear(): boolean;
  allowClear(value: boolean): VRate;
  clearable(): boolean;
  clearable(value: boolean): VRate;
  character(): string;
  character(value: string): VRate;
  size(): number;
  size(value: number | string): VRate;
  disabled(): boolean;
  disabled(value: boolean): VRate;
  readonly(): boolean;
  readonly(value: boolean): VRate;
  required(): boolean;
  required(value: boolean): VRate;
  error(): boolean;
  error(value: boolean | null): VRate;
  clear(): VRate;
  /** 值语义的能力声明：速率为 0 即"空值"（必填校验按它判定）。 */
  isEmptyValue(value: unknown): boolean;
}

export const VRate: { (props?: RateOptions): VRate };

/** File upload with dropzone. */
export interface VUpload extends ComponentNode {
  accept(value: string): VUpload;
  multiple(value: boolean): VUpload;
  disabled(value: boolean): VUpload;
  files(): UploadFileEntry[];
  files(value: Array<File | UploadFileEntry>): VUpload;
  items(): UploadFileEntry[];
  items(value: Array<File | UploadFileEntry>): VUpload;
  value(): UploadFileEntry[];
  value(value: Array<File | UploadFileEntry>): VUpload;
  addFiles(fileList: FileList | File[]): VUpload;
  remove(indexOrName: number | string): VUpload;
  clear(): VUpload;
  status(index: number, value: string): VUpload;
  progress(index?: number, value?: number): this;
  dropZone(): HtmlElementNode;
  dropZone(setup: SetupInput<HtmlElementNode>): VUpload;
}

export const VUpload: { (): VUpload };

/** `vAvatarUpload({ … })` 的可派发键（定义函数无 props）。 */
export interface AvatarUploadOptions {
  accept?: PropValue<string>;
  disabled?: PropValue<boolean>;
  files?: Array<File | UploadFileEntry>;
  name?: string;
  shape?: 'circle' | 'square' | string;
  size?: PropValue<number | string>;
  value?: File | UploadFileEntry | null;
  [key: string]: unknown;
}

/** Avatar upload with preview. */
export interface VAvatarUpload extends ComponentNode {
  accept(value: string): VAvatarUpload;
  shape(): string;
  shape(value: 'circle' | 'square' | string): VAvatarUpload;
  size(): number | string;
  size(value: number | string): VAvatarUpload;
  disabled(value: boolean): VAvatarUpload;
  value(): UploadFileEntry | null;
  value(value: File | UploadFileEntry | null): VAvatarUpload;
  files(): UploadFileEntry[];
  files(value: Array<File | UploadFileEntry>): VAvatarUpload;
  items(): UploadFileEntry[];
  items(value: Array<File | UploadFileEntry>): VAvatarUpload;
  addFiles(fileList: FileList | File[]): VAvatarUpload;
  remove(): VAvatarUpload;
  clear(): VAvatarUpload;
}

export const VAvatarUpload: { (): VAvatarUpload };

export const vInput: ElementFactory<VInput> & {
  (first?: InputOptions | SetupInput<VInput> | null, callback?: SetupCallback<VInput>): VInput;
};
export const vTimer: ElementFactory<VTimer> & {
  (first?: TimerOptions | SetupInput<VTimer> | null, callback?: SetupCallback<VTimer>): VTimer;
};
export const vTimerRange: ElementFactory<VTimerRange> & {
  (
    first?: TimerRangeOptions | SetupInput<VTimerRange> | null,
    callback?: SetupCallback<VTimerRange>
  ): VTimerRange;
};
export const vTextarea: ElementFactory<VTextarea> & {
  (
    first?: TextareaOptions | SetupInput<VTextarea> | null,
    callback?: SetupCallback<VTextarea>
  ): VTextarea;
};
export const vSelect: ElementFactory<VSelect> & {
  (first?: SelectOptions | SetupInput<VSelect> | null, callback?: SetupCallback<VSelect>): VSelect;
};
export const vCheckbox: ElementFactory<VCheckbox> & {
  (
    first?: CheckboxOptions | SetupInput<VCheckbox> | null,
    callback?: SetupCallback<VCheckbox>
  ): VCheckbox;
};
export const vSwitch: ElementFactory<VSwitch> & {
  (first?: SwitchOptions | SetupInput<VSwitch> | null, callback?: SetupCallback<VSwitch>): VSwitch;
};
export const vRadio: ElementFactory<VRadio> & {
  (first?: RadioOptions | SetupInput<VRadio> | null, callback?: SetupCallback<VRadio>): VRadio;
};
export const vCheckboxes: ElementFactory<VCheckboxes> & {
  (
    first?: CheckboxesOptions | SetupInput<VCheckboxes> | null,
    callback?: SetupCallback<VCheckboxes>
  ): VCheckboxes;
};
export const vRadios: ElementFactory<VRadios> & {
  (first?: RadiosOptions | SetupInput<VRadios> | null, callback?: SetupCallback<VRadios>): VRadios;
};
export const vField: ElementFactory<VField> & {
  (first?: FieldOptions | SetupInput<VField> | null, callback?: SetupCallback<VField>): VField;
};
export const vFormItem: ElementFactory<VFormItem> & {
  (
    first?: FormItemOptions | SetupInput<VFormItem> | null,
    callback?: SetupCallback<VFormItem>
  ): VFormItem;
};
export const vForm: ElementFactory<VForm> & {
  (first?: FormOptions | SetupInput<VForm> | null, callback?: SetupCallback<VForm>): VForm;
};
export const vRate: {
  (first?: RateOptions | SetupInput<VRate> | null, callback?: SetupCallback<VRate>): VRate;
} & ElementFactory<VRate>;
export const vUpload: ElementFactory<VUpload> & {
  (first?: UploadOptions | SetupInput<VUpload> | null, callback?: SetupCallback<VUpload>): VUpload;
};
export const vAvatarUpload: ElementFactory<VAvatarUpload> & {
  (
    first?: AvatarUploadOptions | SetupInput<VAvatarUpload> | null,
    callback?: SetupCallback<VAvatarUpload>
  ): VAvatarUpload;
};
export const vColorPicker: ElementFactory<VColorPicker> & {
  (
    first?: ColorPickerOptions | SetupInput<VColorPicker> | null,
    callback?: SetupCallback<VColorPicker>
  ): VColorPicker;
};
export const vSlider: ElementFactory<VSlider> & {
  (first?: SliderOptions | SetupInput<VSlider> | null, callback?: SetupCallback<VSlider>): VSlider;
};
export const vCascader: ElementFactory<VCascader> & {
  (
    first?: CascaderOptions | SetupInput<VCascader> | null,
    callback?: SetupCallback<VCascader>
  ): VCascader;
};
export const vTagsInput: ElementFactory<VTagsInput> & {
  (
    first?: TagsInputOptions | SetupInput<VTagsInput> | null,
    callback?: SetupCallback<VTagsInput>
  ): VTagsInput;
};
export const vAutocomplete: ElementFactory<VAutocomplete> & {
  (
    first?: AutocompleteOptions | SetupInput<VAutocomplete> | null,
    callback?: SetupCallback<VAutocomplete>
  ): VAutocomplete;
};

/** Parent-shortcut surface merged onto HtmlElementNode. */
export interface FormParentShortcuts {
  vInput(
    first?: InputOptions | SetupInput<VInput> | null,
    callback?: SetupCallback<VInput>
  ): VInput;
  vTimer(
    first?: TimerOptions | SetupInput<VTimer> | null,
    callback?: SetupCallback<VTimer>
  ): VTimer;
  vTimerRange(
    first?: TimerRangeOptions | SetupInput<VTimerRange> | null,
    callback?: SetupCallback<VTimerRange>
  ): VTimerRange;
  vTextarea(
    first?: TextareaOptions | SetupInput<VTextarea> | null,
    callback?: SetupCallback<VTextarea>
  ): VTextarea;
  vSelect(
    first?: SelectOptions | SetupInput<VSelect> | null,
    callback?: SetupCallback<VSelect>
  ): VSelect;
  vCheckbox(
    first?: CheckboxOptions | SetupInput<VCheckbox> | null,
    callback?: SetupCallback<VCheckbox>
  ): VCheckbox;
  vSwitch(
    first?: SwitchOptions | SetupInput<VSwitch> | null,
    callback?: SetupCallback<VSwitch>
  ): VSwitch;
  vRadio(
    first?: RadioOptions | SetupInput<VRadio> | null,
    callback?: SetupCallback<VRadio>
  ): VRadio;
  vCheckboxes(
    first?: CheckboxesOptions | SetupInput<VCheckboxes> | null,
    callback?: SetupCallback<VCheckboxes>
  ): VCheckboxes;
  vRadios(
    first?: RadiosOptions | SetupInput<VRadios> | null,
    callback?: SetupCallback<VRadios>
  ): VRadios;
  vField(
    first?: FieldOptions | SetupInput<VField> | null,
    callback?: SetupCallback<VField>
  ): VField;
  vFormItem(
    first?: FormItemOptions | SetupInput<VFormItem> | null,
    callback?: SetupCallback<VFormItem>
  ): VFormItem;
  vForm(first?: FormOptions | SetupInput<VForm> | null, callback?: SetupCallback<VForm>): VForm;
  vRate(first?: RateOptions | SetupInput<VRate> | null, callback?: SetupCallback<VRate>): VRate;
  vUpload(
    first?: UploadOptions | SetupInput<VUpload> | null,
    callback?: SetupCallback<VUpload>
  ): VUpload;
  vAvatarUpload(
    first?: AvatarUploadOptions | SetupInput<VAvatarUpload> | null,
    callback?: SetupCallback<VAvatarUpload>
  ): VAvatarUpload;
  vColorPicker(
    first?: ColorPickerOptions | SetupInput<VColorPicker> | null,
    callback?: SetupCallback<VColorPicker>
  ): VColorPicker;
  vSlider(
    first?: SliderOptions | SetupInput<VSlider> | null,
    callback?: SetupCallback<VSlider>
  ): VSlider;
  vCascader(
    first?: CascaderOptions | SetupInput<VCascader> | null,
    callback?: SetupCallback<VCascader>
  ): VCascader;
  vTagsInput(
    first?: TagsInputOptions | SetupInput<VTagsInput> | null,
    callback?: SetupCallback<VTagsInput>
  ): VTagsInput;
  vAutocomplete(
    first?: AutocompleteOptions | SetupInput<VAutocomplete> | null,
    callback?: SetupCallback<VAutocomplete>
  ): VAutocomplete;
}

export type { ElementOptions };
