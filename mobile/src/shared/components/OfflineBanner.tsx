import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useNetwork } from '../context/network.context';
import { useTheme } from '../context/theme.context';
import { useLanguage } from '../context/language.context';
import { Feather } from '@expo/vector-icons';

export function OfflineBanner() {
  const { isOnline } = useNetwork();
  const { theme: T } = useTheme();
  const { t } = useLanguage();

  if (isOnline) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: T.red }]}>
      <Feather name="cloud-off" size={14} color="#FFFFFF" style={{ marginRight: 8 }} />
      <Text style={styles.text}>{t('Offline Mode - Using cached data')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
    }),
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
});
