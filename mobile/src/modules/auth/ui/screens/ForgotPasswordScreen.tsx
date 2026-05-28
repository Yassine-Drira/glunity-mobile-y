import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/types';
import { AuthInput } from '@/shared/components/AuthInput';
import { AuthButton } from '@/shared/components/AuthButton';
import { Radius } from '@/shared/utils/theme';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import authApi from '../../api/auth.api';
// no icons or footer on this simplified screen

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

// ── Screen 1 – Email Entry ────────────────────────────────────────────────────
// ── Screen 1 – Email Entry ────────────────────────────────────────────────────
function EmailStep({
  initialEmail,
  onSent,
  onBack,
}: {
  initialEmail?: string;
  onSent: (email: string) => void;
  onBack: () => void;
}) {
  const { theme: T } = useTheme();
  const { t, isRTL } = useLanguage();
  const [email, setEmail]     = useState(initialEmail ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const styles = React.useMemo(() => StyleSheet.create({
    flex:  { flex: 1 },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop:        28,
      paddingBottom:     80,
    },
    centeredContent: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 14,
      color: T.textSub,
      fontWeight: '400',
      fontFamily: 'Poppins_400Regular',
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
    },
    errorBanner: {
      backgroundColor: T.errorLight,
      borderWidth: 1,
      borderColor: T.red,
      borderRadius: Radius.md,
      padding: 12,
      marginBottom: 12,
    },
    errorText: { color: T.red, fontSize: 13, fontFamily: 'Poppins_400Regular' },
    backWrap: { alignSelf: 'center', marginTop: 24 },
    backText: {
      fontSize: 14,
      fontWeight: '500',
      fontFamily: 'Poppins_500Medium',
      color: T.textSub,
    },
  }), [T]);

  async function handleSubmit() {
    setError('');
    const trimmed = email.trim();
    if (!trimmed || !/\S+@\S+\.\S+/.test(trimmed)) {
      setError(t('Please enter a valid email address'));
      return;
    }
    setLoading(true);
    try {
      await authApi.forgotPassword(trimmed.toLowerCase());
      onSent(trimmed);
    } catch (e: any) {
      // Even on error we show "sent" to avoid enumeration leaks
      onSent(trimmed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, styles.centeredContent]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t('Forgot Password')}</Text>

        {/* Error */}
        {!!error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{t(error)}</Text>
          </View>
        )}

        <AuthInput
          label={t('Email')}
          placeholder={t('Enter your email')}
          keyboardType="email-address"
          autoComplete="off"
          value={email}
          onChangeText={setEmail}
        />

        <AuthButton
          label={t('Submit')}
          variant="filled"
          loading={loading}
          onPress={handleSubmit}
          containerStyle={{ marginTop: 12 }}
        />

        <TouchableOpacity onPress={onBack} style={styles.backWrap} activeOpacity={0.7}>
          <Text style={styles.backText}>{t('← Back to Login')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Screen 2 – Sent Confirmation ──────────────────────────────────────────────
function SentStep({
  email,
  onBackToLogin,
}: {
  email: string;
  onBackToLogin: () => void;
}) {
  const { theme: T } = useTheme();
  const { t } = useLanguage();

  const styles = React.useMemo(() => StyleSheet.create({
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop:        40,
      paddingBottom:     140,
    },
    centeredContent: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    // mailboxBox removed per mock (no icons)
    title: {
      fontSize: 24,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    sentBody: {
      fontSize: 15,
      color: T.textSub,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 8,
      fontFamily: 'Poppins_400Regular',
    },
    sentEmail: { fontWeight: '700', fontFamily: 'Poppins_700Bold', color: T.text },
    sentHint: {
      fontSize: 12,
      color: T.textSub,
      textAlign: 'center',
      lineHeight: 18,
      fontFamily: 'Poppins_400Regular',
    },
  }), [T]);

  return (
    <View style={[styles.scroll, styles.centeredContent]}>
      <Image
        source={require('../../../../../assets/Logo/Group 4.png')}
        style={{ width: 180, height: 160, resizeMode: 'contain', marginBottom: 18 }}
      />

      <Text style={styles.sentBody}>{t('Email sent to change your password')}</Text>

      <AuthButton
        label={t('Back to Login')}
        variant="filled"
        onPress={onBackToLogin}
        containerStyle={{ marginTop: 24, width: '100%' }}
      />
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ForgotPasswordScreen({ navigation, route }: Props) {
  const { theme: T, isDark } = useTheme();
  const initialEmail = route.params?.email ?? '';
  const [step, setStep]           = useState<'email' | 'sent'>('email');
  const [sentEmail, setSentEmail] = useState('');

  function handleSent(email: string) {
    setSentEmail(email);
    setStep('sent');
  }

  const styles = React.useMemo(() => StyleSheet.create({
    safe:  { flex: 1, backgroundColor: T.bg },
  }), [T]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={T.bg} />

      {step === 'email' ? (
        <EmailStep
          initialEmail={initialEmail}
          onSent={handleSent}
          onBack={() => navigation.navigate('Login')}
        />
      ) : (
        <SentStep
          email={sentEmail}
          onBackToLogin={() => navigation.navigate('Login')}
        />
      )}

      {/* no footer on this screen per design */}
    </SafeAreaView>
  );
}
