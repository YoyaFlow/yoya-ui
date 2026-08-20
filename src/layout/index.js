import { registerChildFactories } from '../core/node.js';
import { HtmlElementNode } from '../html/index.js';

const layoutOptionNames = new Set([
  'align',
  'areas',
  'autoFlow',
  'columns',
  'direction',
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

export function flex(setup = null) {
  return createLayoutNode('flex', { display: 'flex' }, setup, applyFlexOptions);
}

export function stack(setup = null) {
  return createLayoutNode(
    'stack',
    { display: 'flex', flexDirection: 'column' },
    setup,
    applyFlexOptions
  );
}

export function vstack(setup = null) {
  return createLayoutNode(
    'vstack',
    { display: 'flex', flexDirection: 'column' },
    setup,
    applyFlexOptions
  );
}

export function hstack(setup = null) {
  return createLayoutNode(
    'hstack',
    { display: 'flex', flexDirection: 'row' },
    setup,
    applyFlexOptions
  );
}

export function center(setup = null) {
  return createLayoutNode(
    'center',
    { display: 'flex', alignItems: 'center', justifyContent: 'center' },
    setup,
    applyFlexOptions
  );
}

export function grid(setup = null) {
  return createLayoutNode('grid', { display: 'grid' }, setup, applyGridOptions);
}

export function responsiveGrid(setup = null) {
  const node = createLayoutNode(
    'responsive-grid',
    { display: 'grid' },
    typeof setup === 'function' ? null : setup,
    applyResponsiveGridOptions
  );
  const options = isPlainObject(setup) ? setup : {};
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

  if (typeof setup === 'function') {
    setup(node);
  }

  return node;
}

export function vBody(setup = null) {
  const node = new HtmlElementNode('div');
  const content = new HtmlElementNode('div').className('yoya-vbody-content');
  const appendOuterChild = node.child.bind(node);

  node.className('yoya-layout', 'yoya-vbody');
  node.attr('data-page-body', 'true');
  node.styles({
    background: '#f5f7fa',
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

  applyVBodySetup(node, setup);
  return node;
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

export function container(setup = null) {
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
    setup,
    applyContainerOptions
  );
}

export function spacer(setup = null) {
  const node = createLayoutNode(
    'spacer',
    { flexGrow: 1, minWidth: 0, minHeight: 0 },
    setup,
    applySpacerOptions
  );

  node.attr('aria-hidden', 'true');
  return node;
}

export function divider(setup = null) {
  const node = createLayoutNode('divider', {}, setup, applyDividerOptions);
  node.attr('role', 'separator');

  if (!node.attr('aria-orientation')) {
    node.attr('aria-orientation', 'horizontal');
  }

  return node;
}

const layoutFactories = {
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

function createLayoutNode(kind, baseStyles, setup, applyOptions) {
  const node = new HtmlElementNode('div');
  node.className('yoya-layout', `yoya-${kind}`);
  node.styles(baseStyles);
  applyLayoutSetup(node, setup, applyOptions);
  return node;
}

function applyLayoutSetup(node, setup, applyOptions) {
  if (setup === null || setup === undefined) {
    applyOptions(node, {});
    return node;
  }

  if (!isPlainObject(setup)) {
    applyOptions(node, {});
    return node.setup(setup);
  }

  applyOptions(node, setup);

  const elementConfig = omitLayoutOptions(setup);
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

function omitLayoutOptions(config) {
  return Object.fromEntries(
    Object.entries(config).filter(([name]) => !layoutOptionNames.has(name))
  );
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
