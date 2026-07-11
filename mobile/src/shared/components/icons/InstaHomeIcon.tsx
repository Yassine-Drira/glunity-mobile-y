import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function InstaHomeIcon({
  size = 24,
  color = '#FFFFFF',
  strokeWidth = 2.2,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M 12 3.5 L 4 10 V 19 C 4 19.55 4.45 20 5 20 H 9 V 15 C 9 13.5 15 13.5 15 15 V 20 H 19 C 19.55 20 20 19.55 20 19 V 10 L 12 3.5 Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
