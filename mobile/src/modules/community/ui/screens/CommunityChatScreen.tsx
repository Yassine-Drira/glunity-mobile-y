import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import MessagingHome from './MessagingHome';
import CommunityMessaging from './CommunityMessaging';

export default function CommunityChatScreen({ navigation, route }: any) {
  const [loading, setLoading] = useState(true);
  const { theme: T } = useTheme();
  const { t } = useLanguage();

  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem('@joined_community');
        if (v !== 'true') {
          navigation.replace('Community');
        } else {
          setLoading(false);
        }
      } catch (e) {
        setLoading(false);
      }
    })();
  }, [navigation]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: T.bg }}>
        <ActivityIndicator size="large" color={T.green} />
      </View>
    );
  }

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
