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
}

export function AuthInput({
  label,
  error,
  rightIcon,
  onRightIconPress,
  style,
  hideLabel,
  ...rest
}: AuthInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {!hideLabel && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          focused && styles.inputFocused,
          !!error && styles.inputError,
        ]}
      >
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Colors.muted}
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
    color: Colors.muted,
    marginBottom: Spacing.xs,
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingVertical: 10,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
  },
  inputFocused: {
    borderColor: Colors.green,
    backgroundColor: Colors.greenLight,
  },
  inputError: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorLight,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: Font.regular,
    color: Colors.dark,
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
