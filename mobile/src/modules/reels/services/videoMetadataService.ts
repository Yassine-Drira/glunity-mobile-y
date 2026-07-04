import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Platform } from 'react-native';

/**
 * Type for video metadata callback
 */
export interface VideoLoadStatus {
	isLoaded: boolean;
	uri: string;
	progressUpdateIntervalMillis: number;
	durationMillis?: number;
	positionMillis: number;
	rate: number;
	shouldCorrectPitch: boolean;
	volume: number;
	isMuted: boolean;
	isPlaying: boolean;
	isBuffering: boolean;
	shouldPlay: boolean;
	isLooping: boolean;
	didJustFinish: boolean;
	audioPan: number;
}

/**
 * Extract video duration from Video onLoad callback status
 * This is the ONLY reliable way to get video duration in Expo
 */
export function extractDurationFromVideoStatus(videoStatus: any): {
	durationMs: number;
	durationFormatted: string;
} | null {
	try {
		console.log('[extractDurationFromVideoStatus] Received status:', {
			isLoaded: videoStatus?.isLoaded,
			durationMillis: videoStatus?.durationMillis,
			uri: videoStatus?.uri,
		});

		// Check if status has valid duration
		if (
			videoStatus?.isLoaded &&
			videoStatus?.durationMillis &&
			!isNaN(videoStatus.durationMillis) &&
			videoStatus.durationMillis > 0
		) {
			const durationMs = Math.floor(videoStatus.durationMillis);
			const durationFormatted = formatDuration(durationMs);

			console.log('[extractDurationFromVideoStatus] Duration extracted:', {
				durationMs,
				durationFormatted,
			});

			return {
				durationMs,
				durationFormatted,
			};
		}

		console.warn(
			'[extractDurationFromVideoStatus] Invalid or missing durationMillis:',
			videoStatus?.durationMillis
		);
		return null;
	} catch (error) {
		console.error('[extractDurationFromVideoStatus] Error extracting duration:', error);
		return null;
	}
}

/**
 * Web/Canvas fallback for video thumbnail generation
 */
export function generateVideoThumbnailWeb(videoUri: string, timeMs: number = 0): Promise<string | null> {
	return new Promise((resolve) => {
		try {
			const video = document.createElement('video');
			video.src = videoUri;
			video.crossOrigin = 'anonymous';
			video.muted = true;
			video.playsInline = true;
			// Convert ms to seconds
			video.currentTime = Math.max(0.1, timeMs / 1000);

			const timeout = setTimeout(() => {
				console.warn('[Web Thumbnail] Timeout generating thumbnail');
				cleanup();
				resolve(null);
			}, 5000);

			const cleanup = () => {
				clearTimeout(timeout);
				video.onseeked = null;
				video.onerror = null;
			};

			video.onseeked = () => {
				try {
					const canvas = document.createElement('canvas');
					canvas.width = video.videoWidth || 320;
					canvas.height = video.videoHeight || 180;
					const ctx = canvas.getContext('2d');
					if (ctx) {
						ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
						const dataUrl = canvas.toDataURL('image/jpeg');
						cleanup();
						resolve(dataUrl);
					} else {
						cleanup();
						resolve(null);
					}
				} catch (err) {
					console.error('[Web Thumbnail] Canvas extraction failed:', err);
					cleanup();
					resolve(null);
				}
			};

			video.onerror = (e) => {
				console.error('[Web Thumbnail] Video load error:', e);
				cleanup();
				resolve(null);
			};
		} catch (err) {
			console.error('[Web Thumbnail] Setup failed:', err);
			resolve(null);
		}
	});
}

/**
 * Generate a thumbnail image file from a frame of a video
 * Returns a file:// URI or base64 data URI that can be rendered by React Native Image component
 */
export async function generateVideoThumbnail(videoUri: string, timeMs: number = 0): Promise<string | null> {
	try {
		console.log('[generateVideoThumbnail] Generating thumbnail from video:', videoUri, 'at time:', timeMs);

		if (Platform.OS === 'web') {
			return await generateVideoThumbnailWeb(videoUri, timeMs);
		}

		// Use expo-video-thumbnails to generate an actual image file on native platforms
		if (VideoThumbnails && typeof VideoThumbnails.getThumbnailAsync === 'function') {
			const { uri: thumbnailUri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
				time: timeMs, // Extract frame at given time
			});
			console.log('[generateVideoThumbnail] Thumbnail generated successfully:', thumbnailUri);
			return thumbnailUri;
		}

		throw new Error('VideoThumbnails.getThumbnailAsync is not a function or module not loaded');
	} catch (error) {
		console.error('[generateVideoThumbnail] Error generating thumbnail:', error);
		// Try web fallback on native if document object is available (e.g., in react-native-web running in browser)
		try {
			if (typeof document !== 'undefined') {
				return await generateVideoThumbnailWeb(videoUri, timeMs);
			}
		} catch (e) {}
		return null;
	}
}

/**
 * Format milliseconds to MM:SS string
 */
export function formatDuration(milliseconds: number): string {
	try {
		const totalSeconds = Math.floor(milliseconds / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	} catch (error) {
		console.error('[formatDuration] Error formatting duration:', error);
		return '0:00';
	}
}
