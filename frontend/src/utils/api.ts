/**
 * Mock API utility for service layer
 */
export const api = {
  get: async (url: string, config?: any) => {
    console.log(`[API Mock] GET ${url}`, config);
    return { data: [] };
  },
  post: async (url: string, data?: any) => {
    console.log(`[API Mock] POST ${url}`, data);
    return { data: { success: true, id: Math.random().toString(36).substr(2, 9), ...data } };
  },
  patch: async (url: string, data?: any) => {
    console.log(`[API Mock] PATCH ${url}`, data);
    return { data: { success: true, ...data } };
  },
  delete: async (url: string) => {
    console.log(`[API Mock] DELETE ${url}`);
    return { data: { success: true } };
  }
};
