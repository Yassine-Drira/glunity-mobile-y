import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../../../shared/context/theme.context';
import { Font } from '../../../../shared/utils/theme';

export interface BarData {
  label: string;
  values: { value: number; color: string }[];
}

interface BarChartProps {
  data: BarData[];
  height?: number;
  maxHeight?: number;
}

export function BarChart({ data, height = 160, maxHeight = 100 }: BarChartProps) {
  const { theme: T } = useTheme();
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animValue.setValue(0);
    Animated.timing(animValue, {
      toValue: 1,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [data]);

  let globalMax = 1;
  data.forEach(d => {
    d.values.forEach(v => {
      if (v.value > globalMax) globalMax = v.value;
    });
  });

  const count = data.length;
  // Dynamically compute bar widths and margins based on item density
  let barWidth = 8;
  let barMargin = 2;
  let labelInterval = 1; // Show every label

  if (count > 20) {
    barWidth = 3;
    barMargin = 0.5;
    labelInterval = 5; // Show every 5th label (e.g. 1st, 6th, 11th...)
  } else if (count > 10) {
    barWidth = 5;
    barMargin = 1;
    labelInterval = 2; // Show every 2nd label
  }

  return (
    <View style={[styles.container, { height }]}>
      {data.map((d, index) => {
        const showLabel = index % labelInterval === 0 || index === count - 1;

        return (
          <View key={index} style={styles.barGroupContainer}>
            <View style={styles.barsArea}>
              {d.values.map((v, i) => {
                const targetHeight = Math.max((v.value / globalMax) * maxHeight, v.value > 0 ? 4 : 0);
                const animatedHeight = animValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, targetHeight]
                });
                
                return (
                  <Animated.View
                    key={i}
                    style={[
                      styles.bar,
                      {
                        backgroundColor: v.color,
                        height: animatedHeight,
                        width: barWidth,
                        marginHorizontal: barMargin,
                      }
                    ]}
                  />
                );
              })}
            </View>
            <View style={styles.labelWrapper}>
              <Text 
                style={[
                  styles.label, 
                  { 
                    color: T.textMuted,
                    opacity: showLabel ? 1 : 0 
                  }
                ]} 
                numberOfLines={1}
              >
                {d.label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    width: '100%',
    paddingBottom: 10,
  },
  barGroupContainer: {
    alignItems: 'center',
    flex: 1,
  },
  barsArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 100, // matches maxHeight
  },
  bar: {
    borderRadius: 4,
  },
  labelWrapper: {
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  label: {
    marginTop: 4,
    fontSize: 9,
    fontFamily: Font.medium,
    textAlign: 'center',
  }
});
