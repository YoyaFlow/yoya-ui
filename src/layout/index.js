import { registerChildFactories } from '../core/node.js';
import { HtmlElementNode } from '../html/index.js';
import {
  applyComponentArguments,
  normalizeComponentArguments,
  themeValue
} from '../components/shared.js';

const layoutOptionNames = new Set([
  'align',
  'areas',
  'autoFlow',
  'columns',
  'direction',
  'gutter',
  'offset',
  'pull',
  'push',
  'span',
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
  'gap',
  'justify',
  'maxWidth',
  'minColumnWidth',
  'orientation',
  'padding',
  'paddingInline',
  'rows',
  'size',
  'breakpoints',
  'wrap'
]);

const layoutRegionOptionNames = new Set(['height', 'width']);

export function flex(first = null, second = null, third = null) {
  return createLayoutNode('flex', { display: 'flex' }, first, applyFlexOptions, second, third);
}

export function stack(first = null, second = null, third = null) {
  return createLayoutNode(
    'stack',
    { display: 'flex', flexDirection: 'column' },
    first,
    applyFlexOptions,
    second,
    third
  );
}

export function vstack(first = null, second = null, third = null) {
  return createLayoutNode(
    'vstack',
    { display: 'flex', flexDirection: 'column' },
    first,
    applyFlexOptions,
    second,
    third
  );
}

export function hstack(first = null, second = null, third = null) {
  return createLayoutNode(
    'hstack',
    { display: 'flex', flexDirection: 'row' },
    first,
    applyFlexOptions,
    second,
    third
  );
}

export function center(first = null, second = null, third = null) {
  return createLayoutNode(
    'center',
    { display: 'flex', alignItems: 'center', justifyContent: 'center' },
    first,
    applyFlexOptions,
    second,
    third
  );
}

export function vRow(first = null, second = null, third = null) {
  const args = normalizeComponentArguments(first, second, third);
  const node = new HtmlElementNode('div');

  node.className('yoya-layout', 'yoya-vrow');
  node.styles({ boxSizing: 'border-box', display: 'flex', flexWrap: 'wrap', width: '100%' });
  node._gutter = null;

  node.gutter = (value) => {
    if (value === undefined) return node._gutter;
    node._gutter = normalizeLength(value);
    syncRowChildren(node);
    return node;
  };
  node.justify = (value) => {
    if (value === undefined) return node.style('justifyContent');
    node.style('justifyContent', value);
    return node;
  };
  node.align = (value) => {
    if (value === undefined) return node.style('alignItems');
    node.style('alignItems', value);
    return node;
  };
  node.wrap = (value) => {
    if (value === undefined) return node.style('flexWrap');
    node.style('flexWrap', value === false ? 'nowrap' : normalizeWrap(value ?? true));
    return node;
  };

  const originalChild = node.child.bind(node);
  node.child = (...children) => {
    originalChild(...children);
    syncRowChildren(node);
    return node;
  };

  applyLayoutSetup(node, args.first, applyRowOptions);
  syncRowChildren(node);
  return applyComponentArguments(node, args.options, args.callback);
}

export function vCol(first = null, second = null, third = null) {
  const args = normalizeComponentArguments(first, second, third);
  const node = new HtmlElementNode('div');

  node.className('yoya-layout', 'yoya-vcol');
  node.styles({ boxSizing: 'border-box', minWidth: '0' });
  node._baseCol = normalizeColProps({});
  node._responsiveCols = [];
  node._gutter = null;

  node.refresh = node._refreshCol = () => {
    const width = typeof window === 'undefined' ? null : window.innerWidth;
    const match =
      width === null
        ? null
        : node._responsiveCols.filter((entry) => width >= entry.minWidth).at(-1);
    const props = match?.props ?? node._baseCol;

    node.style('boxSizing', 'border-box');
    node.style('flex', '0 0 auto');
    node.style('left', props.push ? `${gridPercent(props.push)}%` : null);
    node.style('marginLeft', props.offset ? `${gridPercent(props.offset)}%` : null);
    node.style('paddingLeft', node._gutter ? halfLength(node._gutter) : null);
    node.style('paddingRight', node._gutter ? halfLength(node._gutter) : null);
    node.style('position', props.push || props.pull ? 'relative' : null);
    node.style('right', props.pull ? `${gridPercent(props.pull)}%` : null);
    node.style('width', `${gridPercent(props.span)}%`);
    return node;
  };

  node.span = (value) => {
    if (value === undefined) return node._baseCol.span;
    node._baseCol.span = normalizeGridUnit(value);
    node._refreshCol();
    return node;
  };

  node.offset = (value) => {
    if (value === undefined) return node._baseCol.offset;
    node._baseCol.offset = normalizeGridUnit(value);
    node._refreshCol();
    return node;
  };

  node.push = (value) => {
    if (value === undefined) return node._baseCol.push;
    node._baseCol.push = normalizeGridUnit(value);
    node._refreshCol();
    return node;
  };

  node.pull = (value) => {
    if (value === undefined) return node._baseCol.pull;
    node._baseCol.pull = normalizeGridUnit(value);
    node._refreshCol();
    return node;
  };

  node.gutter = (value) => {
    if (value === undefined) return node._gutter;
    node._gutter = normalizeLength(value);
    node._refreshCol();
    return node;
  };

  applyLayoutSetup(node, args.first, applyColOptions);
  node._refreshCol();

  if (node._responsiveCols.length && typeof window !== 'undefined') {
    node._colResize = () => node._refreshCol();
    window.addEventListener('resize', node._colResize);
    wrapColResponsiveDestroy(node);
  }

  return applyComponentArguments(node, args.options, args.callback);
}

export function grid(first = null, second = null, third = null) {
  return createLayoutNode('grid', { display: 'grid' }, first, applyGridOptions, second, third);
}

export function responsiveGrid(first = null, second = null, third = null) {
  const args = normalizeComponentArguments(first, second, third);
  const node = createLayoutNode(
    'responsive-grid',
    { display: 'grid' },
    args.first,
    applyResponsiveGridOptions,
    args.options,
    args.callback
  );
  const options = isPlainObject(args.first) ? args.first : {};
  node._responsiveGridBreakpoints = normalizeBreakpoints(options.breakpoints);
  node._responsiveGridMinColumnWidth = normalizeMinColumnWidth(options.minColumnWidth);

  node._responsiveGridRefresh = () => {
    const width = typeof window === 'undefined' ? null : window.innerWidth;
    const match =
      width === null
        ? null
        : node._responsiveGridBreakpoints
            .filter((breakpoint) => width >= breakpoint.minWidth)
            .at(-1);
    node.style(
      'gridTemplateColumns',
      match
        ? `repeat(${match.columns}, minmax(0, 1fr))`
        : `repeat(auto-fit, minmax(${node._responsiveGridMinColumnWidth}, 1fr))`
    );
    return node;
  };
  node.refresh = node._responsiveGridRefresh;
  node.minColumnWidth = (value) => {
    if (value === undefined) return node._responsiveGridMinColumnWidth;
    node._responsiveGridMinColumnWidth = normalizeMinColumnWidth(value);
    node._responsiveGridRefresh();
    return node;
  };
  node.breakpoints = (value) => {
    if (value === undefined) return node._responsiveGridBreakpoints;
    node._responsiveGridBreakpoints = normalizeBreakpoints(value);
    if (
      node._responsiveGridBreakpoints.length &&
      !node._responsiveGridResize &&
      typeof window !== 'undefined'
    ) {
      node._responsiveGridResize = () => node._responsiveGridRefresh();
      window.addEventListener('resize', node._responsiveGridResize);
      wrapResponsiveGridDestroy(node);
    }
    node._responsiveGridRefresh();
    return node;
  };
  node._responsiveGridRefresh();

  if (node._responsiveGridBreakpoints.length && typeof window !== 'undefined') {
    node._responsiveGridResize = () => node._responsiveGridRefresh();
    window.addEventListener('resize', node._responsiveGridResize);
    wrapResponsiveGridDestroy(node);
  }

  return node;
}

export function vBody(first = null, second = null, third = null) {
  const args = normalizeComponentArguments(first, second, third);
  const node = new HtmlElementNode('div');
  const content = new HtmlElementNode('div').className('yoya-vbody-content');
  const appendOuterChild = node.child.bind(node);

  node.className('yoya-layout', 'yoya-vbody');
  node.attr('data-page-body', 'true');
  node.styles({
    background: themeValue('color-bg', '#f5f7fa'),
    boxSizing: 'border-box',
    minHeight: '100%',
    padding: 'clamp(16px, 3vw, 32px)',
    width: '100%'
  });
  content.styles({
    display: 'grid',
    gap: '24px',
    marginLeft: 'auto',
    marginRight: 'auto',
    maxWidth: '1120px',
    width: '100%'
  });
  appendOuterChild(content);

  node.background = (value) => {
    if (value === undefined) return node.style('background');
    node.style('background', value);
    return node;
  };
  node.maxWidth = (value) => {
    if (value === undefined) return content.style('maxWidth');
    content.style('maxWidth', normalizeLength(value));
    return node;
  };
  node.padding = (value) => {
    if (value === undefined) return node.style('padding');
    node.style('padding', normalizeLength(value));
    return node;
  };
  node.gap = (value) => {
    if (value === undefined) return content.style('gap');
    content.style('gap', normalizeLength(value));
    return node;
  };
  node.minHeight = (value) => {
    if (value === undefined) return node.style('minHeight');
    node.style('minHeight', normalizeLength(value));
    return node;
  };
  node.content = (value) => {
    if (value === undefined) return content;
    if (typeof value === 'function') value(content);
    else content.child(value);
    return node;
  };
  node.child = (...children) => {
    content.child(...children);
    return node;
  };

  applyVBodySetup(node, args.first);
  return applyComponentArguments(node, args.options, args.callback);
}

export function createVBodyPage(setup = null, target = null) {
  const page = vBody(setup);
  if (typeof document !== 'undefined') {
    page.bindTo(target || document.body);
  }
  return page;
}

function wrapResponsiveGridDestroy(node) {
  if (node._responsiveGridDestroyWrapped) return;
  node._responsiveGridDestroyWrapped = true;
  const destroy = node.destroy.bind(node);
  node.destroy = () => {
    if (node._responsiveGridResize) {
      window.removeEventListener('resize', node._responsiveGridResize);
    }
    return destroy();
  };
}

export function container(first = null, second = null, third = null) {
  return createLayoutNode(
    'container',
    {
      width: '100%',
      maxWidth: '1120px',
      marginLeft: 'auto',
      marginRight: 'auto',
      paddingLeft: '16px',
      paddingRight: '16px'
    },
    first,
    applyContainerOptions,
    second,
    third
  );
}

export function vContainer(first = null, second = null, third = null) {
  const args = normalizeComponentArguments(first, second, third);
  const node = new HtmlElementNode('div');

  node.className('yoya-layout', 'yoya-vcontainer');
  node.styles({ boxSizing: 'border-box', display: 'flex', minWidth: '0', width: '100%' });
  node._direction = null;
  node._viewport = false;
  node._fill = false;
  node._scrollable = false;

  node.viewport = (value = true) => {
    if (value === undefined) return node._viewport;
    node._viewport = Boolean(value);
    node.styles({
      height: node._viewport ? '100dvh' : null,
      minHeight: node._viewport ? '100vh' : null,
      overflow: node._viewport ? 'hidden' : null
    });
    return node;
  };

  node.fill = (value = true) => {
    if (value === undefined) return node._fill;
    node._fill = Boolean(value);
    node.styles({
      flex: node._fill ? '1 1 auto' : null,
      height: node._fill ? 'auto' : null,
      minHeight: node._fill ? '0' : null,
      minWidth: node._fill ? '0' : null,
      overflow: node._fill ? 'hidden' : null
    });
    return node;
  };

  node.scrollable = (value = true) => {
    if (value === undefined) return node._scrollable;
    node._scrollable = Boolean(value);
    node.styles({
      height: node._scrollable ? '100%' : null,
      minHeight: node._scrollable ? '0' : null,
      overflow: node._scrollable ? 'auto' : null,
      overscrollBehavior: node._scrollable ? 'contain' : null
    });
    return node;
  };

  node._autoDirection = () =>
    node.children().some((child) => layoutChildIsHeaderOrFooter(child)) ? 'column' : 'row';
  node._syncContainerDirection = () => {
    node.style('flexDirection', node._direction || node._autoDirection());
    return node;
  };
  node.direction = (value) => {
    if (value === undefined) return node._direction || node._autoDirection();
    node._direction = value;
    node._syncContainerDirection();
    return node;
  };

  const originalChild = node.child.bind(node);
  node.child = (...children) => {
    originalChild(...children);
    node._syncContainerDirection();
    return node;
  };

  applyLayoutSetup(node, args.first, applyContainerLayoutOptions);
  node._syncContainerDirection();
  return applyComponentArguments(node, args.options, args.callback);
}

export function vHeader(first = null, second = null, third = null) {
  return createLayoutNode(
    'vheader',
    { boxSizing: 'border-box', flex: '0 0 auto', height: '60px', width: '100%' },
    first,
    applyHeaderOptions,
    second,
    third,
    'header',
    layoutRegionOptionNames,
    attachStickyRegionMethods
  );
}

export function vAside(first = null, second = null, third = null) {
  return createLayoutNode(
    'vaside',
    { boxSizing: 'border-box', flex: '0 0 auto', minWidth: '0', width: '300px' },
    first,
    applyAsideOptions,
    second,
    third,
    'aside',
    layoutRegionOptionNames,
    attachScrollableRegionMethods
  );
}

export function vMain(first = null, second = null, third = null) {
  return createLayoutNode(
    'vmain',
    {
      boxSizing: 'border-box',
      flex: '1 1 auto',
      minHeight: '0',
      minWidth: '0',
      overflow: 'auto'
    },
    first,
    applyMainOptions,
    second,
    third,
    'main',
    layoutRegionOptionNames,
    attachScrollableRegionMethods
  );
}

export function vFooter(first = null, second = null, third = null) {
  return createLayoutNode(
    'vfooter',
    { boxSizing: 'border-box', flex: '0 0 auto', height: '60px', width: '100%' },
    first,
    applyHeaderOptions,
    second,
    third,
    'footer',
    layoutRegionOptionNames,
    attachStickyRegionMethods
  );
}

export function spacer(first = null, second = null, third = null) {
  const node = createLayoutNode(
    'spacer',
    { flexGrow: 1, minWidth: 0, minHeight: 0 },
    first,
    applySpacerOptions,
    second,
    third
  );

  node.attr('aria-hidden', 'true');
  return node;
}

export function divider(first = null, second = null, third = null) {
  const node = createLayoutNode('divider', {}, first, applyDividerOptions, second, third);
  node.attr('role', 'separator');

  if (!node.attr('aria-orientation')) {
    node.attr('aria-orientation', 'horizontal');
  }

  return node;
}

const layoutFactories = {
  vAside,
  vCol,
  vContainer,
  vFooter,
  vHeader,
  vMain,
  vRow,
  center,
  container,
  divider,
  flex,
  grid,
  responsiveGrid,
  vBody,
  hstack,
  spacer,
  stack,
  vstack
};

registerChildFactories(HtmlElementNode, layoutFactories);

function createLayoutNode(
  kind,
  baseStyles,
  first,
  applyOptions,
  second,
  third,
  tagName = 'div',
  optionNames = null,
  enhance = null
) {
  const args = normalizeComponentArguments(first, second, third);
  const node = new HtmlElementNode(tagName);
  node.className('yoya-layout', `yoya-${kind}`);
  node.styles(baseStyles);
  if (enhance) {
    enhance(node);
  }
  applyLayoutSetup(node, args.first, applyOptions, optionNames);
  return applyComponentArguments(node, args.options, args.callback);
}

function attachStickyRegionMethods(node) {
  node.sticky = (value = true) => {
    if (value === undefined) return node.style('position') === 'sticky';
    const enabled = Boolean(value);
    node.styles({
      position: enabled ? 'sticky' : null,
      top: enabled ? '0' : null,
      zIndex: enabled ? '20' : null
    });
    return node;
  };
}

function attachScrollableRegionMethods(node) {
  node.scrollable = (value = true) => {
    if (value === undefined) return node.style('overflow') === 'auto';
    const enabled = Boolean(value);
    node.styles({
      height: enabled ? '100%' : null,
      minHeight: enabled ? '0' : null,
      overflow: enabled ? 'auto' : null,
      overscrollBehavior: enabled ? 'contain' : null
    });
    return node;
  };
}

function applyLayoutSetup(node, setup, applyOptions, optionNames = null) {
  if (setup === null || setup === undefined) {
    applyOptions(node, {});
    return node;
  }

  if (!isPlainObject(setup)) {
    applyOptions(node, {});
    return node.setup(setup);
  }

  applyOptions(node, setup);

  const elementConfig = omitLayoutOptions(setup, optionNames);
  if (Object.keys(elementConfig).length > 0) {
    node.setup(elementConfig);
  }

  return node;
}

function applyFlexOptions(node, options) {
  node.styles(
    compactStyles({
      alignItems: options.align,
      flexDirection: options.direction,
      flexWrap: normalizeWrap(options.wrap),
      gap: options.gap,
      justifyContent: options.justify
    })
  );
}

function applyGridOptions(node, options) {
  node.styles(
    compactStyles({
      gap: options.gap,
      gridAutoFlow: options.autoFlow,
      gridTemplateAreas: options.areas,
      gridTemplateColumns: normalizeTracks(options.columns),
      gridTemplateRows: normalizeTracks(options.rows)
    })
  );
}

function applyResponsiveGridOptions(node, options) {
  node.style('gap', options.gap);
  node.style(
    'gridTemplateColumns',
    `repeat(auto-fit, minmax(${normalizeMinColumnWidth(options.minColumnWidth)}, 1fr))`
  );
}

function applyVBodySetup(node, setup) {
  if (setup === null || setup === undefined) return node;
  if (typeof setup === 'function') {
    setup(node);
    return node;
  }
  if (!isPlainObject(setup)) {
    node.child(setup);
    return node;
  }

  const { background, children, content, gap, maxWidth, minHeight, padding, ...elementConfig } =
    setup;
  if (Object.keys(elementConfig).length) node.setup(elementConfig);
  if (background !== undefined) node.background(background);
  if (maxWidth !== undefined) node.maxWidth(maxWidth);
  if (padding !== undefined) node.padding(padding);
  if (gap !== undefined) node.gap(gap);
  if (minHeight !== undefined) node.minHeight(minHeight);
  const bodyContent = content ?? children;
  if (bodyContent !== undefined) node.content(bodyContent);
  return node;
}

function applyContainerOptions(node, options) {
  const paddingInline = options.paddingInline ?? options.padding;

  node.styles(
    compactStyles({
      maxWidth: options.maxWidth,
      paddingLeft: paddingInline,
      paddingRight: paddingInline
    })
  );
}

function applySpacerOptions(node, options) {
  node.styles(
    compactStyles({
      flexBasis: options.size,
      height: options.orientation === 'vertical' ? options.size : undefined,
      width: options.orientation === 'horizontal' ? options.size : undefined
    })
  );
}

function applyDividerOptions(node, options) {
  const orientation = options.orientation === 'vertical' ? 'vertical' : 'horizontal';

  node.attr('aria-orientation', orientation);
  if (orientation === 'vertical') {
    node.styles({
      alignSelf: 'stretch',
      background: 'currentColor',
      opacity: 0.2,
      width: '1px'
    });
    return;
  }

  node.styles({
    background: 'currentColor',
    height: '1px',
    opacity: 0.2,
    width: '100%'
  });
}

function syncRowChildren(node) {
  node.children().forEach((child) => {
    const target = child?._resolved ?? child?._resolve?.() ?? child;
    if (target && typeof target.gutter === 'function') {
      target.gutter(node._gutter);
    }
  });
}

function applyRowOptions(node, options) {
  if (options.gutter !== undefined) {
    node.gutter(options.gutter);
  }

  node.styles(
    compactStyles({
      alignItems: options.align,
      flexWrap:
        options.wrap === undefined || options.wrap === null
          ? 'wrap'
          : options.wrap === false
            ? 'nowrap'
            : normalizeWrap(options.wrap),
      justifyContent: options.justify
    })
  );
}

function applyColOptions(node, options) {
  node._baseCol = normalizeColProps(options);
  node._responsiveCols = normalizeColBreakpoints(options);

  if (options.gutter !== undefined) {
    node.gutter(options.gutter);
  }
}

const colBreakpointDefinitions = [
  ['xs', 0],
  ['sm', 768],
  ['md', 992],
  ['lg', 1200],
  ['xl', 1920]
];

function normalizeColProps(options = {}) {
  return {
    span: normalizeGridUnit(options.span ?? 24),
    offset: normalizeGridUnit(options.offset ?? 0),
    push: normalizeGridUnit(options.push ?? 0),
    pull: normalizeGridUnit(options.pull ?? 0)
  };
}

function normalizeColBreakpoints(options = {}) {
  return colBreakpointDefinitions
    .filter(([name]) => options[name] !== undefined)
    .map(([name, minWidth]) => ({
      minWidth,
      props: normalizeColBreakpointProps(options[name])
    }));
}

function normalizeColBreakpointProps(value) {
  if (typeof value === 'number') {
    return normalizeColProps({ span: value });
  }

  if (isPlainObject(value)) {
    return normalizeColProps(value);
  }

  return normalizeColProps({});
}

function normalizeGridUnit(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.min(24, Math.max(0, Math.round(number)));
}

function gridPercent(units) {
  return (units / 24) * 100;
}

function halfLength(value) {
  if (typeof value === 'number') {
    return `${value / 2}px`;
  }

  const match = String(value).match(/^(-?(?:\d+\.?\d*|\.\d+))([a-z%]+)$/i);
  if (match) {
    return `${Number(match[1]) / 2}${match[2]}`;
  }

  return `calc(${value} * 0.5)`;
}

function wrapColResponsiveDestroy(node) {
  if (node._colDestroyWrapped) return;
  node._colDestroyWrapped = true;
  const destroy = node.destroy.bind(node);
  node.destroy = () => {
    if (node._colResize) {
      window.removeEventListener('resize', node._colResize);
    }
    return destroy();
  };
}

function layoutChildIsHeaderOrFooter(child) {
  const target = child?._resolved ?? child?._resolve?.() ?? child;
  const classes = target?._classes;
  return Boolean(classes?.has('yoya-vheader') || classes?.has('yoya-vfooter'));
}

function applyContainerLayoutOptions(node, options) {
  if (options.direction !== undefined) {
    node.direction(options.direction);
  }

  node.styles(compactStyles({ gap: options.gap }));
}

function applyHeaderOptions(node, options) {
  node.style('height', normalizeLength(options.height ?? options.size ?? 60));
  node.style('width', '100%');
}

function applyAsideOptions(node, options) {
  node.style('width', normalizeLength(options.width ?? options.size ?? 300));
}

function applyMainOptions(node, options = {}) {
  if (options.height !== undefined) {
    node.style('height', normalizeLength(options.height));
  }
}

function normalizeTracks(value) {
  if (value === undefined || value === null || value === false) {
    return undefined;
  }

  if (typeof value === 'number') {
    return `repeat(${value}, minmax(0, 1fr))`;
  }

  return String(value);
}

function normalizeMinColumnWidth(value) {
  if (typeof value === 'number') {
    return `${value}px`;
  }

  return value || '240px';
}

function normalizeLength(value) {
  return typeof value === 'number' ? `${value}px` : value;
}

function normalizeBreakpoints(value) {
  if (!value) return [];

  const entries = Array.isArray(value)
    ? value
    : Object.entries(value).map(([minWidth, columns]) => ({ minWidth, columns }));

  return entries
    .map((entry) => ({
      columns: Number(entry.columns),
      minWidth: Number.parseInt(entry.minWidth, 10)
    }))
    .filter(({ columns, minWidth }) => Number.isFinite(minWidth) && columns > 0)
    .sort((left, right) => left.minWidth - right.minWidth);
}

function normalizeWrap(value) {
  if (value === true) {
    return 'wrap';
  }

  if (value === false || value === undefined || value === null) {
    return undefined;
  }

  return String(value);
}

function omitLayoutOptions(config, optionNames = null) {
  const names = optionNames || layoutOptionNames;

  return Object.fromEntries(Object.entries(config).filter(([name]) => !names.has(name)));
}

function compactStyles(styles) {
  return Object.fromEntries(
    Object.entries(styles).filter(
      ([, value]) => value !== undefined && value !== null && value !== false
    )
  );
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}
