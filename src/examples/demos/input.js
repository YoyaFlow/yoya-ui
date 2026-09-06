import { vInput } from '../../index.js';

export function InputExample1() {
  return {
    render() {
      return vInput({
        placeholder: '请输入服务名',
        value: 'yoya-ui'
      });
    }
  };
}
