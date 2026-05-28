import { useAuthStore } from '@/store/useAuthStore';

const BASE_URL = 'http://localhost:3456';

async function request(url: string, method: string, data?: any, config?: any) {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(config?.headers || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${url}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    ...config,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API error ${response.status}`);
  }

  const resData = await response.json();
  return { data: resData };
}

export const api = {
  get: (url: string, config?: any) => request(url, 'GET', undefined, config),
  post: (url: string, data?: any, config?: any) => request(url, 'POST', data, config),
  patch: (url: string, data?: any, config?: any) => request(url, 'PATCH', data, config),
  delete: (url: string, config?: any) => request(url, 'DELETE', undefined, config),
};
