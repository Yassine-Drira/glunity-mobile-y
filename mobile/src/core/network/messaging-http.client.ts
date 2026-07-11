/**
 * Axios client for the messaging microservice (port 5001).
 * Shares the same token-refresh interceptor logic as the main http client
 * so that expired tokens are automatically renewed without 401s.
 */
import axios from 'axios';
import { API_BASE_URL } from '../config/api.config';
import { TokenStore } from '../storage/secure-store';
import { resolveMessagingServiceUrl } from './messaging-service-url';

const MSG_SERVICE_URL = resolveMessagingServiceUrl(API_BASE_URL);

const messagingHttp = axios.create({
  baseURL: MSG_SERVICE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request: attach access token ──────────────────────────────────────────────
messagingHttp.interceptors.request.use(async (config) => {
  if (config.url && !config.url.startsWith('/api')) {
    config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`;
  }
  const token = await TokenStore.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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

// ── Queue and refresh state ────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else if (token) prom.resolve(token);
  });
  failedQueue = [];
};

messagingHttp.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // Exponential Backoff Retry for GET requests on network or 5xx errors
    const isNetworkError = !error.response || (error.code && error.code !== 'ERR_CANCELED');
    const isServerError = error.response && error.response.status >= 500 && error.response.status <= 599;

    if (original && (isNetworkError || isServerError) && original.method?.toLowerCase() === 'get') {
      original._retryCount = original._retryCount || 0;
      if (original._retryCount < 3) {
        original._retryCount += 1;
        const delay = Math.pow(2, original._retryCount) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return messagingHttp(original);
      }
    }

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return messagingHttp(original);
          })
          .catch((err) => Promise.reject(err));
      }

      original._retry = true;
      isRefreshing = true;

      return new Promise((resolve, reject) => {
        TokenStore.getRefreshToken()
          .then(async (refreshToken) => {
            if (!refreshToken) {
              reject(new Error('No refresh token'));
              return;
            }

            try {
              const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
              const accessToken = data.data.accessToken;
              const newRefreshToken = data.data.refreshToken;

              await TokenStore.setTokens(accessToken, newRefreshToken);

              messagingHttp.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
              original.headers.Authorization = `Bearer ${accessToken}`;

              processQueue(null, accessToken);
              resolve(messagingHttp(original));
            } catch (err) {
              processQueue(err, null);
              try { await TokenStore.clearTokens(); } catch (_) {}
              reject(err);
            }
          })
          .catch(reject)
          .finally(() => { isRefreshing = false; });
      });
    }

    return Promise.reject(error);
  },
);

export default messagingHttp;
