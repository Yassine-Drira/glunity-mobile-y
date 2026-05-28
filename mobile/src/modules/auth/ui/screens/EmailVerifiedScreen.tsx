import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/types';
import { AuthButton } from '@/shared/components/AuthButton';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import { Feather } from '@expo/vector-icons';

type Props = NativeStackScreenProps<AuthStackParamList, 'EmailVerified'>;

export default function EmailVerifiedScreen({ route, navigation }: Props) {
  const success = route.params?.success !== false;
  const { theme: T, isDark } = useTheme();
  const { t, isRTL } = useLanguage();

  const styles = React.useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: T.bg },
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingBottom: 140,
    },

    iconCircle: {
      width: 120, height: 120, borderRadius: 60,
      backgroundColor: T.greenLight,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 24,
      shadowColor: T.green,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2, shadowRadius: 16, elevation: 6,
    },
    iconCircleRed: { backgroundColor: 'rgba(229,57,53,0.1)' },
    iconEmoji: { fontSize: 60 },

    title: {
      fontSize: 26, fontWeight: '700', fontFamily: 'Poppins_700Bold', color: T.text,
      textAlign: 'center', marginBottom: 8,
    },
    body: {
      fontSize: 15, color: T.textSub, textAlign: 'center',
      lineHeight: 24, fontFamily: 'Poppins_400Regular',
    },

    wave: {
      position: 'absolute', bottom: 0, left: -4, right: -4,
      height: 110, backgroundColor: T.green,
      borderTopLeftRadius: 9999, borderTopRightRadius: 9999,
    },
  }), [T]);

  if (success) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={T.bg} />
        <View style={styles.container}>
          {/* Icon */}
          <View style={styles.iconCircle}>
            <Feather name="check-circle" size={60} color={T.green} />
          </View>

          <Text style={styles.title}>{t('Email Verified!')}</Text>
          <Text style={styles.body}>
            {t('Your email address has been verified successfully.\nYou can now log in to your account and enjoy GlUnity.')}
          </Text>

          <AuthButton
            label={t('Go to Login')}
            variant="filled"
            onPress={() => navigation.navigate('Login')}
            containerStyle={{ marginTop: 24, width: '100%' }}
          />
        </View>
        <View style={styles.wave} />
      </SafeAreaView>
    );
  }

  // Failure state
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={T.bg} />
      <View style={styles.container}>
        <View style={[styles.iconCircle, styles.iconCircleRed]}>
          <Feather name="x-circle" size={60} color="#E53935" />
        </View>

        <Text style={styles.title}>{t('Verification Failed')}</Text>
        <Text style={styles.body}>
          {t('This verification link is invalid or has expired.\nPlease request a new verification email.')}
        </Text>

        <AuthButton
          label={t('Resend Verification')}
          variant="filled"
          onPress={() => navigation.navigate('Login')}
          containerStyle={{ marginTop: 24, width: '100%' }}
        />
        <AuthButton
          label={t('Back to Login')}
          variant="outlined"
          onPress={() => navigation.navigate('Login')}
          containerStyle={{ marginTop: 12, width: '100%' }}
        />
      </View>
      <View style={styles.wave} />
    </SafeAreaView>
  );
}
