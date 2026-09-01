import type {
  ChildInput,
  ElementFactory,
  ElementOptions,
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

export interface UploadOptions {
  name?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  [key: string]: any;
}

/** Color picker with a custom popup: palette, alpha slider and effect preview. */
export class VColorPicker extends HtmlElementNode {
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

/** SVG icon picker with a dialog: opens an icon grid for selection. */
export class VSvgIconPicker extends HtmlElementNode {
  value(): string | null;
  value(next: string | null): VSvgIconPicker;
  clearValue(): VSvgIconPicker;
  disabled(): boolean;
  disabled(next: boolean): VSvgIconPicker;
  name(): string;
  name(next: string): VSvgIconPicker;
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

/** Slider input with min/max/step constraints. */
export class VSlider extends HtmlElementNode {
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

export interface CascaderOption {
  label: string;
  value: string | number;
  children?: CascaderOption[];
}

/** Cascader: multi-level selection from an option tree. */
export class VCascader extends HtmlElementNode {
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

/** Tags input: enter/comma adds tags, backspace/× removes. */
export class VTagsInput extends HtmlElementNode {
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

export interface AutocompleteOption {
  label: string;
  value: string | number;
}

/** Autocomplete input with a suggestion list. */
export class VAutocomplete extends HtmlElementNode {
  value(): string;
  value(next: string | number | null): VAutocomplete;
  options(
    next:
      | Array<AutocompleteOption | string | number>
      | ((query: string) => Array<AutocompleteOption | string | number>)
  ): VAutocomplete;
  limit(): number;
  limit(next: number): VAutocomplete;
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

/** Text input control. */
export class VInput extends HtmlElementNode {
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
}

/** Time input with mode support. */
export class VTimer extends VInput {
  mode(): string;
  mode(value: string): VTimer;
  type(): string;
  type(value: string): this;
}

/** Time range input (start/end). */
export class VTimerRange extends HtmlElementNode {
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

/** Multi-line textarea. */
export class VTextarea extends HtmlElementNode {
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
}

/** Select control. */
export class VSelect extends HtmlElementNode {
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

export class VCheckbox extends HtmlElementNode {
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

export class VSwitch extends HtmlElementNode {
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

export class VRadio extends HtmlElementNode {
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

/** Checkbox group. */
export class VCheckboxes extends HtmlElementNode {
  multiple(value: boolean): VCheckboxes;
  required(value: boolean): VCheckboxes;
  disabled(value: boolean): VCheckboxes;
  options(value: Array<string | number | CheckboxOption>): VCheckboxes;
  value(): unknown[];
  value(value: Array<unknown>): VCheckboxes;
  checkedValues(value: Array<unknown>): VCheckboxes;
  clear(): VCheckboxes;
}

/** Radio group. */
export class VRadios extends HtmlElementNode {
  required(value: boolean): VRadios;
  disabled(value: boolean): VRadios;
  change(handler: (value: unknown) => void): VRadios;
  options(value: Array<string | number | RadioOption>): VRadios;
  value(): unknown;
  value(value: unknown): VRadios;
  checkedValue(value: unknown): VRadios;
  clear(): VRadios;
}

/** Field wrapper with view/edit modes. */
export class VField extends HtmlElementNode {
  label(value?: ChildInput): this;
  hint(value: ChildInput): VField;
  error(value: string | boolean | null): VField;
  display(value: ChildInput): VField;
  control(setup: ChildInput | SetupCallback<HtmlElementNode>): VField;
  editor(setup: ChildInput | SetupCallback<HtmlElementNode>): VField;
  value(): unknown;
  value(value: unknown): VField;
  mode(): 'view' | 'edit';
  mode(value: 'view' | 'edit'): VField;
  view(): VField;
  edit(): VField;
}

export type FormItemRule = (
  value: unknown,
  values: Record<string, unknown>
) => string | boolean | undefined | void;

/** Form item with name/label/validation. */
export class VFormItem extends HtmlElementNode {
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
}

/** Form with values/validation/reset/submit. */
export class VForm extends HtmlElementNode {
  values(): Record<string, unknown>;
  values(value: Record<string, unknown>): VForm;
  value(name: string): unknown;
  validate(): boolean;
  reset(): VForm;
  submit(): boolean;
}

/** Star rating control. */
export class VRate extends HtmlElementNode {
  value(): number;
  value(value: number): VRate;
  count(): number;
  count(value: number): VRate;
  max(): number;
  max(value: number): VRate;
  allowHalf(value: boolean): VRate;
  allowClear(value: boolean): VRate;
  clearable(value: boolean): VRate;
  character(value: string): VRate;
  size(): string;
  size(value: string): VRate;
  disabled(value: boolean): VRate;
  readonly(value: boolean): VRate;
  required(value: boolean): VRate;
  error(value: string | boolean | null): VRate;
  clear(): VRate;
}

/** File upload with dropzone. */
export class VUpload extends HtmlElementNode {
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
  dropZone(setup: SetupInput<HtmlElementNode>): VUpload;
}

/** Avatar upload with preview. */
export class VAvatarUpload extends HtmlElementNode {
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

export const vInput: ElementFactory<VInput>;
export const vTimer: ElementFactory<VTimer>;
export const vTimerRange: ElementFactory<VTimerRange>;
export const vTextarea: ElementFactory<VTextarea>;
export const vSelect: ElementFactory<VSelect>;
export const vCheckbox: ElementFactory<VCheckbox>;
export const vSwitch: ElementFactory<VSwitch>;
export const vRadio: ElementFactory<VRadio>;
export const vCheckboxes: ElementFactory<VCheckboxes>;
export const vRadios: ElementFactory<VRadios>;
export const vField: ElementFactory<VField>;
export const vFormItem: ElementFactory<VFormItem>;
export const vForm: ElementFactory<VForm>;
export const vRate: ElementFactory<VRate>;
export const vUpload: ElementFactory<VUpload>;
export const vAvatarUpload: ElementFactory<VAvatarUpload>;
export const vColorPicker: ElementFactory<VColorPicker> & {
  (first?: SetupInput<VColorPicker> | null, callback?: SetupCallback<VColorPicker>): VColorPicker;
};
export const vSlider: ElementFactory<VSlider>;
export const vCascader: ElementFactory<VCascader>;
export const vTagsInput: ElementFactory<VTagsInput>;
export const vAutocomplete: ElementFactory<VAutocomplete>;

/** Parent-shortcut surface merged onto HtmlElementNode. */
export interface FormParentShortcuts {
  vInput(first?: SetupInput<VInput> | null, callback?: SetupCallback<VInput>): VInput;
  vTimer(first?: SetupInput<VTimer> | null, callback?: SetupCallback<VTimer>): VTimer;
  vTimerRange(
    first?: SetupInput<VTimerRange> | null,
    callback?: SetupCallback<VTimerRange>
  ): VTimerRange;
  vTextarea(first?: SetupInput<VTextarea> | null, callback?: SetupCallback<VTextarea>): VTextarea;
  vSelect(first?: SetupInput<VSelect> | null, callback?: SetupCallback<VSelect>): VSelect;
  vCheckbox(first?: SetupInput<VCheckbox> | null, callback?: SetupCallback<VCheckbox>): VCheckbox;
  vSwitch(first?: SetupInput<VSwitch> | null, callback?: SetupCallback<VSwitch>): VSwitch;
  vRadio(first?: SetupInput<VRadio> | null, callback?: SetupCallback<VRadio>): VRadio;
  vCheckboxes(
    first?: SetupInput<VCheckboxes> | null,
    callback?: SetupCallback<VCheckboxes>
  ): VCheckboxes;
  vRadios(first?: SetupInput<VRadios> | null, callback?: SetupCallback<VRadios>): VRadios;
  vField(first?: SetupInput<VField> | null, callback?: SetupCallback<VField>): VField;
  vFormItem(first?: SetupInput<VFormItem> | null, callback?: SetupCallback<VFormItem>): VFormItem;
  vForm(first?: SetupInput<VForm> | null, callback?: SetupCallback<VForm>): VForm;
  vRate(first?: SetupInput<VRate> | null, callback?: SetupCallback<VRate>): VRate;
  vUpload(first?: SetupInput<VUpload> | null, callback?: SetupCallback<VUpload>): VUpload;
  vAvatarUpload(
    first?: SetupInput<VAvatarUpload> | null,
    callback?: SetupCallback<VAvatarUpload>
  ): VAvatarUpload;
  vColorPicker(
    first?: SetupInput<VColorPicker> | null,
    callback?: SetupCallback<VColorPicker>
  ): VColorPicker;
  vSlider(first?: SetupInput<VSlider> | null, callback?: SetupCallback<VSlider>): VSlider;
  vCascader(first?: SetupInput<VCascader> | null, callback?: SetupCallback<VCascader>): VCascader;
  vTagsInput(
    first?: SetupInput<VTagsInput> | null,
    callback?: SetupCallback<VTagsInput>
  ): VTagsInput;
  vAutocomplete(
    first?: SetupInput<VAutocomplete> | null,
    callback?: SetupCallback<VAutocomplete>
  ): VAutocomplete;
}

export type { ElementOptions };
