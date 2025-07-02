/**
 * Tiny wrapper em volta do fetch para:
 *  - Grudar URL base do backend
 *  - Inserir JWT no header Authorization
 *  - Fazer tratamento simples de erros
 *
 * Use assim:
 *   const data = await apiRequest('/api/projects');
 */

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, '') ||
  'https://videomaker-portfolio-backend.onrender.com';

const ACCESS_TOKEN_KEY = 'authToken';

type FetchOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
};

/** Retorna corpo JSON (já convertido) ou `undefined` para respostas 204/304. */
export async function apiRequest<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);

  const response = await fetch(
    // Garante que endpoint comece com /
    `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`,
    {
      credentials: 'include',
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    }
  );

  // 204 No-Content ou 304 Not-Modified → não há corpo a consumir
  const hasBody = response.status !== 204 && response.status !== 304;
  const data: any = hasBody ? await response.json().catch(() => ({})) : {};

  if (!response.ok) {
    // Se for 401, limpa token para forçar novo login
    if (response.status === 401) localStorage.removeItem(ACCESS_TOKEN_KEY);
    const message = data?.message || response.statusText;
    throw new Error(message);
  }

  return data as T;
}