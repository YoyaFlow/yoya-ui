import { isPlainObject } from '../../protocol/values.js';

/** A2UI 的样式键 → yoya 主题 token（`--yoya-*`）；认不出的键留在 `meta.a2uiStyles`。 */
const STYLE_TOKENS = {
  backgroundColor: 'color-bg',
  borderColor: 'color-border',
  errorColor: 'color-danger',
  fontFamily: 'font-family',
  primaryColor: 'color-primary',
  textColor: 'color-text'
};

export function a2uiTheme(styles) {
  const source = isPlainObject(styles) ? styles : {};
  const tokens = {};
  const extra = {};

  Object.entries(source).forEach(([key, value]) => {
    const token = STYLE_TOKENS[key];

    if (token && typeof value === 'string') {
      tokens[token] = value;
      return;
    }

    extra[key] = value;
  });

  const theme = { tokens };

  if (source.mode === 'light' || source.mode === 'dark') {
    theme.mode = source.mode;
  }

  return { extra, theme };
}
