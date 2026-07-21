import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

// Custom wrapper to filter out `collapsable` prop injected by Animated on web
const SvgCircleWrapper = React.forwardRef(({ collapsable, ...props }: any, ref: any) => (
  <Circle ref={ref} {...props} />
));

const AnimatedCircle = Animated.createAnimatedComponent(SvgCircleWrapper);

export interface DonutData {
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutData[];
  size?: number;
  strokeWidth?: number;
}

export function DonutChart({ data, size = 120, strokeWidth = 16 }: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  const total = Math.max(1, data.reduce((sum, d) => sum + d.value, 0));

  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animValue.setValue(0);
    Animated.timing(animValue, {
      toValue: 1,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [data, animValue]);

  let currentOffset = 0;
  const center = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G transform={`rotate(-90 ${center} ${center})`}>
          {data.map((d, i) => {
            if (d.value === 0) return null;

            const strokeDashoffset = animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [circumference, circumference - (circumference * (d.value / total))]
            });

            const rotation = (currentOffset / total) * 360;
            currentOffset += d.value;

            return (
              <G key={i} transform={`rotate(${rotation} ${center} ${center})`}>
                <AnimatedCircle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={d.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  fill="transparent"
                  strokeLinecap="round"
                />
              </G>
            );
          })}
        </G>
      </Svg>
    </View>
  );
}
