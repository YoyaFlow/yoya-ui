-- 订单列表（按关键词 / 状态筛选，带分页）
-- 逻辑名：orders_page —— 页面里写 @actions:/orders_page，地址由环境提供
select id, customer, amount, status, owner, createdAt
from orders
where ($keyword is null or $keyword = '' or id like '%' || $keyword || '%')
  and ($status  is null or $status  = '' or status = $status)
order by id
limit $pageSize offset ($page - 1) * $pageSize
