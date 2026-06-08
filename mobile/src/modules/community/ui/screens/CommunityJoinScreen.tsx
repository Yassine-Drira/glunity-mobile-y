import React, { useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Radius, Spacing } from '@/shared/utils/theme';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { useLanguage } from '@/shared/context/language.context';
import { useTheme } from '@/shared/context/theme.context';

export default function CommunityJoinScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { theme: T } = useTheme();
  const { t, isRTL } = useLanguage();

  const handleJoin = async () => {
    try {
      await AsyncStorage.setItem('@joined_community', 'true');
    } catch (e) {
      // ignore
    }
    navigation.replace('CommunityJoin');
  };

  const handleMaybeLater = () => {
    if (navigation.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  const accent = T.green;
  const accentSoft = T.greenLight;

  const styles = useMemo(() => StyleSheet.create({
    container: {
      paddingTop: 20,
      paddingHorizontal: 28,
      alignItems: 'center',
      backgroundColor: 'transparent',
      flexGrow: 1,
      paddingBottom: 120,
    },
    mascot: { width: 180, height: 180, marginTop: 6 },
    title: { fontSize: 22, lineHeight: 28, fontWeight: '800', marginTop: 6, color: T.text, fontFamily: 'Poppins_700Bold' },
    titleAccent: { color: accent, fontFamily: 'Poppins_700Bold', fontSize: 22, lineHeight: 28 },
    subtitle: { fontSize: 13, color: T.textSub, textAlign: 'center', marginTop: 12, lineHeight: 20, maxWidth: 340, fontFamily: 'Poppins_400Regular' },
    highlight: { color: accent, marginTop: 14, fontWeight: '700', fontFamily: 'Poppins_600SemiBold' },
    cardList: { width: '100%', marginTop: 18 },
    cardRow: {
      backgroundColor: T.surface,
      borderRadius: Radius.lg,
      paddingVertical: 18,
      paddingHorizontal: Spacing.lg,
      marginBottom: 18,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: T.border,
    },
    iconWrap: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: isRTL ? 0 : 16,
      marginLeft: isRTL ? 16 : 0,
      backgroundColor: 'transparent',
    },
    cardBody: {
      flex: 1,
      alignItems: isRTL ? 'flex-end' : 'flex-start',
    },
    cardTitle: {
      fontWeight: '700',
      color: T.text,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 16,
      textAlign: isRTL ? 'right' : 'left',
    },
    cardDesc: {
      color: T.textSub,
      marginTop: 6,
      fontSize: 14,
      fontFamily: 'Poppins_400Regular',
      textAlign: isRTL ? 'right' : 'left',
    },
    joinButton: {
      backgroundColor: accent,
      paddingVertical: 18,
      borderRadius: 48,
      marginTop: 24,
      width: '100%',
      alignItems: 'center',
      shadowColor: accent,
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.18,
      shadowRadius: 36,
      elevation: 12,
    },
    joinText: { color: '#fff', fontWeight: '800', fontSize: 16, fontFamily: 'Poppins_700Bold' },
    maybeLater: { marginTop: 18, alignSelf: 'center' },
    maybeLaterText: { color: T.textMuted, fontFamily: 'Poppins_500Medium' },
  }), [isRTL, T, accent, accentSoft]);

  return (
    <AppScaffold title={t('Community')} activeTab="events" onBack={handleMaybeLater}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 116 + insets.bottom }]}>
        <Image
          source={require('../../../../../assets/Logo/image 3.png')}
          style={styles.mascot}
          resizeMode="contain"
        />

        <Text style={styles.title}>
          {t('Welcome, ')}<Text style={styles.titleAccent}>{t('warrior!')}</Text>
        </Text>

        <Text style={styles.subtitle}>
          {t('You\'re not alone on this journey. Join a community of people living gluten-free, share your experiences, discover tips, and support each other.')}
        </Text>

        <Text style={styles.highlight}>{t('Together, we fight gluten')}</Text>

        <View style={styles.cardList}>
          <View style={styles.cardRow}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name="share-variant" size={26} color={T.red} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{t('Share tips')}</Text>
              <Text style={styles.cardDesc}>{t('Help others with your experience')}</Text>
            </View>
          </View>

          <View style={styles.cardRow}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name="help-circle-outline" size={26} color={T.red} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{t('Ask questions')}</Text>
              <Text style={styles.cardDesc}>{t('Get advice from the community')}</Text>
            </View>
          </View>

          <View style={styles.cardRow}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name="compass-outline" size={26} color={T.red} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{t('Discover')}</Text>
              <Text style={styles.cardDesc}>{t('Find recipes and safe places')}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.joinButton} onPress={handleJoin} activeOpacity={0.9}>
          <Text style={styles.joinText}>{t('Join the community')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleMaybeLater} style={styles.maybeLater}>
          <Text style={styles.maybeLaterText}>{t('Maybe later')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </AppScaffold>
  );
}
