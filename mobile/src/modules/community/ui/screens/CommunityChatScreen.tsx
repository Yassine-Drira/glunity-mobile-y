import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import MessagingHome from './MessagingHome';
import CommunityMessaging from './CommunityMessaging';

export default function CommunityChatScreen({ navigation, route }: any) {
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

  const initialChannel = route?.params?.initialChannel;
  const initialChannelId = route?.params?.channelId;

  return (
    <AppScaffold title={t('Community')} activeTab="events" contentStyle={{ backgroundColor: T.bg, paddingBottom: 0 }} showHeader={false} showBottomNav={false}>
      {/* Render flux messaging screen (home/list) or open chat when channel provided */}
      {initialChannel || initialChannelId ? (
        <CommunityMessaging initialChannel={initialChannel} initialChannelId={initialChannelId} navigation={navigation} />
      ) : (
        <MessagingHome navigation={navigation} />
      )}
    </AppScaffold>
  );
}
