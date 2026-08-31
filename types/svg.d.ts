import type {
  ElementNode,
  ElementOptions,
  SetupCallback,
  SetupInput,
  StyleInput,
  StyleValue
} from './core.js';

export const SVG_NAMESPACE: string;

/**
 * SvgElementNode is an SVG-namespace element node. SVG child shortcuts are
 * only registered here, keeping the HTML and SVG DSLs separate.
 */
export class SvgElementNode extends ElementNode {
  /** SVG text hosts accept raw text; other elements create <text> children. */
  text(
    ...args: Array<
      string | number | SetupCallback<SvgElementNode> | ElementOptions | null | undefined
    >
  ): this;

  renderDom(): SVGElement | null;
}

/** Signature shared by SVG factories: accepts any number of setup inputs. */
export interface SvgElementFactory {
  (...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
}

/** SVG child shortcuts registered on SvgElementNode. */
export interface SvgChildShortcuts {
  svg(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  animate(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  animateMotion(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  animateTransform(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  circle(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  clipPath(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  defs(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  desc(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  ellipse(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  feBlend(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  feColorMatrix(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  feComponentTransfer(
    ...setups: Array<SetupInput<SvgElementNode> | null | undefined>
  ): SvgElementNode;
  feComposite(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  feConvolveMatrix(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  feDiffuseLighting(
    ...setups: Array<SetupInput<SvgElementNode> | null | undefined>
  ): SvgElementNode;
  feDisplacementMap(
    ...setups: Array<SetupInput<SvgElementNode> | null | undefined>
  ): SvgElementNode;
  feDistantLight(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  feDropShadow(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  feFlood(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  feFuncA(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  feFuncB(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  feFuncG(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  feFuncR(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  feGaussianBlur(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  feImage(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  feMerge(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  feMergeNode(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  feMorphology(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  feOffset(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  fePointLight(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  feSpecularLighting(
    ...setups: Array<SetupInput<SvgElementNode> | null | undefined>
  ): SvgElementNode;
  feSpotLight(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  feTile(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  feTurbulence(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  filter(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  foreignObject(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  g(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  image(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  line(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  linearGradient(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  marker(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  mask(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  metadata(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  mpath(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  path(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  pattern(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  polygon(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  polyline(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  radialGradient(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  rect(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  set(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  stop(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  a(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  script(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  switch(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  title(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  symbol(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  textPath(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  tspan(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  use(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
  view(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
}

/** Merged SVG child shortcut surface on SvgElementNode. */
export interface SvgElementNode extends SvgChildShortcuts {}

/** The svg shortcut registered on HtmlElementNode. */
export interface SvgParentShortcuts {
  svg(...setups: Array<SetupInput<SvgElementNode> | null | undefined>): SvgElementNode;
}

/** Creates an <svg> element; the only SVG entry visible from HTML DSL. */
export const svg: SvgElementFactory;

// Built-in icon factories (each returns an SVG node).
export function ArrowDownOutlined(): SvgElementNode;
export function ArrowLeftOutlined(): SvgElementNode;
export function ArrowRightOutlined(): SvgElementNode;
export function ArrowUpOutlined(): SvgElementNode;
export function BellOutlined(): SvgElementNode;
export function CalendarOutlined(): SvgElementNode;
export function CheckOutlined(): SvgElementNode;
export function ChevronDownOutlined(): SvgElementNode;
export function ChevronLeftOutlined(): SvgElementNode;
export function ChevronRightOutlined(): SvgElementNode;
export function ChevronUpOutlined(): SvgElementNode;
export function CloseOutlined(): SvgElementNode;
export function CodeOutlined(): SvgElementNode;
export function CopyOutlined(): SvgElementNode;
export function DownloadOutlined(): SvgElementNode;
export function EditOutlined(): SvgElementNode;
export function ExternalOutlined(): SvgElementNode;
export function EyeOutlined(): SvgElementNode;
export function FileOutlined(): SvgElementNode;
export function FolderOutlined(): SvgElementNode;
export function FolderOpenOutlined(): SvgElementNode;
export function HeartOutlined(): SvgElementNode;
export function HomeOutlined(): SvgElementNode;
export function InfoOutlined(): SvgElementNode;
export function LockOutlined(): SvgElementNode;
export function LogoutOutlined(): SvgElementNode;
export function MailOutlined(): SvgElementNode;
export function MenuOutlined(): SvgElementNode;
export function MinusOutlined(): SvgElementNode;
export function MoreHorizontalOutlined(): SvgElementNode;
export function PlusOutlined(): SvgElementNode;
export function RefreshOutlined(): SvgElementNode;
export function SearchOutlined(): SvgElementNode;
export function SettingsOutlined(): SvgElementNode;
export function StarOutlined(): SvgElementNode;
export function TrashOutlined(): SvgElementNode;
export function UploadOutlined(): SvgElementNode;
export function UserOutlined(): SvgElementNode;
export function WarningOutlined(): SvgElementNode;
export function SunOutlined(): SvgElementNode;
export function MoonOutlined(): SvgElementNode;
export function MonitorOutlined(): SvgElementNode;
