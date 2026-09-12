import { vCode } from '../../index.js';

export function CodeExample1() {
  return {
    render() {
      return vCode({
        content: 'SELECT id, name FROM services WHERE status = "ready";',
        language: 'sql'
      });
    }
  };
}
