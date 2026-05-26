import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type WaveBackgroundProps = {
  height?: number;
  color?: string;
};

export function WaveBackground({
  height = 220,
  color = '#8BC34A',
}: WaveBackgroundProps) {
  const { width } = useWindowDimensions();

  return (
    <View pointerEvents="none" style={styles.waveContainer}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Path
          d={`
            M0,${height * 0.55}
            C${width * 0.32},20
              ${width * 0.74},100
              ${width},160
            L${width},${height}
            L0,${height}
            Z
          `}
          fill={color}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  waveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
