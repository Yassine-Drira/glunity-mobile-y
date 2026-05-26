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
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Queue and Refreshing state for token serialization ──────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: any) => void }> = [];

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
          .then((refreshToken) => {
            axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken })
              .then(({ data }) => {
                const accessToken = data.data.accessToken;
                const newRefreshToken = data.data.refreshToken;
                TokenStore.setTokens(accessToken, newRefreshToken)
                  .then(() => {
                    http.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
                    original.headers.Authorization = `Bearer ${accessToken}`;
                    processQueue(null, accessToken);
                    resolve(http(original));
                  })
                  .catch((err) => {
                    processQueue(err, null);
                    reject(err);
                  });
              })
              .catch((err) => {
                processQueue(err, null);
                TokenStore.clearTokens()
                  .then(() => reject(err))
                  .catch(() => reject(err));
              });
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
