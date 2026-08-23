import { createComponentsDemoApp } from './docs/demo-app.js';

export { componentDemoCategories, componentDemoRegistry, filterComponentEntries, findComponentEntry } from './docs/demo-registry.js';
export { createComponentsDemoApp } from './docs/demo-app.js';

export function renderComponentsExample(target = '#app') {
  return createComponentsDemoApp({ target });
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  renderComponentsExample('#app');
}
