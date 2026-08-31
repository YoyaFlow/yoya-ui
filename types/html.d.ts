import type {
  ElementFactory,
  ElementNode,
  ElementOptions,
  SetupCallback,
  SetupInput
} from './core.js';
import type { ActionsParentShortcuts } from './actions.js';
import type { AsyncParentShortcuts } from './async.js';
import type { ChartParentShortcuts } from './chart.js';
import type { DataDisplayParentShortcuts } from './data-display.js';
import type { EffectsParentShortcuts } from './effects.js';
import type { FeedbackParentShortcuts } from './feedback.js';
import type { FormParentShortcuts } from './form.js';
import type { I18nParentShortcuts } from './i18n.js';
import type { LayoutParentShortcuts } from './layout.js';
import type { NavigationParentShortcuts } from './navigation.js';
import type { RouterParentShortcuts } from './router.js';
import type { SvgParentShortcuts } from './svg.js';
import type { ThemeParentShortcuts } from './theme.js';

/**
 * HtmlElementNode is the HTML DSL element node. HTML child shortcuts are only
 * registered on this class so SVG nodes stay isolated.
 */
export class HtmlElementNode extends ElementNode {}

export interface HtmlElementNode {
  renderDom(): HTMLElement | null;
}

/**
 * Parent-shortcut DSL surface merged onto HtmlElementNode: every HTML factory
 * plus layout/SVG/component shortcuts registered through registerChildFactories.
 */
export interface HtmlElementNode
  extends
    ElementNode,
    HtmlElementShortcuts,
    SvgParentShortcuts,
    LayoutParentShortcuts,
    ActionsParentShortcuts,
    NavigationParentShortcuts,
    FeedbackParentShortcuts,
    FormParentShortcuts,
    DataDisplayParentShortcuts,
    AsyncParentShortcuts,
    EffectsParentShortcuts,
    I18nParentShortcuts,
    ThemeParentShortcuts,
    RouterParentShortcuts,
    ChartParentShortcuts {}

/** HTML element factories, one per WHATWG conforming tag. */
export interface HtmlElementShortcuts {
  a(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  abbr(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  address(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  area(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  article(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  aside(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  audio(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  b(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  base(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  bdi(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  bdo(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  blockquote(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  body(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  br(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  button(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  canvas(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  caption(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  cite(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  code(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  col(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  colgroup(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  data(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  datalist(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  dd(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  del(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  details(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  dfn(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  dialog(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  div(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  dl(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  dt(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  em(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  embed(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  fieldset(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  figcaption(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  figure(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  footer(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  form(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  h1(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  h2(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  h3(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  h4(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  h5(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  h6(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  head(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  header(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  hgroup(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  hr(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  html(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  i(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  iframe(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  img(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  input(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  ins(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  kbd(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  label(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  legend(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  li(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  link(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  main(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  map(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  mark(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  menu(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  meta(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  meter(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  nav(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  noscript(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  object(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  ol(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  optgroup(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  option(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  output(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  p(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  picture(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  pre(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  progress(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  q(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  rp(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  rt(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  ruby(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  s(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  samp(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  script(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  search(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  section(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  select(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  selectedcontent(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  slot(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  small(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  source(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  span(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  strong(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  /** style() conflicts with the CSS style API, so the <style> shortcut is styleTag(). */
  styleTag(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  sub(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  summary(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  sup(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  table(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  tbody(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  td(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  template(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  textarea(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  tfoot(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  th(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  thead(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  time(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  title(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  tr(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  track(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  u(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  ul(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  /** var is a JS keyword, so the factory and shortcut are named varTag(). */
  varTag(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  video(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
  wbr(first?: SetupInput<HtmlElementNode> | null): HtmlElementNode;
}

export const a: ElementFactory<HtmlElementNode>;
export const abbr: ElementFactory<HtmlElementNode>;
export const address: ElementFactory<HtmlElementNode>;
export const area: ElementFactory<HtmlElementNode>;
export const article: ElementFactory<HtmlElementNode>;
export const aside: ElementFactory<HtmlElementNode>;
export const audio: ElementFactory<HtmlElementNode>;
export const b: ElementFactory<HtmlElementNode>;
export const base: ElementFactory<HtmlElementNode>;
export const bdi: ElementFactory<HtmlElementNode>;
export const bdo: ElementFactory<HtmlElementNode>;
export const blockquote: ElementFactory<HtmlElementNode>;
export const body: ElementFactory<HtmlElementNode>;
export const br: ElementFactory<HtmlElementNode>;
export const button: ElementFactory<HtmlElementNode>;
export const canvas: ElementFactory<HtmlElementNode>;
export const caption: ElementFactory<HtmlElementNode>;
export const cite: ElementFactory<HtmlElementNode>;
export const code: ElementFactory<HtmlElementNode>;
export const col: ElementFactory<HtmlElementNode>;
export const colgroup: ElementFactory<HtmlElementNode>;
export const data: ElementFactory<HtmlElementNode>;
export const datalist: ElementFactory<HtmlElementNode>;
export const dd: ElementFactory<HtmlElementNode>;
export const del: ElementFactory<HtmlElementNode>;
export const details: ElementFactory<HtmlElementNode>;
export const dfn: ElementFactory<HtmlElementNode>;
export const dialog: ElementFactory<HtmlElementNode>;
export const div: ElementFactory<HtmlElementNode>;
export const dl: ElementFactory<HtmlElementNode>;
export const dt: ElementFactory<HtmlElementNode>;
export const em: ElementFactory<HtmlElementNode>;
export const embed: ElementFactory<HtmlElementNode>;
export const fieldset: ElementFactory<HtmlElementNode>;
export const figcaption: ElementFactory<HtmlElementNode>;
export const figure: ElementFactory<HtmlElementNode>;
export const footer: ElementFactory<HtmlElementNode>;
export const form: ElementFactory<HtmlElementNode>;
export const h1: ElementFactory<HtmlElementNode>;
export const h2: ElementFactory<HtmlElementNode>;
export const h3: ElementFactory<HtmlElementNode>;
export const h4: ElementFactory<HtmlElementNode>;
export const h5: ElementFactory<HtmlElementNode>;
export const h6: ElementFactory<HtmlElementNode>;
export const head: ElementFactory<HtmlElementNode>;
export const header: ElementFactory<HtmlElementNode>;
export const hgroup: ElementFactory<HtmlElementNode>;
export const hr: ElementFactory<HtmlElementNode>;
export const html: ElementFactory<HtmlElementNode>;
export const i: ElementFactory<HtmlElementNode>;
export const iframe: ElementFactory<HtmlElementNode>;
export const img: ElementFactory<HtmlElementNode>;
export const input: ElementFactory<HtmlElementNode>;
export const ins: ElementFactory<HtmlElementNode>;
export const kbd: ElementFactory<HtmlElementNode>;
export const label: ElementFactory<HtmlElementNode>;
export const legend: ElementFactory<HtmlElementNode>;
export const li: ElementFactory<HtmlElementNode>;
export const link: ElementFactory<HtmlElementNode>;
export const main: ElementFactory<HtmlElementNode>;
export const map: ElementFactory<HtmlElementNode>;
export const mark: ElementFactory<HtmlElementNode>;
export const menu: ElementFactory<HtmlElementNode>;
export const meta: ElementFactory<HtmlElementNode>;
export const meter: ElementFactory<HtmlElementNode>;
export const nav: ElementFactory<HtmlElementNode>;
export const noscript: ElementFactory<HtmlElementNode>;
export const object: ElementFactory<HtmlElementNode>;
export const ol: ElementFactory<HtmlElementNode>;
export const optgroup: ElementFactory<HtmlElementNode>;
export const option: ElementFactory<HtmlElementNode>;
export const output: ElementFactory<HtmlElementNode>;
export const p: ElementFactory<HtmlElementNode>;
export const picture: ElementFactory<HtmlElementNode>;
export const pre: ElementFactory<HtmlElementNode>;
export const progress: ElementFactory<HtmlElementNode>;
export const q: ElementFactory<HtmlElementNode>;
export const rp: ElementFactory<HtmlElementNode>;
export const rt: ElementFactory<HtmlElementNode>;
export const ruby: ElementFactory<HtmlElementNode>;
export const s: ElementFactory<HtmlElementNode>;
export const samp: ElementFactory<HtmlElementNode>;
export const script: ElementFactory<HtmlElementNode>;
export const search: ElementFactory<HtmlElementNode>;
export const section: ElementFactory<HtmlElementNode>;
export const select: ElementFactory<HtmlElementNode>;
export const selectedcontent: ElementFactory<HtmlElementNode>;
export const slot: ElementFactory<HtmlElementNode>;
export const small: ElementFactory<HtmlElementNode>;
export const source: ElementFactory<HtmlElementNode>;
export const span: ElementFactory<HtmlElementNode>;
export const strong: ElementFactory<HtmlElementNode>;
export const style: ElementFactory<HtmlElementNode>;
export const styleTag: ElementFactory<HtmlElementNode>;
export const sub: ElementFactory<HtmlElementNode>;
export const summary: ElementFactory<HtmlElementNode>;
export const sup: ElementFactory<HtmlElementNode>;
export const table: ElementFactory<HtmlElementNode>;
export const tbody: ElementFactory<HtmlElementNode>;
export const td: ElementFactory<HtmlElementNode>;
export const template: ElementFactory<HtmlElementNode>;
export const textarea: ElementFactory<HtmlElementNode>;
export const tfoot: ElementFactory<HtmlElementNode>;
export const th: ElementFactory<HtmlElementNode>;
export const thead: ElementFactory<HtmlElementNode>;
export const time: ElementFactory<HtmlElementNode>;
export const title: ElementFactory<HtmlElementNode>;
export const tr: ElementFactory<HtmlElementNode>;
export const track: ElementFactory<HtmlElementNode>;
export const u: ElementFactory<HtmlElementNode>;
export const ul: ElementFactory<HtmlElementNode>;
export const varTag: ElementFactory<HtmlElementNode>;
export const video: ElementFactory<HtmlElementNode>;
export const wbr: ElementFactory<HtmlElementNode>;

export type { ElementOptions, SetupCallback, SetupInput };
