const documentationThemes = [
  { accent: '#2563eb', prefix: 'button' },
  { accent: '#2563eb', prefix: 'layout' },
  { accent: '#0f766e', prefix: 'navigation' },
  { accent: '#7c3aed', prefix: 'data-display' },
  { accent: '#0f766e', prefix: 'feedback' },
  { accent: '#047857', prefix: 'i18n' },
  { accent: '#0f766e', prefix: 'state' }
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
    [
      `.components-${prefix}-docs-header h1`,
      { color: 'var(--yoya-color-text, #172033)', fontSize: '1.45rem' }
    ],
    [
      `.components-${prefix}-docs-header p,
       .components-${prefix}-docs-usage p,
       .components-${prefix}-docs-usage li,
       .components-${prefix}-docs-examples > p,
       .components-${prefix}-demo > p`,
      { color: 'var(--yoya-color-text-muted, #5a6575)' }
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
        background: 'var(--yoya-color-surface-muted, #fbfcfe)',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '16px'
      }
    ],
    [
      `.components-${prefix}-docs-usage h2,
       .components-${prefix}-docs-api h2,
       .components-${prefix}-docs-examples h2`,
      { color: 'var(--yoya-color-text, #172033)', fontSize: '1.05rem' }
    ],
    [
      `.components-${prefix}-docs-usage ul`,
      { display: 'grid', gap: '6px', margin: '0', paddingLeft: '20px' }
    ],
    [
      `.components-${prefix}-docs-api`,
      {
        background: 'var(--yoya-color-surface, #ffffff)',
        border: '1px solid #d8e0ea',
        borderRadius: '8px',
        overflow: 'hidden'
      }
    ],
    [`.components-${prefix}-docs-api h2`, { padding: '16px 16px 0' }],
    [
      `.${prefix}-api-signature`,
      {
        background: 'var(--yoya-color-surface-muted, #fbfcfe)',
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
        color: 'var(--yoya-color-text, #172033)',
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
      {
        background: 'var(--yoya-color-surface-hover, #f8fafc)',
        color: 'var(--yoya-color-text-secondary, #344054)',
        fontSize: '0.82rem'
      }
    ],
    [
      `.components-${prefix}-docs-api td`,
      { color: 'var(--yoya-color-text-muted, #5a6575)', fontSize: '0.88rem' }
    ],
    [
      `.components-${prefix}-docs-api td code`,
      {
        color: 'var(--yoya-color-text, #172033)',
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
    [
      `.components-${prefix}-demo h3`,
      { color: 'var(--yoya-color-text, #172033)', fontSize: '1rem' }
    ],
    [
      `.components-${prefix}-demo-live`,
      {
        background: 'var(--yoya-color-surface, #ffffff)',
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
      gap: '0px',
      gridTemplateRows: '52px minmax(0, 1fr)',
      height: '100dvh',
      margin: '0',
      overflow: 'hidden',
      padding: '0',
      width: '100%'
    }
  ],
  [
    '.components-workspace',
    {
      alignItems: 'stretch',
      boxSizing: 'border-box',
      display: 'grid',
      gap: '0px',
      gridTemplateColumns: 'minmax(248px, 288px) minmax(0, 1fr)',
      height: '100%',
      margin: '0',
      minHeight: '0',
      overflow: 'hidden',
      padding: '0',
      width: '100%'
    }
  ],
  ['.components-menu, .components-router-panel', { minWidth: '0' }],
  [
    '.components-menu',
    {
      alignContent: 'start',
      display: 'grid',
      gap: '10px',
      height: '100%',
      overflow: 'auto',
      padding: '14px 12px 18px',
      width: '100%'
    }
  ],
  ['.components-router-panel', { height: '100%', overflow: 'auto', width: '100%' }],
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
  ['.components-menu-list', { minWidth: '0', padding: '0', width: '100%' }],
  ['.components-route-page', { display: 'grid', gap: '16px' }]
];

const genericRules = [
  ['.components-route-page--intro, .components-route-page--overview', { gap: '12px' }],
  ['.components-guide-page', { display: 'grid', gap: '16px' }],
  [
    '.components-guide-page > h2',
    { color: 'var(--yoya-color-text, #172033)', fontSize: '1.35rem', margin: '0' }
  ],
  ['.components-guide-page > p', { color: 'var(--yoya-color-text-muted, #5a6575)', margin: '0' }],
  [
    '.components-guide-section',
    {
      background: 'var(--yoya-color-surface, #ffffff)',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      display: 'grid',
      gap: '10px',
      padding: '16px'
    }
  ],
  [
    '.components-guide-section h3',
    { color: 'var(--yoya-color-text, #172033)', fontSize: '1rem', margin: '0' }
  ],
  [
    '.components-guide-section p, .components-guide-section li',
    { color: 'var(--yoya-color-text-muted, #5a6575)' }
  ],
  [
    '.components-guide-section ul',
    { display: 'grid', gap: '6px', margin: '0', paddingLeft: '20px' }
  ],
  [
    '.guide-code',
    {
      background: 'var(--yoya-color-surface-muted, #fbfcfe)',
      border: '1px solid #e2e8f0',
      borderRadius: '6px',
      margin: '0',
      overflow: 'auto',
      padding: '12px 14px'
    }
  ],
  [
    '.guide-code code',
    {
      color: 'var(--yoya-color-text, #172033)',
      fontFamily: "'Cascadia Code', 'Fira Code', ui-monospace, Consolas, monospace",
      fontSize: '0.84rem',
      whiteSpace: 'pre'
    }
  ],
  [
    '.components-overview-section, .components-overview-guides',
    { display: 'grid', gap: '10px', minWidth: '0' }
  ],
  [
    '.components-overview-section h3, .components-overview-guides h3',
    { color: 'var(--yoya-color-text, #172033)', fontSize: '1rem', margin: '0' }
  ],
  [
    '.components-overview-grid',
    {
      display: 'grid',
      gap: '12px',
      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))'
    }
  ],
  [
    '.components-overview-card',
    {
      background: 'var(--yoya-color-surface, #ffffff)',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      color: 'inherit',
      display: 'grid',
      gap: '6px',
      minWidth: '0',
      padding: '14px 16px',
      textDecoration: 'none'
    }
  ],
  [
    '.components-overview-card h3',
    { color: 'var(--yoya-color-text, #172033)', fontSize: '0.98rem', margin: '0' }
  ],
  ['.components-overview-card p', { color: 'var(--yoya-color-text-muted, #5a6575)', margin: '0' }],
  [
    '.components-overview-card strong',
    { color: '#2563eb', fontSize: '0.86rem', fontWeight: '600' }
  ],
  ['.components-overview-principles-grid', { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }],
  [
    '.components-overview-card ul',
    { display: 'grid', gap: '6px', margin: '0', paddingLeft: '18px' }
  ],
  ['.components-overview-card li', { color: 'var(--yoya-color-text-muted, #5a6575)' }],
  [
    '.components-overview-card:hover',
    {
      borderColor: 'var(--yoya-color-primary-border, #bfdbfe)',
      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.08)'
    }
  ],
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
      background: 'var(--yoya-color-surface-muted, #fbfcfe)',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      display: 'grid',
      gap: '6px',
      minWidth: '0',
      padding: '14px 16px'
    }
  ],
  [
    '.components-route-meta h3',
    { color: 'var(--yoya-color-text-muted, #5a6575)', fontSize: '0.88rem' }
  ],
  [
    '.components-route-meta strong',
    { color: 'var(--yoya-color-text, #172033)', fontSize: '1.35rem' }
  ],
  [
    '.components-route-header',
    {
      borderLeft: '4px solid #2563eb',
      display: 'grid',
      gap: '6px',
      padding: '4px 0 4px 12px'
    }
  ],
  ['.components-route-header h2', { color: 'var(--yoya-color-text, #172033)', fontSize: '1.1rem' }],
  [
    '.components-route-header p, .components-route-page p',
    { color: 'var(--yoya-color-text-muted, #5a6575)' }
  ],
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
    { color: 'var(--yoya-color-text, #172033)', fontSize: '0.98rem' }
  ],
  [
    '.components-route-behavior, .components-route-notes, .components-route-placeholder',
    {
      background: 'var(--yoya-color-surface-muted, #fbfcfe)',
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
      background: 'var(--yoya-color-surface-hover, #f8fafc)',
      border: '1px solid #d7dee8',
      borderRadius: '999px',
      color: 'var(--yoya-color-text-secondary, #445065)',
      display: 'inline-flex',
      fontSize: '0.78rem',
      padding: '3px 10px'
    }
  ],
  [
    '.detail-grid-cell',
    {
      background: 'var(--yoya-color-surface-muted, #fbfcfe)',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      display: 'grid',
      gap: '6px',
      minWidth: '0',
      padding: '12px 14px'
    }
  ],
  ['.detail-grid-cell strong', { color: 'var(--yoya-color-text, #172033)' }],
  ['.components-route-placeholder p', { color: 'var(--yoya-color-text-muted, #5a6575)' }],
  [
    '.source-panel',
    {
      background: 'var(--yoya-color-surface, #ffffff)',
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
      background: 'var(--yoya-color-surface-muted, #fbfcfe)',
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
      color: 'var(--yoya-color-text, #172033)',
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
  [
    '.components-route-detail h3',
    { color: 'var(--yoya-color-text-muted, #5a6575)', fontSize: '0.88rem' }
  ],
  [
    '.components-route-detail code',
    {
      color: 'var(--yoya-color-text, #172033)',
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
  ['.components-layout-demo-live', { minWidth: '0', width: '100%' }],
  ['.components-layout-demo-frame', { display: 'block', height: '540px', width: '100%' }],
  [
    '.components-layout-demo-phone',
    {
      background: 'var(--yoya-color-surface-hover, #f8fafc)',
      border: '8px solid #111827',
      borderRadius: '34px',
      boxShadow: '0 20px 48px rgba(15, 23, 42, 0.24), 0 4px 14px rgba(15, 23, 42, 0.12)',
      boxSizing: 'border-box',
      display: 'block',
      height: '640px',
      margin: '0 auto',
      maxWidth: 'min(100%, 360px)',
      overflow: 'hidden',
      width: '360px'
    }
  ],
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
  ['.components-layout-template-frame', { minWidth: '0' }],
  [
    '.components-layout-template-frame .yoya-vheader',
    {
      background: 'var(--yoya-color-surface-hover, #f8fafc)',
      borderBottom: '1px solid var(--yoya-color-border-faint, #e2e8f0)'
    }
  ],
  [
    '.components-layout-template-frame .yoya-vaside',
    {
      background: 'var(--yoya-color-surface-muted, #fbfcfe)',
      borderRight: '1px solid var(--yoya-color-border-faint, #e2e8f0)'
    }
  ],
  [
    '.components-layout-template-frame .yoya-vmain',
    {
      background: 'var(--yoya-color-surface, #fff)',
      padding: '14px'
    }
  ],
  ['.components-layout-template-aside', { padding: '12px' }],
  ['.components-layout-template-main', { padding: '14px' }],
  [
    '.components-mobile-shell-header',
    {
      background: 'var(--yoya-color-surface, #ffffff)',
      borderBottom: '1px solid var(--yoya-color-border-faint, #e2e8f0)',
      color: 'var(--yoya-color-text, #172033)'
    }
  ],
  [
    '.components-mobile-drawer',
    {
      background: 'var(--yoya-color-surface-muted, #fbfcfe)',
      borderRight: '1px solid var(--yoya-color-border-faint, #e2e8f0)',
      padding: '16px 12px'
    }
  ],
  ['.components-mobile-main', { background: '#f5f7fa', padding: '16px' }],
  [
    '.components-mobile-tabbar',
    {
      background: 'var(--yoya-color-surface, #ffffff)',
      borderTop: '1px solid var(--yoya-color-border-faint, #e2e8f0)',
      color: '#475569'
    }
  ],
  [
    '.components-mobile-tab',
    {
      flex: '1 1 0',
      fontSize: '13px',
      textAlign: 'center'
    }
  ],
  ['.structure-region', { boxSizing: 'border-box', minWidth: '0' }],
  [
    '.structure-header, .structure-footer',
    { background: 'var(--yoya-color-surface-hover, #f8fafc)', color: '#475569' }
  ],
  ['.structure-header', { borderBottom: '1px solid var(--yoya-color-border-faint, #e2e8f0)' }],
  ['.structure-footer', { borderTop: '1px solid #e2e8f0' }],
  [
    '.structure-aside',
    {
      background: 'var(--yoya-color-surface-muted, #fbfcfe)',
      borderRight: '1px solid var(--yoya-color-border-faint, #e2e8f0)',
      padding: '12px'
    }
  ],
  ['.structure-main', { background: 'var(--yoya-color-surface, #ffffff)', padding: '14px' }],
  [
    '.structure-label',
    {
      background: 'var(--yoya-color-surface, #ffffff)',
      border: '1px solid #e2e8f0',
      borderRadius: '6px',
      color: '#475569',
      display: 'block',
      padding: '8px 10px'
    }
  ],
  [
    '.structure-placeholder',
    {
      background: 'var(--yoya-color-surface-muted, #fbfcfe)',
      border: '1px dashed #cbd5e1',
      borderRadius: '8px',
      display: 'grid',
      minHeight: '120px',
      padding: '16px',
      placeItems: 'center'
    }
  ]
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

const navigationExtraRules = [
  [
    '.components-navigation-demo-frame',
    {
      border: '0',
      borderRadius: '8px',
      display: 'block',
      height: '540px',
      width: '100%'
    }
  ]
];

const iconExtraRules = [
  ['.components-icons-page', { display: 'grid', gap: '20px' }],
  ['.components-icons-page h1', { color: 'var(--yoya-color-text, #172033)', fontSize: '1.45rem' }],
  ['.components-icons-page h2', { color: 'var(--yoya-color-text, #172033)', fontSize: '1.05rem' }],
  ['.components-icons-page > p', { color: 'var(--yoya-color-text-muted, #5a6575)', margin: '0' }],
  ['.components-icons-page .yoya-vcode-block', { minWidth: '0', width: '100%' }],
  [
    '.components-icons-grid',
    {
      display: 'grid',
      gap: '8px',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      minWidth: '0',
      width: '100%'
    }
  ],
  [
    '.components-icon-cell',
    {
      alignContent: 'stretch',
      alignItems: 'stretch',
      aspectRatio: '1 / 1',
      background: 'var(--yoya-color-surface, #ffffff)',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      display: 'grid',
      gap: '6px',
      gridTemplateRows: 'minmax(0, 1fr) auto auto',
      justifyItems: 'stretch',
      minHeight: '0',
      minWidth: '0',
      padding: '14px 12px 30px',
      position: 'relative'
    }
  ],
  [
    '.components-icon-symbol',
    {
      alignItems: 'center',
      display: 'flex',
      justifyContent: 'center',
      minHeight: '0'
    }
  ],
  ['.components-icon-cell svg', { color: '#475569', height: '40px', width: '40px' }],
  [
    '.components-icon-cell strong',
    { color: 'var(--yoya-color-text, #172033)', fontSize: '0.82rem' }
  ],
  [
    '.components-icon-description',
    { color: 'var(--yoya-color-text-muted, #5a6575)', fontSize: '0.74rem' }
  ],
  [
    '.components-icon-source-trigger',
    {
      alignItems: 'center',
      background: 'var(--yoya-color-surface-muted, #fbfcfe)',
      border: '1px solid #e2e8f0',
      borderRadius: '6px',
      color: 'var(--yoya-color-text-muted, #5a6575)',
      cursor: 'pointer',
      display: 'inline-flex',
      height: '20px',
      justifyContent: 'center',
      padding: '3px',
      position: 'absolute',
      right: '8px',
      bottom: '8px',
      width: '20px'
    }
  ],
  [
    '.components-icon-source-trigger svg',
    {
      height: '10px',
      width: '10px'
    }
  ],
  [
    '.components-icons-source-section, .components-icons-api',
    {
      background: 'var(--yoya-color-surface, #ffffff)',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      display: 'grid',
      gap: '10px',
      minWidth: '0',
      padding: '16px'
    }
  ],
  [
    '.components-icons-source-section h2, .components-icons-api h2',
    { color: 'var(--yoya-color-text, #172033)', fontSize: '1.05rem', margin: '0' }
  ],
  [
    '.components-icons-source-section > p, .components-icons-api > p',
    { color: 'var(--yoya-color-text-muted, #5a6575)', margin: '0' }
  ],
  ['.components-icons-source-section .yoya-vcode-block', { minWidth: '0', width: '100%' }],
  [
    '.components-icons-api table',
    {
      borderCollapse: 'collapse',
      tableLayout: 'fixed',
      width: '100%'
    }
  ],
  [
    '.components-icons-api th, .components-icons-api td',
    {
      borderTop: '1px solid #e2e8f0',
      padding: '9px 12px',
      textAlign: 'left',
      verticalAlign: 'top'
    }
  ],
  [
    '.components-icons-api th',
    {
      background: 'var(--yoya-color-surface-hover, #f8fafc)',
      color: 'var(--yoya-color-text-secondary, #344054)',
      fontSize: '0.82rem'
    }
  ],
  [
    '.components-icons-api td',
    { color: 'var(--yoya-color-text-muted, #5a6575)', fontSize: '0.86rem' }
  ],
  [
    '.components-icons-api td code',
    {
      color: 'var(--yoya-color-text, #172033)',
      fontFamily: "'Cascadia Code', 'Fira Code', ui-monospace, Consolas, monospace",
      fontSize: '0.8rem'
    }
  ],
  [
    '.components-icons-api ul',
    { color: 'var(--yoya-color-text-muted, #5a6575)', margin: '0', paddingLeft: '18px' }
  ],
  [
    '.components-icons-page .yoya-vdialog',
    {
      maxWidth: 'min(92vw, 920px)',
      width: '100%'
    }
  ],
  [
    '.components-icon-source-dialog-header',
    {
      alignItems: 'center',
      background: 'var(--yoya-color-surface-hover, #f8fafc)',
      borderBottom: '1px solid var(--yoya-color-border-faint, #e2e8f0)',
      display: 'flex',
      gap: '10px',
      padding: '10px 12px'
    }
  ],
  [
    '.components-icon-source-dialog-title',
    {
      alignItems: 'center',
      display: 'flex',
      gap: '8px',
      minWidth: '0'
    }
  ],
  [
    '.components-icon-source-dialog-title strong',
    { color: 'var(--yoya-color-text, #172033)', fontSize: '0.9rem' }
  ],
  [
    '.components-icon-source-dialog-title span',
    {
      background: 'var(--yoya-color-primary-subtle, #e8f0fe)',
      borderRadius: '999px',
      color: 'var(--yoya-color-text-active, #1d4ed8)',
      fontSize: '0.75rem',
      overflow: 'hidden',
      padding: '3px 8px',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  ],
  [
    '.components-icon-source-dialog .yoya-vcard',
    { border: '0', borderRadius: '8px', boxShadow: 'none', margin: '0' }
  ],
  ['.components-icon-source-dialog .yoya-vcard-header', { padding: '10px 12px' }],
  ['.components-icon-source-dialog .yoya-vcard-body', { padding: '0' }],
  [
    '.components-icon-source-dialog-code',
    {
      background: '#1e1f22',
      margin: '0',
      maxHeight: '70vh',
      overflow: 'auto',
      padding: '14px'
    }
  ],
  [
    '.components-icon-source-dialog-code code',
    {
      color: '#dfe1e5',
      display: 'block',
      fontFamily: "'Cascadia Code', 'Fira Code', ui-monospace, Consolas, monospace",
      fontSize: '0.78rem',
      lineHeight: '1.5',
      minWidth: 'max-content',
      whiteSpace: 'pre'
    }
  ],
  [
    '.components-icon-copy',
    {
      alignItems: 'center',
      background: 'var(--yoya-color-surface, #ffffff)',
      border: '1px solid #e2e8f0',
      borderRadius: '6px',
      color: 'var(--yoya-color-text-muted, #5a6575)',
      cursor: 'pointer',
      display: 'inline-flex',
      height: '20px',
      justifyContent: 'center',
      padding: '3px',
      position: 'absolute',
      right: '8px',
      top: '8px',
      width: '20px'
    }
  ],
  [
    '.components-icon-copy svg',
    {
      height: '10px',
      width: '10px'
    }
  ],
  [
    '.components-icon-cell span',
    {
      color: 'var(--yoya-color-text-muted, #5a6575)',
      fontSize: '0.78rem',
      maxWidth: '100%',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  ]
];

const svgExtraRules = [
  ['.components-svg-page', { display: 'grid', gap: '20px' }],
  ['.components-svg-page h1', { color: 'var(--yoya-color-text, #172033)', fontSize: '1.45rem' }],
  ['.components-svg-page > p', { color: 'var(--yoya-color-text-muted, #5a6575)', margin: '0' }],
  [
    '.components-svg-demo',
    {
      background: 'var(--yoya-color-surface, #ffffff)',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      display: 'grid',
      gap: '10px',
      minWidth: '0',
      padding: '16px'
    }
  ],
  [
    '.components-svg-demo h2',
    { color: 'var(--yoya-color-text, #172033)', fontSize: '1.05rem', margin: '0' }
  ],
  ['.components-svg-demo > p', { color: 'var(--yoya-color-text-muted, #5a6575)', margin: '0' }],
  [
    '.components-svg-demo-live .yoya-vcard',
    {
      maxWidth: '640px',
      width: '100%'
    }
  ],
  [
    '.components-svg-demo-live .yoya-vcard-footer',
    {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px'
    }
  ],
  ['.components-svg-tips', { display: 'grid', gap: '8px' }],
  [
    '.components-svg-tips h2',
    { color: 'var(--yoya-color-text, #172033)', fontSize: '1.05rem', margin: '0' }
  ],
  [
    '.components-svg-tips ul',
    {
      color: 'var(--yoya-color-text-muted, #5a6575)',
      margin: '0',
      paddingLeft: '20px'
    }
  ],
  ['.components-svg-tips li', { lineHeight: '1.8' }]
];

const thirdPartyExtraRules = [
  ['.components-echarts-page', { display: 'grid', gap: '20px' }],
  [
    '.components-echarts-page h1',
    { color: 'var(--yoya-color-text, #172033)', fontSize: '1.45rem' }
  ],
  ['.components-echarts-page > p', { color: 'var(--yoya-color-text-muted, #5a6575)', margin: '0' }],
  [
    '.components-echarts-grid',
    {
      display: 'grid',
      gap: '16px',
      gridTemplateColumns: 'minmax(0, 1fr)',
      minWidth: '0',
      width: '100%'
    }
  ],
  [
    '.components-echarts-demo',
    {
      borderTop: '1px solid #e2e8f0',
      display: 'grid',
      gap: '12px',
      minWidth: '0',
      padding: '20px 0 0'
    }
  ],
  [
    '.components-echarts-demo h3',
    { color: 'var(--yoya-color-text, #172033)', fontSize: '1rem', margin: '0' }
  ],
  [
    '.components-echarts-demo-live',
    {
      background: 'var(--yoya-color-surface, #ffffff)',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      minWidth: '0',
      padding: '16px'
    }
  ],
  ['.components-echarts-demo .yoya-vcard', { margin: '0' }],
  ['.components-echarts-demo .yoya-vechart', { minWidth: '0', width: '100%' }]
];

const definitionExtraRules = [
  ['.components-definition-page', { display: 'grid', gap: '20px' }],
  [
    '.components-definition-page h1',
    { color: 'var(--yoya-color-text, #172033)', fontSize: '1.45rem' }
  ],
  [
    '.components-definition-page > p',
    { color: 'var(--yoya-color-text-muted, #5a6575)', margin: '0' }
  ],
  [
    '.components-definition-demo',
    {
      borderTop: '1px solid #e2e8f0',
      display: 'grid',
      gap: '12px',
      minWidth: '0',
      padding: '20px 0 0'
    }
  ],
  [
    '.components-definition-demo h3',
    { color: 'var(--yoya-color-text, #172033)', fontSize: '1rem', margin: '0' }
  ],
  [
    '.components-definition-demo-live',
    {
      background: 'var(--yoya-color-surface, #ffffff)',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      minWidth: '0',
      padding: '16px'
    }
  ],
  ['.components-definition-demo .yoya-vcard', { margin: '0' }],
  ['.components-definition-demo .yoya-vcard-body', { width: '100%' }],
  [
    '.html-native-demo',
    {
      background: 'var(--yoya-color-surface, #ffffff)',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      display: 'grid',
      gap: '10px',
      padding: '16px'
    }
  ],
  ['.html-native-demo h3, .html-native-demo p', { margin: '0' }],
  [
    '.html-native-box',
    {
      alignItems: 'center',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px'
    }
  ],
  [
    '.html-native-box input',
    {
      border: '1px solid #cbd5e1',
      borderRadius: '6px',
      boxSizing: 'border-box',
      font: 'inherit',
      minHeight: '34px',
      padding: '0 10px',
      width: '180px'
    }
  ],
  [
    '.html-native-button',
    {
      background: '#2563eb',
      border: '0',
      borderRadius: '6px',
      color: '#ffffff',
      cursor: 'pointer',
      font: 'inherit',
      minHeight: '34px',
      padding: '0 14px'
    }
  ],
  [
    '.wizard-child-panel',
    {
      background: 'var(--yoya-color-surface-muted, #fbfcfe)',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      display: 'grid',
      gap: '10px',
      padding: '14px'
    }
  ],
  ['.wizard-child-panel strong, .wizard-child-panel p', { margin: '0' }],
  ['.wizard-child-panel p', { color: 'var(--yoya-color-text-muted, #5a6575)' }]
];

const i18nExtraRules = [
  [
    '.components-i18n-demo-live .yoya-vcard',
    {
      maxWidth: '640px',
      width: '100%'
    }
  ],
  [
    '.components-i18n-demo-live .yoya-vcard-footer',
    {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px'
    }
  ]
];

const stateExtraRules = [
  [
    '.components-state-demo-live .yoya-vcard',
    {
      maxWidth: '640px',
      width: '100%'
    }
  ],
  [
    '.components-state-demo-live .yoya-vcard-footer',
    {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px'
    }
  ],
  [
    '.components-state-demo-live .yoya-vcard-body output',
    {
      color: 'var(--yoya-color-text, #172033)',
      fontWeight: '600'
    }
  ]
];

const demoRules = [
  ...baseRules,
  ...documentationThemes.flatMap(({ accent, prefix }) => documentationRules(prefix, accent)),
  ...layoutExtraRules,
  ...buttonExtraRules,
  ...dataDisplayExtraRules,
  ...feedbackExtraRules,
  ...navigationExtraRules,
  ...iconExtraRules,
  ...svgExtraRules,
  ...thirdPartyExtraRules,
  ...definitionExtraRules,
  ...i18nExtraRules,
  ...stateExtraRules,
  ...genericRules
];

const managedStyleElements = new Set();
const managedStyleProperties = new WeakMap();

function resetManagedStyles(rootElement) {
  managedStyleElements.forEach((element) => {
    if (!element.isConnected) {
      managedStyleElements.delete(element);
      return;
    }

    if (rootElement !== element && !rootElement.contains?.(element)) {
      return;
    }

    const properties = managedStyleProperties.get(element);
    if (properties) {
      properties.forEach((name) => {
        element.style[name] = '';
      });
    }
    managedStyleElements.delete(element);
  });
}

function applySelector(element, selector, styles) {
  const applyTo = (match) => {
    Object.assign(match.style, styles);
    if (!managedStyleProperties.has(match)) {
      managedStyleProperties.set(match, new Set());
    }

    const properties = managedStyleProperties.get(match);
    Object.keys(styles).forEach((name) => properties.add(name));
    managedStyleElements.add(match);
  };

  if (element.matches?.(selector)) {
    applyTo(element);
  }

  element.querySelectorAll(selector).forEach(applyTo);
}

function applyRules(element, rules) {
  rules.forEach(([selector, styles]) => applySelector(element, selector, styles));
}

function applyGlobalStyles() {
  const documentElement = document.documentElement;
  if (documentElement) {
    documentElement.style.minHeight = '100%';
  }

  const body = document.body;
  if (body) {
    body.style.background = 'var(--yoya-color-bg, #f6f7f9)';
    body.style.color = 'var(--yoya-color-text, #172033)';
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

  applySelector(element, '.components-demo-shell', {
    gridTemplateRows: 'none',
    height: 'auto',
    minHeight: '100vh',
    overflow: 'visible',
    padding: '0',
    width: '100%'
  });
  applySelector(element, '.components-workspace', { height: 'auto', overflow: 'visible' });
  applySelector(element, '.components-menu, .components-router-panel', {
    height: 'auto',
    minHeight: '0'
  });
  applySelector(element, '.components-menu', {
    borderBottom: '1px solid var(--yoya-color-border-faint, #e2e8f0)',
    borderRight: '0',
    borderRadius: '0px',
    maxHeight: '360px'
  });
  applySelector(element, '.components-demo-shell > .yoya-vnavbar .yoya-vnavbar-menu-slot', {
    overflowX: 'auto'
  });
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
  resetManagedStyles(element);
  applySelector(element, 'a', { color: 'inherit', textDecoration: 'none' });
  applyRules(element, demoRules);
  applySelector(element, '*', { boxSizing: 'border-box' });
  bindLinkFocus(element);
  applyResponsiveStyles(element);

  return root;
}
