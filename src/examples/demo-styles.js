const documentationThemes = [
  { accent: '#2563eb', prefix: 'button' },
  { accent: '#2563eb', prefix: 'layout' },
  { accent: '#0f766e', prefix: 'navigation' },
  { accent: '#7c3aed', prefix: 'data-display' },
  { accent: '#0f766e', prefix: 'feedback' }
];

function documentationRules(prefix, accent) {
  return [
    [`.components-${prefix}-docs`, { gap: '24px' }],
    [
      `.components-${prefix}-docs-header`,
      {
        borderLeft: `4px solid ${accent}`,
        display: 'grid',
        gap: '6px',
        padding: '4px 0 4px 12px'
      }
    ],
    [
      `.components-${prefix}-docs-header h1,
       .components-${prefix}-docs-header p,
       .components-${prefix}-docs-usage h2,
       .components-${prefix}-docs-usage p,
       .components-${prefix}-docs-usage ul,
       .components-${prefix}-docs-examples h2,
       .components-${prefix}-docs-examples > p,
       .components-${prefix}-docs-api h2,
       .components-${prefix}-demo h3,
       .components-${prefix}-demo > p`,
      { letterSpacing: '0', margin: '0' }
    ],
    [`.components-${prefix}-docs-header h1`, { color: '#172033', fontSize: '1.45rem' }],
    [
      `.components-${prefix}-docs-header p,
       .components-${prefix}-docs-usage p,
       .components-${prefix}-docs-usage li,
       .components-${prefix}-docs-examples > p,
       .components-${prefix}-demo > p`,
      { color: '#5a6575' }
    ],
    [
      `.components-${prefix}-docs-usage,
       .components-${prefix}-docs-api,
       .components-${prefix}-docs-examples`,
      { display: 'grid', gap: '12px', minWidth: '0' }
    ],
    [
      `.components-${prefix}-docs-usage`,
      {
        background: '#fbfcfe',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '16px'
      }
    ],
    [
      `.components-${prefix}-docs-usage h2,
       .components-${prefix}-docs-api h2,
       .components-${prefix}-docs-examples h2`,
      { color: '#172033', fontSize: '1.05rem' }
    ],
    [
      `.components-${prefix}-docs-usage ul`,
      { display: 'grid', gap: '6px', margin: '0', paddingLeft: '20px' }
    ],
    [
      `.components-${prefix}-docs-api`,
      {
        background: '#ffffff',
        border: '1px solid #d8e0ea',
        borderRadius: '8px',
        overflow: 'hidden'
      }
    ],
    [`.components-${prefix}-docs-api h2`, { padding: '16px 16px 0' }],
    [
      `.${prefix}-api-signature`,
      {
        background: '#fbfcfe',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        margin: '0 16px',
        overflow: 'auto',
        padding: '12px 14px'
      }
    ],
    [
      `.${prefix}-api-signature code`,
      {
        color: '#172033',
        fontFamily: "'Cascadia Code', 'Fira Code', ui-monospace, Consolas, monospace",
        fontSize: '0.84rem',
        whiteSpace: 'pre'
      }
    ],
    [
      `.components-${prefix}-docs-api table`,
      { borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%' }
    ],
    [
      `.components-${prefix}-docs-api th,
       .components-${prefix}-docs-api td`,
      {
        borderTop: '1px solid #e2e8f0',
        padding: '11px 16px',
        textAlign: 'left',
        verticalAlign: 'top'
      }
    ],
    [
      `.components-${prefix}-docs-api th`,
      { background: '#f8fafc', color: '#344054', fontSize: '0.82rem' }
    ],
    [`.components-${prefix}-docs-api td`, { color: '#5a6575', fontSize: '0.88rem' }],
    [
      `.components-${prefix}-docs-api td code`,
      {
        color: '#172033',
        fontFamily: "'Cascadia Code', 'Fira Code', ui-monospace, Consolas, monospace",
        fontSize: '0.82rem',
        overflowWrap: 'anywhere'
      }
    ],
    [
      `.components-${prefix}-demo`,
      {
        borderTop: '1px solid #d8e0ea',
        display: 'grid',
        gap: '10px',
        minWidth: '0',
        padding: '20px 0 0'
      }
    ],
    [`.components-${prefix}-demo h3`, { color: '#172033', fontSize: '1rem' }],
    [
      `.components-${prefix}-demo-live`,
      {
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        display: 'grid',
        gap: '12px',
        minWidth: '0',
        padding: '20px'
      }
    ],
    [`.components-${prefix}-demo .source-panel`, { marginTop: '2px' }]
  ];
}

const baseRules = [
  [
    '.components-demo-shell',
    {
      boxSizing: 'border-box',
      display: 'grid',
      gap: '16px',
      margin: '0 auto',
      padding: '16px',
      width: 'min(100%, 1440px)'
    }
  ],
  ['.components-demo-shell > .yoya-vnavbar', { position: 'sticky', top: '12px', zIndex: '20' }],
  [
    '.components-workspace',
    {
      alignItems: 'start',
      boxSizing: 'border-box',
      display: 'grid',
      gap: '16px',
      gridTemplateColumns: 'minmax(280px, 340px) minmax(0, 1fr)',
      margin: '0',
      minHeight: '0',
      padding: '0',
      width: '100%'
    }
  ],
  ['.components-menu, .components-router-panel', { minWidth: '0' }],
  [
    '.components-menu',
    {
      alignContent: 'start',
      background: '#ffffff',
      border: '1px solid #d8e0ea',
      borderRadius: '8px',
      display: 'grid',
      gap: '12px',
      padding: '16px'
    }
  ],
  ['.components-menu-intro', { display: 'grid', gap: '6px' }],
  [
    `.components-menu-intro h2,
     .components-menu-intro p,
     .components-route-page h2,
     .components-route-page p,
     .components-route-header h2,
     .components-route-header p,
     .components-route-meta h3,
     .components-route-meta strong,
     .components-route-detail h3,
     .components-route-detail strong,
     .components-route-detail code,
     .components-route-behavior h3,
     .components-route-behavior ul,
     .components-route-behavior li,
     .components-route-notes h3,
     .components-route-notes p,
     .components-route-placeholder h3,
     .components-route-placeholder p,
     .source-panel h2,
     .source-panel p,
     .components-not-found h2,
     .components-not-found p`,
    { letterSpacing: '0', margin: '0' }
  ],
  ['.components-menu-intro h2', { fontSize: '1rem' }],
  ['.components-menu-intro p', { color: '#5a6575' }],
  ['.components-menu-list', { minWidth: '0', padding: '0', width: '100%' }],
  ['.components-menu-list .yoya-vmenu', { gap: '4px', minWidth: '0', padding: '0', width: '100%' }],
  ['.components-menu-list .yoya-vmenu-group', { gap: '2px', padding: '0 0 6px' }],
  [
    '.components-menu-list .yoya-vmenu-group-label',
    {
      color: '#344054',
      fontSize: '0.78rem',
      fontWeight: '700',
      padding: '6px 10px 4px',
      textTransform: 'none'
    }
  ],
  [
    ".components-menu-list .yoya-vmenu-group[data-active='true'] .yoya-vmenu-group-label",
    { color: '#1d4ed8' }
  ],
  ['.components-menu-list .yoya-vmenu-item', { minHeight: '36px' }],
  [
    '.components-menu-list .yoya-vmenu-item-shortcut',
    {
      alignSelf: 'center',
      background: '#eef3f9',
      borderRadius: '999px',
      color: '#5a6575',
      fontSize: '0.8rem',
      justifySelf: 'end',
      lineHeight: '1.2',
      padding: '2px 8px',
      textAlign: 'right',
      whiteSpace: 'normal'
    }
  ],
  [
    ".components-menu-list .yoya-vmenu-item[data-component-status='planned'] .yoya-vmenu-item-shortcut",
    { background: '#fff6db', color: '#8a5b00' }
  ],
  ['.components-router-panel .yoya-vrouter-views', { minHeight: '100%' }],
  ['.components-route-page', { display: 'grid', gap: '16px' }]
];

const genericRules = [
  ['.components-route-page--intro', { gap: '12px' }],
  [
    '.components-route-meta-grid',
    {
      display: 'grid',
      gap: '12px',
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))'
    }
  ],
  [
    '.components-route-meta, .components-route-detail',
    {
      background: '#fbfcfe',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      display: 'grid',
      gap: '6px',
      minWidth: '0',
      padding: '14px 16px'
    }
  ],
  ['.components-route-meta h3', { color: '#5a6575', fontSize: '0.88rem' }],
  ['.components-route-meta strong', { color: '#172033', fontSize: '1.35rem' }],
  [
    '.components-route-header',
    {
      borderLeft: '4px solid #2563eb',
      display: 'grid',
      gap: '6px',
      padding: '4px 0 4px 12px'
    }
  ],
  ['.components-route-header h2', { color: '#172033', fontSize: '1.1rem' }],
  ['.components-route-header p, .components-route-page p', { color: '#5a6575' }],
  [
    '.components-route-layout',
    {
      alignItems: 'start',
      display: 'grid',
      gap: '16px',
      gridTemplateColumns: 'minmax(0, 1fr)'
    }
  ],
  ['.components-route-live', { display: 'grid', gap: '12px', minWidth: '0' }],
  [
    `.components-route-live h3,
     .components-route-behavior h3,
     .components-route-notes h3,
     .components-route-placeholder h3`,
    { color: '#172033', fontSize: '0.98rem' }
  ],
  [
    '.components-route-behavior, .components-route-notes, .components-route-placeholder',
    {
      background: '#fbfcfe',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      display: 'grid',
      gap: '10px',
      minWidth: '0',
      padding: '14px 16px'
    }
  ],
  ['.components-route-behavior ul', { color: '#4b5563', margin: '0', paddingLeft: '18px' }],
  ['.components-route-note-list', { display: 'flex', flexWrap: 'wrap', gap: '8px' }],
  [
    '.components-route-note, .detail-pill',
    {
      alignItems: 'center',
      background: '#f8fafc',
      border: '1px solid #d7dee8',
      borderRadius: '999px',
      color: '#445065',
      display: 'inline-flex',
      fontSize: '0.78rem',
      padding: '3px 10px'
    }
  ],
  [
    '.detail-grid-cell',
    {
      background: '#fbfcfe',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      display: 'grid',
      gap: '6px',
      minWidth: '0',
      padding: '12px 14px'
    }
  ],
  ['.detail-grid-cell strong', { color: '#172033' }],
  ['.components-route-placeholder p', { color: '#5a6575' }],
  [
    '.source-panel',
    {
      background: '#ffffff',
      border: '1px solid #d8e0ea',
      borderRadius: '8px',
      boxSizing: 'border-box',
      display: 'grid',
      gap: '10px',
      minWidth: '0',
      padding: '16px',
      width: '100%'
    }
  ],
  [
    '.source-code',
    {
      background: '#fbfcfe',
      border: '1px solid #e2e8f0',
      borderRadius: '6px',
      margin: '0',
      maxHeight: '620px',
      minHeight: '260px',
      overflow: 'auto',
      padding: '14px',
      width: '100%'
    }
  ],
  [
    '.source-code code',
    {
      color: '#172033',
      display: 'block',
      fontFamily: "'Cascadia Code', 'Fira Code', ui-monospace, Consolas, monospace",
      fontSize: '0.84rem',
      lineHeight: '1.55',
      minWidth: 'max-content',
      whiteSpace: 'pre'
    }
  ],
  [
    '.components-route-details',
    {
      display: 'grid',
      gap: '12px',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
    }
  ],
  ['.components-route-detail h3', { color: '#5a6575', fontSize: '0.88rem' }],
  [
    '.components-route-detail code',
    {
      color: '#172033',
      fontFamily: "ui-monospace, SFMono-Regular, Consolas, 'Cascadia Code', monospace",
      fontSize: '0.86rem',
      overflowWrap: 'anywhere'
    }
  ],
  ['.components-not-found', { display: 'grid', gap: '12px' }],
  ['.components-not-found a', { color: '#1f6feb', fontWeight: '600' }]
];

const layoutExtraRules = [
  ['.components-layout-docs--popup', { gap: '24px' }],
  ['.components-layout-popup-sheet', { display: 'grid', gap: '14px', padding: '0' }],
  ['.components-layout-docs--popup .yoya-vdialog', { border: 'none' }],
  [
    '.components-layout-docs--popup .yoya-vdialog-content',
    { display: 'grid', gap: '14px', padding: '18px 20px 20px' }
  ],
  ['.components-layout-docs--popup .yoya-vdialog-content > .yoya-vcard', { margin: '0' }],
  [
    `.components-layout-docs--popup .yoya-vdialog-content > .yoya-vcard .yoya-vcard-header,
     .components-layout-docs--popup .yoya-vdialog-content > .yoya-vcard .yoya-vcard-body,
     .components-layout-docs--popup .yoya-vdialog-content > .yoya-vcard .yoya-vcard-footer`,
    { paddingLeft: '0', paddingRight: '0' }
  ],
  ['.components-layout-docs--templates', { gap: '24px' }],
  [
    '.components-layout-template-shell',
    { display: 'grid', gap: '16px', minWidth: '0', width: '100%' }
  ],
  ['.components-layout-template-auth-card', { width: '100%' }]
];

const buttonExtraRules = [
  ['.components-button-demo-live', { alignItems: 'center', minHeight: '92px' }],
  ['.button-demo-row', { alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '10px' }],
  ['.button-demo-stack', { display: 'grid', gap: '12px' }],
  ['.button-demo-form', { display: 'grid', gap: '12px' }]
];

const dataDisplayExtraRules = [
  ['.components-data-display-demo-live .yoya-vtable', { width: '100%' }]
];

const feedbackExtraRules = [
  ['.components-feedback-demo-live .yoya-vmessage-container', { minHeight: '44px' }]
];

const demoRules = [
  ...baseRules,
  ...documentationThemes.flatMap(({ accent, prefix }) => documentationRules(prefix, accent)),
  ...layoutExtraRules,
  ...buttonExtraRules,
  ...dataDisplayExtraRules,
  ...feedbackExtraRules,
  ...genericRules
];

function applySelector(element, selector, styles) {
  if (element.matches?.(selector)) {
    Object.assign(element.style, styles);
  }

  element.querySelectorAll(selector).forEach((match) => {
    Object.assign(match.style, styles);
  });
}

function applyRules(element, rules) {
  rules.forEach(([selector, styles]) => applySelector(element, selector, styles));
}

function applyGlobalStyles() {
  const documentElement = document.documentElement;
  if (documentElement) {
    documentElement.style.colorScheme = 'light';
    documentElement.style.minHeight = '100%';
  }

  const body = document.body;
  if (body) {
    body.style.background = '#f5f7fa';
    body.style.color = '#172033';
    body.style.fontFamily =
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    body.style.lineHeight = '1.5';
    body.style.margin = '0';
    body.style.minHeight = '100%';
  }

  const app = document.querySelector('#app');
  if (app) {
    app.style.minHeight = '100vh';
  }

  if (!document.head.querySelector('[data-demo-backdrop-style]')) {
    const backdropStyle = document.createElement('style');
    backdropStyle.setAttribute('data-demo-backdrop-style', 'true');
    backdropStyle.textContent =
      '.components-layout-docs--popup .yoya-vdialog::backdrop { background: rgba(15, 23, 42, 0.28); }';
    document.head.appendChild(backdropStyle);
  }
}

function bindLinkFocus(element) {
  element.querySelectorAll('a').forEach((link) => {
    if (link.dataset.demoFocusBound) {
      return;
    }

    link.dataset.demoFocusBound = 'true';
    link.addEventListener('focus', () => {
      link.style.outline = '2px solid #1f6feb';
      link.style.outlineOffset = '2px';
    });
    link.addEventListener('blur', () => {
      link.style.outline = '';
      link.style.outlineOffset = '';
    });
  });
}

function applyResponsiveStyles(element) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return;
  }

  if (!window.matchMedia('(max-width: 960px)').matches) {
    return;
  }

  applySelector(element, '.components-demo-shell', { padding: '12px', width: '100%' });
  applySelector(
    element,
    '.components-workspace, .components-route-meta-grid, .components-route-details, .components-route-layout',
    { gridTemplateColumns: '1fr' }
  );
}

export function applyDemoStyles(root) {
  const element = typeof root.renderDom === 'function' ? root.renderDom() : root;
  if (!element || typeof element.querySelectorAll !== 'function') {
    return root;
  }

  applyGlobalStyles();
  applySelector(element, 'a', { color: 'inherit', textDecoration: 'none' });
  applyRules(element, demoRules);
  applySelector(element, '*', { boxSizing: 'border-box' });
  bindLinkFocus(element);
  applyResponsiveStyles(element);

  return root;
}
