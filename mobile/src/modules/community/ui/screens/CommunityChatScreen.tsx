import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';

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

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    title: { fontSize: 22, fontWeight: '700', marginBottom: 8, color: T.text, textAlign: 'center' },
    subtitle: { color: T.textSub || '#666', textAlign: 'center', lineHeight: 20 },
    leave: { marginTop: 24, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: T.surfaceAlt || '#eee', borderRadius: 12, borderWidth: 1, borderColor: T.border },
    leaveText: { color: T.red || '#c33', fontWeight: '600' },
  }), [T]);

  return (
    <AppScaffold title={t('Community')} activeTab="events" contentStyle={{ backgroundColor: T.bg }}>
      <View style={[styles.container, { backgroundColor: 'transparent', paddingBottom: 116 + insets.bottom }]}> 
        <Text style={styles.title}>{t('Community Chat')}</Text>
        <Text style={styles.subtitle}>{t('Welcome to the community chat. Treat this as the group space for tips, questions and discovery.')}</Text>

        <TouchableOpacity style={styles.leave} onPress={handleLeave}>
          <Text style={styles.leaveText}>{t('Leave community (dev)')}</Text>
        </TouchableOpacity>
      </View>
    </AppScaffold>
  );
}
