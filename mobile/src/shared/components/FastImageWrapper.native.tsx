import React from 'react';
import { Image, ImageProps } from 'react-native';

let FastImage: any;
try {
  FastImage = require('react-native-fast-image');
} catch (e) {
  // Fallback if import fails (e.g. standard Expo Go environment)
}

const resizeModeMap = {
  contain: FastImage?.resizeMode?.contain || 'contain',
  cover: FastImage?.resizeMode?.cover || 'cover',
  stretch: FastImage?.resizeMode?.stretch || 'stretch',
  center: FastImage?.resizeMode?.center || 'center',
} as const;

export const resizeMode = resizeModeMap;

export function preload(sources: Array<{ uri: string }>) {
  if (FastImage) {
    try {
      FastImage.preload(sources);
    } catch (e) {
      // Safe fail
    }
  } else {
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

const FastImageWrapper = React.forwardRef((props: any, ref: any) => {
  if (FastImage) {
    const NativeFastImage = FastImage.default || FastImage;
    return <NativeFastImage ref={ref} {...props} />;
  }
  return <Image ref={ref} {...props} />;
}) as any as FastImageWrapperComponent;

FastImageWrapper.resizeMode = resizeModeMap;
FastImageWrapper.preload = preload;

export default FastImageWrapper;
