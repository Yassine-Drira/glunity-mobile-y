import React, { useMemo } from 'react';
import { View, Text, Image, TextStyle } from 'react-native';

interface AvatarProps {
  url?: string | null;
  name?: string;
  size?: number;
  style?: any;
  textStyle?: TextStyle;
}

const PASTEL_COLORS = [
  '#E8F5E9', // Light green
  '#E3F2FD', // Light blue
  '#FFF3E0', // Light orange
  '#F3E5F5', // Light purple
  '#FCE4EC', // Light pink
  '#E0F2F1', // Light teal
  '#FFFDE7', // Light yellow
  '#F1F8E9', // Light lime
];

const TEXT_COLORS = [
  '#2E7D32', // Dark green
  '#1565C0', // Dark blue
  '#E65100', // Dark orange
  '#6A1B9A', // Dark purple
  '#C2185B', // Dark pink
  '#00695C', // Dark teal
  '#F57F17', // Dark yellow
  '#558B2F', // Dark lime
];

export function Avatar({ url, name = 'User', size = 40, style, textStyle }: AvatarProps) {
  const placeholder = useMemo(() => {
    const cleanName = name.trim();
    const initial = cleanName ? cleanName.charAt(0).toUpperCase() : 'U';
    
    // Deterministic selection based on char code sum
    let sum = 0;
    for (let i = 0; i < cleanName.length; i++) {
      sum += cleanName.charCodeAt(i);
    }
    const idx = sum % PASTEL_COLORS.length;
    
    return {
      initial,
      backgroundColor: PASTEL_COLORS[idx],
      textColor: TEXT_COLORS[idx],
    };
  }, [name]);

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[containerStyle, style]}
      />
    );
  }

  return (
    <View
      style={[
        containerStyle,
        { backgroundColor: placeholder.backgroundColor },
        style,
      ]}
    >
      <Text
        style={[
          {
            color: placeholder.textColor,
            fontWeight: '700',
            fontSize: Math.max(12, Math.floor(size * 0.45)),
            fontFamily: 'Poppins_700Bold',
          },
          textStyle,
        ]}
      >
        {placeholder.initial}
      </Text>
    </View>
  );
}
