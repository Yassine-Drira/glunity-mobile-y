import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { Colors, Font, Radius, Spacing } from '../utils/theme';

interface AuthInputProps extends TextInputProps {
  label: string;
  error?: string;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  hideLabel?: boolean;
  /** Pass theme tokens to enable dark-mode support */
  themeColors?: {
    text: string;
    textMuted: string;
    inputBg: string;
    inputBorder: string;
    green: string;
    greenLight: string;
    red: string;
    errorLight: string;
  };
}

export function AuthInput({
  label,
  error,
  rightIcon,
  onRightIconPress,
  style,
  hideLabel,
  themeColors,
  ...rest
}: AuthInputProps) {
  const [focused, setFocused] = useState(false);

  // Merge theme-aware colors with static fallbacks
  const tc = themeColors;
  const inputBg     = tc?.inputBg     ?? Colors.inputBg;
  const inputBorder = tc?.inputBorder ?? Colors.inputBorder;
  const textColor   = tc?.text        ?? Colors.dark;
  const labelColor  = tc?.textMuted   ?? Colors.muted;
  const greenColor  = tc?.green       ?? '#8BC34A';
  const greenLight  = tc?.greenLight  ?? 'rgba(139,195,74,0.12)';
  const errorBg     = tc?.errorLight  ?? Colors.errorLight;

  return (
    <View style={styles.wrapper}>
      {!hideLabel && (
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
      )}
      <View
        style={[
          styles.inputContainer,
          { backgroundColor: inputBg, borderColor: inputBorder },
          focused && { borderColor: greenColor, backgroundColor: greenLight },
          !!error && { borderColor: Colors.error, backgroundColor: errorBg },
        ]}
      >
        <TextInput
          style={[styles.input, { color: textColor }, style]}
          placeholderTextColor={labelColor}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
          {...rest}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.icon}>
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.md,
    alignSelf: 'stretch',
  },
  label: {
    fontSize: 13,
    fontWeight: Font.medium,
    // color set inline via themeColors
    marginBottom: Spacing.xs,
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingVertical: 10,
    // backgroundColor & borderColor set inline via themeColors
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
  },
  inputFocused: {
    // handled inline
  },
  inputError: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: Font.regular,
    // color set inline via themeColors
    textAlignVertical: 'center',
  },
  icon: {
    paddingLeft: Spacing.sm,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
  },
});
