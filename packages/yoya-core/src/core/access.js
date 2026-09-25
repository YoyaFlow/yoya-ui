/**
 * Access control: read/write permission with a compact string spec.
 *
 * Components declare bare resource codes only, e.g. "system:member".
 * The level lives entirely in the user's granted set; on the component side
 * every declared resource is write-gated (disabled without write).
 *
 * Matching against the granted set held by createAccess():
 *   bare <code>   = read + write (full access, aligns with common RBAC)
 *   r.<code>      = read-only
 *   w.<code>      = read + write (explicit)
 *
 *   canRead(code)  = bare | r.<code> | w.<code>
 *   canWrite(code) = bare | w.<code>
 *
 * A super admin (roles including superAdmins) bypasses all checks. No declared
 * access on a node means "always allowed" (fail-open), so existing code is
 * unaffected until it opts in.
 */

let scopedAccess = null;
let installedAccess = null;

/**
 * Normalizes a permission spec into { code, level }.
 * Components pass bare codes to access(); the r./w. prefix is meaningful on
 * the user granted set and is parsed here only to extract the resource code.
 */
export function parseAccessSpec(spec) {
  if (!spec) {
    return null;
  }

  if (typeof spec === 'object' && spec.code) {
    return { code: spec.code, level: spec.level === 'write' ? 'write' : 'read' };
  }

  const value = String(spec).trim();
  if (!value) {
    return null;
  }

  if (value.startsWith('w.')) {
    return { code: value.slice(2), level: 'write' };
  }

  if (value.startsWith('r.')) {
    return { code: value.slice(2), level: 'read' };
  }

  return { code: value, level: 'write' };
}

/** Returns the resource code of a spec, without its read/write prefix. */
export function stripAccessCode(spec) {
  const parsed = parseAccessSpec(spec);
  return parsed ? parsed.code : String(spec ?? '');
}

/**
 * Creates a per-request access context. It is the single source of granted
 * permissions during a render; inject it with withAccess(access, build).
 */
export function createAccess({ permissions = [], roles = [], superAdmins = ['super_admin'] } = {}) {
  const state = {
    permissions: [...(permissions || [])],
    roles: [...(roles || [])],
    superAdmins: [...(superAdmins || [])]
  };
  const granted = new Set(state.permissions);
  const listeners = new Set();

  const isSuper = () => state.superAdmins.some((role) => state.roles.includes(role));

  function canLevel(bare, level) {
    if (isSuper()) {
      return true;
    }

    if (level === 'write') {
      return granted.has(`w.${bare}`) || granted.has(bare);
    }

    return granted.has(`r.${bare}`) || granted.has(`w.${bare}`) || granted.has(bare);
  }

  function canSpec(spec, level) {
    return canLevel(stripAccessCode(spec), level);
  }

  const access = {
    roles() {
      return state.roles.slice();
    },
    permissions() {
      return state.permissions.slice();
    },
    isSuper,
    has(spec) {
      const bare = stripAccessCode(spec);
      return isSuper() || granted.has(`r.${bare}`) || granted.has(`w.${bare}`) || granted.has(bare);
    },
    canRead(spec) {
      return canSpec(spec, 'read');
    },
    canWrite(spec) {
      return canSpec(spec, 'write');
    },
    setPermissions(next) {
      state.permissions = [...(next || [])];
      granted.clear();
      (next || []).forEach((entry) => granted.add(entry));
      listeners.forEach((fn) => fn());
      return access;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };

  return access;
}

/**
 * Runs build() with the given access context active, then restores the outer
 * context. Mirrors withI18nStringShortcut for per-request SSR isolation.
 */
export function withAccess(access, build) {
  const previous = scopedAccess;
  scopedAccess = access || previous;
  try {
    return build();
  } finally {
    scopedAccess = previous;
  }
}

/** Installs a global access context (single-user SPA); passes it to SSR entries as options.access otherwise. */
export function installAccess(access) {
  installedAccess = access || null;
  return installedAccess;
}

/** Returns the scoped access context, falling back to the globally installed one. */
export function currentAccess() {
  return scopedAccess || installedAccess;
}
