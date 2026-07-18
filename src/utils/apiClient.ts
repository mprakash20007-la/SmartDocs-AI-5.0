export class APIError extends Error {
  public status: number;
  public data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'APIError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}, retries = 1): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : endpoint;
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }
  
  if (options.body instanceof FormData) {
    if (config.headers) {
       delete (config.headers as Record<string, string>)['Content-Type'];
    }
  }

  try {
    const response = await fetch(url, config);
    
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    if (!response.ok) {
      throw new APIError(data?.error || data?.message || 'API request failed', response.status, data);
    }

    return data as T;
  } catch (error) {
    if (retries > 0 && !(error instanceof APIError)) {
      console.warn(`Retrying request to ${endpoint}...`);
      await new Promise(res => setTimeout(res, 1000));
      return request<T>(endpoint, options, retries - 1);
    }
    throw error;
  }
}

export const apiClient = {
  request,
  async get<T>(endpoint: string, options?: RequestInit) {
    return request<T>(endpoint, { ...options, method: 'GET' });
  },

  async post<T>(endpoint: string, body: any, options?: RequestInit) {
    return request<T>(endpoint, { ...options, method: 'POST', body });
  },

  async put<T>(endpoint: string, body: any, options?: RequestInit) {
    return request<T>(endpoint, { ...options, method: 'PUT', body });
  },

  async delete<T>(endpoint: string, options?: RequestInit) {
    return request<T>(endpoint, { ...options, method: 'DELETE' });
  }
};
