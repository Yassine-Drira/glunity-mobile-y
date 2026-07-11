import { API_BASE_URL } from '../config/api.config';

const DEFAULT_MESSAGING_PORT = '5001';

export function resolveMessagingServiceUrl(apiBaseUrl: string = API_BASE_URL): string {
  const envOverride = process.env.EXPO_PUBLIC_MESSAGING_SERVICE_URL?.trim();
  if (envOverride) {
    return envOverride.replace(/\/+$/, '');
  }

  const normalized = (apiBaseUrl || '').trim();
  if (!normalized) {
    return `http://localhost:${DEFAULT_MESSAGING_PORT}`;
  }

  try {
    const url = new URL(normalized);
    const configuredPort = process.env.EXPO_PUBLIC_MESSAGING_SERVICE_PORT?.trim() || DEFAULT_MESSAGING_PORT;

    url.port = configuredPort;
    url.pathname = '/';
    url.search = '';
    url.hash = '';

    return url.toString().replace(/\/$/, '');
  } catch {
    return normalized
      .replace(/\/api\/?$/, '')
      .replace(/:\d+/, `:${DEFAULT_MESSAGING_PORT}`)
      .replace(/\/+$/, '');
  }
}
