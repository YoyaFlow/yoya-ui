export function defineCategory(config) {
  return Object.freeze({
    boundary: freezeBoundary(config.boundary),
    components: config.components ?? [],
    demos: config.demos ?? [],
    description: config.description ?? '',
    id: config.id,
    sourceDir: config.sourceDir ?? '',
    title: config.title
  });
}

export function defineComponent(config) {
  return Object.freeze({
    api: config.api ?? [],
    behavior: config.behavior ?? [],
    boundaries: freezeBoundary(config.boundaries),
    categoryId: config.categoryId,
    categoryTitle: config.categoryTitle ?? '',
    component: config.component,
    componentLabel: config.componentLabel ?? config.title,
    description: config.description ?? config.summary ?? '',
    demoTitle: config.demoTitle ?? config.title,
    focus: config.focus ?? config.componentLabel ?? config.title,
    id: config.id,
    imports: config.imports ?? [],
    keywords: config.keywords ?? [],
    related: config.related ?? [],
    routePath: config.routePath ?? '',
    sourceFile: config.sourceFile ?? '',
    sourceTitle: config.sourceTitle ?? config.title,
    status: config.status ?? 'stable',
    summary: config.summary ?? config.description ?? '',
    title: config.title
  });
}

export function defineDemo(config) {
  return defineComponent(config);
}

export function freezeBoundary(boundary = {}) {
  return Object.freeze({
    doesNotOwn: Object.freeze([...(boundary.doesNotOwn ?? [])]),
    owns: Object.freeze([...(boundary.owns ?? [])]),
    related: Object.freeze([...(boundary.related ?? [])])
  });
}

export function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-') || 'item';
}

export function includesQuery(source, query) {
  const text = normalizeText(source);
  const term = normalizeText(query);
  return term ? text.includes(term) : true;
}

export function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim();
}
