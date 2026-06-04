import React from 'react';
import { Image, ImageProps } from 'react-native';

const resizeModeMap = {
  contain: 'contain',
  cover: 'cover',
  stretch: 'stretch',
  center: 'center',
} as const;

export const resizeMode = resizeModeMap;

export function preload(sources: Array<{ uri: string }>) {
  sources.forEach(src => {
    if (src.uri) {
      Image.prefetch(src.uri).catch(() => {});
    }
  });
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

// Create wrapper component for web
const FastImageWrapper = React.forwardRef((props: any, ref: any) => {
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
