import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../../shared/context/theme.context';
import { Colors, Font, Radius, Spacing } from '../../../../shared/utils/theme';

interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export function ErrorState({ message = 'Une erreur est survenue lors du chargement des données', onRetry }: ErrorStateProps) {
  const { theme: T, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1C1C1E' : Colors.white, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
      <View style={[styles.iconWrapper, { backgroundColor: Colors.errorLight }]}>
        <Feather name="alert-triangle" size={24} color={Colors.error} />
      </View>
      <Text style={[styles.message, { color: T.text }]}>{message}</Text>
      
      <TouchableOpacity style={styles.button} onPress={onRetry}>
        <Feather name="refresh-cw" size={14} color="#FFF" />
        <Text style={styles.buttonText}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    fontFamily: Font.medium,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  buttonText: {
    color: '#FFF',
    fontFamily: Font.semibold,
    fontSize: 13,
    marginLeft: Spacing.xs,
  },
});
