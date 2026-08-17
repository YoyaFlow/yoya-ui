import { ElementNode } from '../core/element-node.js';
import { registerChildFactories } from '../core/factory.js';

const layoutOptionNames = new Set([
  'align',
  'areas',
  'autoFlow',
  'columns',
  'direction',
  'gap',
  'justify',
  'maxWidth',
  'orientation',
  'padding',
  'paddingInline',
  'rows',
  'size',
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
  hstack,
  spacer,
  stack,
  vstack
};

registerChildFactories(ElementNode, layoutFactories);

function createLayoutNode(kind, baseStyles, setup, applyOptions) {
  const node = new ElementNode('div');
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
  node.styles(compactStyles({
    alignItems: options.align,
    flexDirection: options.direction,
    flexWrap: normalizeWrap(options.wrap),
    gap: options.gap,
    justifyContent: options.justify
  }));
}

function applyGridOptions(node, options) {
  node.styles(compactStyles({
    gap: options.gap,
    gridAutoFlow: options.autoFlow,
    gridTemplateAreas: options.areas,
    gridTemplateColumns: normalizeTracks(options.columns),
    gridTemplateRows: normalizeTracks(options.rows)
  }));
}

function applyContainerOptions(node, options) {
  const paddingInline = options.paddingInline ?? options.padding;

  node.styles(compactStyles({
    maxWidth: options.maxWidth,
    paddingLeft: paddingInline,
    paddingRight: paddingInline
  }));
}

function applySpacerOptions(node, options) {
  node.styles(compactStyles({
    flexBasis: options.size,
    height: options.orientation === 'vertical' ? options.size : undefined,
    width: options.orientation === 'horizontal' ? options.size : undefined
  }));
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
    Object.entries(styles).filter(([, value]) => value !== undefined && value !== null && value !== false)
  );
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}
