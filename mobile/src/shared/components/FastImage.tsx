import React from 'react';
import { Image, ImageProps } from 'react-native';

// Lightweight wrapper that uses `expo-image` when available, otherwise falls back to RN `Image`.
let ExpoImage: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('expo-image');
  ExpoImage = mod && (mod.Image || mod.default || mod.ExpoImage) ? (mod.Image || mod.default || mod.ExpoImage) : null;
} catch (e) {
  ExpoImage = null;
}

type FastImageProps = {
  source: any;
  style?: any;
  contentFit?: 'contain' | 'cover' | 'stretch' | 'center' | 'fill' | 'none';
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
  transition?: number;
  cachePolicy?: 'none' | 'disk' | 'memory' | 'immutable';
  priority?: 'low' | 'normal' | 'high';
  onLoad?: () => void;
  onError?: (e: any) => void;
} & Partial<ImageProps>;

export default function FastImage(props: FastImageProps) {
  const { source, style, contentFit, resizeMode, transition, cachePolicy, priority, onLoad, onError, ...rest } = props;

  // Normalize source and guard against empty uri which causes RN warning: "source.uri should not be an empty string"
  function normalize(s: any) {
    if (!s) return null;
    // local asset (number) is fine
    if (typeof s === 'number') return s;
    // arrays: pick first
    if (Array.isArray(s) && s.length > 0) return normalize(s[0]);
    if (typeof s === 'object') {
      if ('uri' in s) {
        const u = s.uri;
        if (!u) return null;
        if (typeof u === 'string' && u.trim().length === 0) return null;
        return { uri: u };
      }
      return s;
    }
    return null;
  }

  const src = normalize(source);
  if (!src) return null;

  // Map resizeMode to contentFit for expo-image, or keep it for React Native Image
  const fit = contentFit || resizeMode || 'cover';

  if (ExpoImage) {
    // If the uri is a data URI, use React Native Image which reliably handles data URIs.
    const uri = typeof src === 'object' && src.uri ? String(src.uri) : '';
    if (uri && uri.startsWith('data:')) {
      return <Image source={src} style={style} resizeMode={fit as any} onLoad={onLoad} onError={onError} {...rest} />;
    }

    return (
      <ExpoImage
        source={src}
        style={style}
        contentFit={fit}
        transition={transition ?? 150}
        cachePolicy={cachePolicy ?? 'disk'}
        priority={priority ?? 'normal'}
        onLoad={onLoad}
        onError={onError}
        {...rest}
      />
    );
  }

  return <Image source={src} style={style} resizeMode={fit as any} onLoad={onLoad} onError={onError} {...rest} />;
}

// Add static properties to match react-native-fast-image API
FastImage.resizeMode = {
  contain: 'contain',
  cover: 'cover',
  stretch: 'stretch',
  center: 'center',
};

FastImage.preload = (sources: Array<{ uri: string }>) => {
  if (ExpoImage && typeof ExpoImage.prefetch === 'function') {
    sources.forEach(src => {
      if (src.uri) {
        try {
          ExpoImage.prefetch(src.uri);
        } catch (e) {
          // ignore
        }
      }
    });
  } else {
    sources.forEach(src => {
      if (src.uri) {
        Image.prefetch(src.uri).catch(() => {});
      }
    });
  }
};
