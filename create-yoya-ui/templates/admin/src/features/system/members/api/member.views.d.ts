/** 领域结果结构类型声明（对应 member.views.js）。 */
export class ListItem {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  constructor(init: { id: number; name: string; email: string; role: string; status: string });
}

export class Detail {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  remark: string;
  constructor(init: {
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
    remark?: string;
  });
}

declare const Members: {
  ListItem: typeof ListItem;
  Detail: typeof Detail;
};

export default Members;
