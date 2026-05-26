import { NativeModules, Platform } from 'react-native';

const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

function resolveWebApiBaseUrl(): string {
	if (typeof window !== 'undefined' && window.location?.hostname) {
		return `http://${window.location.hostname}:5000/api`;
	}
	return 'http://localhost:5000/api';
}

function resolveNativeHostFromMetro(): string | null {
	const scriptURL = (NativeModules as any)?.SourceCode?.scriptURL as string | undefined;
	if (!scriptURL) return null;

	try {
		const parsed = new URL(scriptURL);
		return parsed.hostname || null;
	} catch {
		const match = scriptURL.match(/https?:\/\/([^/:]+)/i);
		return match?.[1] || null;
	}
}

function resolveDefaultApiBaseUrl(): string {
	if (Platform.OS === 'web') {
		return resolveWebApiBaseUrl();
	}

	const nativeHost = resolveNativeHostFromMetro();
	if (nativeHost) {
		return `http://${nativeHost}:5000/api`;
	}

	// For Android emulator use: http://10.0.2.2:5000/api
	// For iOS simulator use:    http://localhost:5000/api
	// For physical device fallback use your machine LAN IP.
	return 'http://10.246.38.32:5000/api';
}

export const API_BASE_URL = envUrl || resolveDefaultApiBaseUrl();
