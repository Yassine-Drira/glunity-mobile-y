import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import { Font } from '../../../../shared/utils/theme';

interface AreaChartProps {
  data: number[];
  labels?: string[];
  width: number;
  height: number;
  color: string;
}

export function AreaChart({ data, labels, width, height, color }: AreaChartProps) {
  const chartHeight = height - 28; // Reserve space for x-axis labels

  if (!data || data.length < 2) return <View style={{ width, height }} />;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data.map((d, i) => {
    const x = i * stepX;
    const y = chartHeight - ((d - min) / range) * (chartHeight - 20) - 10;
    return { x, y };
  });

  // Smooth bezier curve
  let pathData = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const xc = (p0.x + p1.x) / 2;
    pathData += ` C${xc},${p0.y} ${xc},${p1.y} ${p1.x},${p1.y}`;
  }

  const areaData = `${pathData} L${width},${chartHeight} L0,${chartHeight} Z`;

  // Prevent X-axis label collision: calculate clean offsets
  const visibleLabelIndices: number[] = [];
  const labelStep = Math.max(1, Math.floor(data.length / 4));
  
  for (let i = 0; i < data.length; i += labelStep) {
    visibleLabelIndices.push(i);
  }
  
  if (data.length - 1 > 0 && !visibleLabelIndices.includes(data.length - 1)) {
    const lastIndex = visibleLabelIndices[visibleLabelIndices.length - 1];
    // If the last interval label is too close to the absolute end label, swap it
    if (data.length - 1 - lastIndex < labelStep / 2) {
      visibleLabelIndices[visibleLabelIndices.length - 1] = data.length - 1;
    } else {
      visibleLabelIndices.push(data.length - 1);
    }
  }

  return (
    <View style={{ width }}>
      <View style={{ position: 'relative' }}>
        {/* Y-axis max/min labels */}
        <Text style={{ position: 'absolute', top: 2, right: 2, fontSize: 9, color: color, fontFamily: Font.medium, opacity: 0.7 }}>
          {max}
        </Text>
        <Text style={{ position: 'absolute', bottom: 4, right: 2, fontSize: 9, color: '#999', fontFamily: Font.medium }}>
          {min}
        </Text>

        <Svg width={width} height={chartHeight}>
          <Defs>
            <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity="0.35" />
              <Stop offset="0.5" stopColor={color} stopOpacity="0.1" />
              <Stop offset="1" stopColor={color} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          {/* Grid lines */}
          <Line x1={0} y1={10} x2={width} y2={10} stroke="rgba(128,128,128,0.1)" strokeWidth={1} strokeDasharray="4,3" />
          <Line x1={0} y1={chartHeight / 2} x2={width} y2={chartHeight / 2} stroke="rgba(128,128,128,0.07)" strokeWidth={1} strokeDasharray="4,3" />
          <Path d={areaData} fill="url(#areaGrad)" />
          <Path d={pathData} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>

      {/* X-axis labels */}
      {labels && labels.length > 0 && (
        <View style={{ flexDirection: 'row', position: 'relative', height: 20, marginTop: 2 }}>
          {visibleLabelIndices.map((i) => {
            const x = i * stepX;
            // Center the label at point x
            const labelWidth = 40;
            const leftOffset = Math.max(0, Math.min(x - labelWidth / 2, width - labelWidth));

            return (
              <Text
                key={i}
                style={{
                  position: 'absolute',
                  left: leftOffset,
                  fontSize: 9,
                  color: '#999',
                  fontFamily: Font.medium,
                  width: labelWidth,
                  textAlign: 'center',
                }}
                numberOfLines={1}
              >
                {labels[i]}
              </Text>
            );
          })}
        </View>
      )}
    </View>
  );
}
