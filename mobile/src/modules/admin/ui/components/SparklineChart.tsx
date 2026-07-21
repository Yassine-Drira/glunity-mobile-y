import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface SparklineChartProps {
  data: number[];
  width: number;
  height: number;
  color: string;
  strokeWidth?: number;
}

export function SparklineChart({ data, width, height, color, strokeWidth = 2 }: SparklineChartProps) {
  if (!data || data.length < 2) {
    return <View style={{ width, height }} />;
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const stepX = width / (data.length - 1);
  
  const pathData = data.map((d, i) => {
    const x = i * stepX;
    const y = height - ((d - min) / range) * (height - strokeWidth*2) - strokeWidth;
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Path d={pathData} fill="none" stroke={color} strokeWidth={strokeWidth} />
      </Svg>
    </View>
  );
}
