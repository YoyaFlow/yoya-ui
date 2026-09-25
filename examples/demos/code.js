import { vCode } from '@yoyaflow/yoya-ui';

export function CodeExample1() {
  return vCode({
    content: 'SELECT id, name FROM services WHERE status = "ready";',
    language: 'sql'
  });
}
