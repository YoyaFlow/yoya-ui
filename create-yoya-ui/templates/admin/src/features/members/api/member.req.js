// 外部请求命令：其他模块调用本域能力的入口。
import { RequestBase } from '@yoyaflow/yoya-ui';
import Members from './member.views.js';

class QueryAvailable extends RequestBase {
  address() {
    return '/members/available';
  }

  toItem(row) {
    return new Members.ListItem(row);
  }
}

export default { QueryAvailable };
