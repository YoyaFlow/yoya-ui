// 原始传输层：fetch 实现。更换 ajax / 请求库只改这里。
export async function fetchSubmit(req) {
  const query = new URLSearchParams(req.params() ?? {}).toString();
  const url = query ? `${req.address()}?${query}` : req.address();
  const headers = { 'Content-Type': 'application/json', ...(req.headers() ?? {}) };
  const body = req.body();

  const response = await fetch(url, {
    method: req.method(),
    headers,
    credentials: req.cookies() ? 'include' : 'same-origin',
    body: body === null || body === undefined ? undefined : JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`请求失败：HTTP ${response.status}`);
  }

  return response.json();
}
