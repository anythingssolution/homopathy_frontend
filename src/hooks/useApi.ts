import { useAuth } from '../context/AuthContext';

interface FetchOptions extends RequestInit {
  body?: any;
}

export const useApi = () => {
  const { token, logout } = useAuth();

  const apiFetch = async (endpoint: string, options: FetchOptions = {}) => {
    const headers = new Headers(options.headers || {});
    
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    if (options.body && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
      options.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        // Session expired or invalid token
        await logout();
        window.location.href = '/booking';
        return null;
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API Fetch Error:', error);
      throw error;
    }
  };

  return apiFetch;
};
