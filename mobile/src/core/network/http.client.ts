import axios from 'axios';
import { API_BASE_URL } from '../config/api.config';
import { TokenStore } from '../storage/secure-store';

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request: attach access token ──────────────────────────────────────────────
http.interceptors.request.use(async (config) => {
  const token = await TokenStore.getAccessToken();
  // If this request is to auth endpoints or public uploads, allow without token
  const url = (config.url || '').toString();
  const isAuthRoute = url.startsWith('/auth') || url.includes('/auth/');
  const isUploadsRoute = url.startsWith('/uploads') || url.includes('/uploads');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (!isAuthRoute && !isUploadsRoute) {
    // No token available for a protected route — short-circuit to avoid 401 requests
    const e: any = new Error('No access token available');
    e.code = 'NO_ACCESS_TOKEN';
    throw e;
  }

  if (config.data instanceof FormData) {
    if (config.headers) {
      if (typeof config.headers.delete === 'function') {
        config.headers.delete('Content-Type');
        config.headers.delete('content-type');
      } else {
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
      }
    }
  }
  return config;
});

// ── Queue and Refreshing state for token serialization ──────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: any) => void }> = [];
let onUnauthorizedCallback: (() => void) | null = null;

export const setOnUnauthorized = (cb: (() => void) | null) => {
  onUnauthorizedCallback = cb;
};

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ── Response: handle 401 → refresh token ─────────────────────────────────────
http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return http(original);
          })
          .catch((err) => Promise.reject(err));
      }

      original._retry = true;
      isRefreshing = true;

      return new Promise((resolve, reject) => {
        TokenStore.getRefreshToken()
          .then(async (refreshToken) => {
            if (!refreshToken) {
              try {
                await TokenStore.clearTokens();
              } catch (e) {
                console.warn('Failed to clear tokens:', e);
              } finally {
                if (onUnauthorizedCallback) {
                  onUnauthorizedCallback();
                }
                reject(new Error('No refresh token'));
              }
              return;
            }

            try {
              const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
              const accessToken = data.data.accessToken;
              const newRefreshToken = data.data.refreshToken;

              await TokenStore.setTokens(accessToken, newRefreshToken);

              http.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
              original.headers.Authorization = `Bearer ${accessToken}`;

              processQueue(null, accessToken);
              resolve(http(original));
            } catch (err) {
              processQueue(err, null);
              try {
                await TokenStore.clearTokens();
              } catch (e) {
                console.warn('Failed to clear tokens during refresh failure:', e);
              } finally {
                if (onUnauthorizedCallback) {
                  onUnauthorizedCallback();
                }
                reject(err);
              }
            }
          })
          .catch((err) => {
            reject(err);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    return Promise.reject(error);
  },
);

export default http;
