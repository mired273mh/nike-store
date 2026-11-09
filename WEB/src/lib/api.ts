let csrfToken: string | null = null;
let sessionRequest: Promise<void> | null = null;

async function ensureSession() {
  if (csrfToken) return;
  if (!sessionRequest)
    sessionRequest = fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Không thể kết nối máy chủ.');
        const data = await response.json();
        csrfToken = data.csrfToken;
      })
      .finally(() => {
        sessionRequest = null;
      });
  await sessionRequest;
}
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD'].includes(method)) await ensureSession();
  const headers = new Headers(init.headers);
  if (csrfToken && !['GET', 'HEAD'].includes(method)) headers.set('X-CSRF-Token', csrfToken);
  const response = await fetch(input, {
    ...init,
    headers,
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const rotated = response.headers.get('X-CSRF-Token');
  if (rotated) csrfToken = rotated;
  if (input === '/api/auth/logout' && response.ok) csrfToken = null;
  return response;
}
export async function apiJson<T>(input: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(input, init);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Không thể hoàn thành yêu cầu.');
  return data as T;
}
export function jsonBody(method: string, data: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
}
