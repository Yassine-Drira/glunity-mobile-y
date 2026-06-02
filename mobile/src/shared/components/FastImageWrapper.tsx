import React from 'react';
import { Image, ImageProps, Platform } from 'react-native';

let FastImage: any;
try {
  if (Platform.OS !== 'web') {
    FastImage = require('react-native-fast-image');
  }
} catch (e) {
  // Fallback if import fails
}

// Fallback resize modes in case FastImage is not loaded
const resizeModeMap = {
  contain: Platform.OS === 'web' ? 'contain' : FastImage?.resizeMode?.contain || 'contain',
  cover: Platform.OS === 'web' ? 'cover' : FastImage?.resizeMode?.cover || 'cover',
  stretch: Platform.OS === 'web' ? 'stretch' : FastImage?.resizeMode?.stretch || 'stretch',
  center: Platform.OS === 'web' ? 'center' : FastImage?.resizeMode?.center || 'center',
} as const;

export const resizeMode = resizeModeMap;

export function preload(sources: Array<{ uri: string }>) {
  if (Platform.OS !== 'web' && FastImage) {
    try {
      FastImage.preload(sources);
    } catch (e) {
      // Safe fail
    }
  } else {
    // Prefetch using React Native Image on Web
    sources.forEach(src => {
      if (src.uri) {
        Image.prefetch(src.uri).catch(() => {});
      }
    });
  }
}

interface FastImageWrapperProps extends Omit<ImageProps, 'source' | 'resizeMode'> {
  source: any;
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'center' | any;
}

type FastImageWrapperComponent = React.ForwardRefExoticComponent<
  FastImageWrapperProps & React.RefAttributes<any>
> & {
  resizeMode: typeof resizeModeMap;
  preload: typeof preload;
};

// Create wrapper component
const FastImageWrapper = React.forwardRef((props: any, ref: any) => {
  if (Platform.OS !== 'web' && FastImage) {
    // Use the native FastImage component on mobile devices
    const NativeFastImage = FastImage.default || FastImage;
    return <NativeFastImage ref={ref} {...props} />;
  }
  
  // Render a standard Image on Web
  const { source, resizeMode, ...rest } = props;
  return (
    <Image
      ref={ref}
      source={source}
      resizeMode={resizeMode}
      {...rest}
    />
  );
}) as any as FastImageWrapperComponent;

FastImageWrapper.resizeMode = resizeModeMap;
FastImageWrapper.preload = preload;

export default FastImageWrapper;
