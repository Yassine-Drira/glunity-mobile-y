import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import { TempCommunityMessaging } from './TempCommunityMessaging';

export default function CommunityChatScreen({ navigation }: any) {
  const [joined, setJoined] = useState(true);
  const { theme: T } = useTheme();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useLanguage();

  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem('@joined_community');
        setJoined(v === 'true');
      } catch (e) {
        setJoined(true);
      }
    })();
  }, []);

  const handleLeave = async () => {
    await AsyncStorage.removeItem('@joined_community');
    navigation.replace('Home');
  };

  return (
    <AppScaffold title={t('Community')} activeTab="events" contentStyle={{ backgroundColor: T.bg }}>
      <TempCommunityMessaging />
    </AppScaffold>
  );
}
