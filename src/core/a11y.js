import { bindDocumentEvent } from './document-events.js';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

const LIVE_REGION_MARKER = 'data-yoya-live';

/** Returns focusable descendants in DOM (tab) order, excluding disabled ones. */
export function getFocusableElements(root) {
  if (!root || typeof root.querySelectorAll !== 'function') {
    return [];
  }
  return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (el) => el.getAttribute && el.getAttribute('tabindex') !== '-1'
  );
}

/**
 * Generic focus trap: keeps Tab/Shift+Tab cycling inside `root`, fires
 * onEscape on Escape, and restores the previously focused element on destroy().
 * SSR-safe (no-ops when document is unavailable).
 */
export function createFocusTrap(root, options = {}) {
  const { onEscape = null, restoreFocus = true } = options;

  if (typeof document === 'undefined' || !root) {
    return { activate() {}, destroy() {} };
  }

  let active = false;
  let previous = null;
  let removeKeydown = null;

  const handleKeydown = (event) => {
    if (!active) {
      return;
    }
    if (event.key === 'Escape') {
      if (onEscape) {
        onEscape(event);
      }
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }

    const focusables = getFocusableElements(root);
    if (focusables.length === 0) {
      event.preventDefault();
      return;
    }

    const current = document.activeElement;
    const index = focusables.indexOf(current);
    let nextIndex;
    if (event.shiftKey) {
      nextIndex = index <= 0 ? focusables.length - 1 : index - 1;
    } else if (index === -1 || index === focusables.length - 1) {
      nextIndex = 0;
    } else {
      nextIndex = index + 1;
    }

    event.preventDefault();
    focusables[nextIndex].focus();
  };

  const activate = () => {
    if (active) {
      return;
    }
    active = true;
    previous = document.activeElement;
    removeKeydown = bindDocumentEvent('keydown', handleKeydown);
    const first = getFocusableElements(root)[0];
    if (first) {
      first.focus();
    }
  };

  const destroy = () => {
    if (!active) {
      return;
    }
    active = false;
    if (removeKeydown) {
      removeKeydown();
      removeKeydown = null;
    }
    if (
      restoreFocus &&
      previous &&
      typeof previous.isConnected === 'boolean' &&
      previous.isConnected &&
      typeof previous.focus === 'function'
    ) {
      previous.focus();
    }
  };

  return { activate, destroy };
}

/**
 * Announce a message to screen readers through a dedicated aria-live region.
 * Reuses one region per dedupe key; SSR-safe.
 */
export function announce(message, options = {}) {
  if (typeof document === 'undefined') {
    return null;
  }
  const { politeness = 'polite', dedupeKey = 'yoya-announce' } = options;
  let region = document.querySelector(`[${LIVE_REGION_MARKER}="${dedupeKey}"]`);
  if (!region) {
    region = document.createElement('div');
    region.setAttribute(LIVE_REGION_MARKER, dedupeKey);
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.className = 'yoya-a11y-live';
    region.style.cssText =
      'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);' +
      'white-space:nowrap;border:0;padding:0;margin:-1px;';
    document.body.appendChild(region);
  }
  region.textContent = '';
  queueMicrotask(() => {
    region.textContent = String(message);
  });
  return region;
}

/**
 * Generic index-based keyboard movement (arrows/Home/End) with wrapping, so
 * menus/tables/trees/tabs can share one navigation rule.
 */
export function moveByKey({ key, items, currentIndex = -1, shiftKey = false }) {
  const count = items?.length || 0;
  if (count === 0) {
    return -1;
  }
  const last = count - 1;
  const at = currentIndex >= 0 && currentIndex < count ? currentIndex : -1;

  if (key === 'Home') {
    return 0;
  }
  if (key === 'End') {
    return last;
  }
  if (key === 'ArrowDown') {
    return shiftKey ? -1 : at === last ? 0 : at + 1;
  }
  if (key === 'ArrowUp') {
    return shiftKey ? last : at <= 0 ? last : at - 1;
  }
  return at;
}
