import { QueryClient } from '@tanstack/react-query';

/**
 * Instância única do TanStack Query usada na aplicação.
 *
 * App.tsx faz:  import { queryClient } from './lib/queryClient'
 * Por isso ela precisa estar exportada aqui com **esse** nome.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min
      retry: 1,
    },
  },
});

/* ---------------------------------------------------------- */
/* Wrapper para chamadas ao backend                           */
/* ---------------------------------------------------------- */

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, '') ||
  'https://videomaker-portfolio-backend.onrender.com';

const ACCESS_TOKEN_KEY = 'authToken';

type FetchOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
};

export async function apiRequest<T = any>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);

  const resp = await fetch(
    `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`,
    {
      credentials: 'include',
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    },
  );

  const hasBody = resp.status !== 204 && resp.status !== 304;
  const data = hasBody ? await resp.json().catch(() => ({})) : {};

  if (!resp.ok) {
    if (resp.status === 401) localStorage.removeItem(ACCESS_TOKEN_KEY);
    throw new Error(data?.message || resp.statusText);
  }

  return data as T;
}