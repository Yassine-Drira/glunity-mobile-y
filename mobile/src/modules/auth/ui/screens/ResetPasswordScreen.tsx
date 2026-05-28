import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import { Feather } from '@expo/vector-icons';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

type Step = 'form' | 'success' | 'error';

export default function ResetPasswordScreen({ route, navigation }: Props) {
  const token = route.params?.token ?? '';
  const { theme: T, isDark } = useTheme();
  const { t, isRTL } = useLanguage();

  const styles = React.useMemo(() => StyleSheet.create({
    safe:  { flex: 1, backgroundColor: T.bg },
    flex:  { flex: 1 },

    scroll: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 40,
      paddingBottom: 140,
      alignItems: 'center',
    },

    centeredBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingBottom: 140,
    },

    iconCircle: {
      width: 110, height: 110, borderRadius: 55,
      backgroundColor: T.greenLight,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 24,
      shadowColor: T.green,
      shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2,
      shadowRadius: 16, elevation: 6,
    },
    iconCircleRed: { backgroundColor: 'rgba(229,57,53,0.1)' },
    iconEmoji: { fontSize: 52 },

    title: {
      fontSize: 24, fontWeight: '700', fontFamily: 'Poppins_700Bold', color: T.text,
      textAlign: 'center', marginBottom: 12,
    },
    subtitle: {
      fontSize: 14, color: T.textSub, textAlign: 'center',
      lineHeight: 22, marginBottom: 24, width: '100%',
      fontFamily: 'Poppins_400Regular',
    },

    errorBanner: {
      backgroundColor: T.errorLight, borderWidth: 1, borderColor: T.red,
      borderRadius: Radius.md, padding: 12, marginBottom: 12,
      width: '100%',
    },
    errorText: { color: T.red, fontSize: 13, fontFamily: 'Poppins_400Regular' },

    hint: { fontSize: 12, color: T.textSub, marginBottom: 24, textAlign: 'center', fontFamily: 'Poppins_400Regular' },

    backWrap: { alignSelf: 'center', marginTop: 24 },
    backText: { fontSize: 14, fontWeight: '500', fontFamily: 'Poppins_500Medium', color: T.textSub },

    resultTitle: {
      fontSize: 24, fontWeight: '700', fontFamily: 'Poppins_700Bold', color: T.text,
      textAlign: 'center', marginBottom: 12,
    },
    resultBody: {
      fontSize: 14, color: T.textSub, textAlign: 'center', lineHeight: 22, fontFamily: 'Poppins_400Regular',
    },

    eye: { fontSize: 18 },
    wave: {
      position: 'absolute', bottom: 0, left: -4, right: -4,
      height: 110, backgroundColor: T.green,
      borderTopLeftRadius: 9999, borderTopRightRadius: 9999,
    },
  }), [T]);

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [step, setStep]           = useState<Step>('form');
  const [errors, setErrors]       = useState<{ password?: string; confirm?: string }>({});
  const [apiError, setApiError]   = useState('');

  function validate(): boolean {
    const e: typeof errors = {};
    if (password.length < 8)
      e.password = t('Minimum 8 characters');
    else if (!/[A-Z]/.test(password))
      e.password = t('Must include an uppercase letter');
    else if (!/[0-9]/.test(password))
      e.password = t('Must include a number');
    if (confirm !== password)
      e.confirm = t('Passwords do not match');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleReset() {
    setApiError('');
    if (!validate()) return;
    if (!token) {
      setApiError(t('Invalid or missing reset token. Please request a new link.'));
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setStep('success');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Reset failed. The link may have expired.';
      setApiError(t(msg));
      if (msg.toLowerCase().includes('expir')) setStep('error');
    } finally {
      setLoading(false);
    }
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={T.bg} />
        <View style={styles.centeredBox}>
          <View style={styles.iconCircle}>
            <Feather name="unlock" size={40} color={T.green} />
          </View>
          <Text style={styles.resultTitle}>{t('Password Updated!')}</Text>
          <Text style={styles.resultBody}>
            {t('Your password has been reset successfully.\nYou can now log in with your new password.')}
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

  // ── Error (expired) ────────────────────────────────────────────────────────
  if (step === 'error') {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={T.bg} />
        <View style={styles.centeredBox}>
          <View style={[styles.iconCircle, styles.iconCircleRed]}>
            <Feather name="clock" size={40} color="#E53935" />
          </View>
          <Text style={styles.resultTitle}>{t('Link Expired')}</Text>
          <Text style={styles.resultBody}>
            {t('This reset link has expired or was already used.\nPlease request a new one.')}
          </Text>
          <AuthButton
            label={t('Request New Link')}
            variant="filled"
            onPress={() => navigation.navigate('ForgotPassword')}
            containerStyle={{ marginTop: 24, width: '100%' }}
          />
          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.backWrap}>
            <Text style={styles.backText}>{t('Back to Login')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.wave} />
      </SafeAreaView>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={T.bg} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Icon */}
          <View style={styles.iconCircle}>
            <Feather name="lock" size={40} color={T.green} />
          </View>

          <Text style={styles.title}>{t('Set New Password')}</Text>
          <Text style={styles.subtitle}>
            {t('Choose a strong new password for your account.')}
          </Text>

          {/* API error */}
          {!!apiError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{t(apiError)}</Text>
            </View>
          )}

          <AuthInput
            label={t('New Password')}
            placeholder={t('At least 8 characters')}
            secureTextEntry={!showPass}
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            rightIcon={<Feather name={showPass ? 'eye-off' : 'eye'} size={20} color={T.textMuted} />}
            onRightIconPress={() => setShowPass((p) => !p)}
          />
          <AuthInput
            label={t('Confirm Password')}
            placeholder={t('Re-enter your password')}
            secureTextEntry={!showConf}
            value={confirm}
            onChangeText={setConfirm}
            error={errors.confirm}
            rightIcon={<Feather name={showConf ? 'eye-off' : 'eye'} size={20} color={T.textMuted} />}
            onRightIconPress={() => setShowConf((p) => !p)}
          />

          <Text style={styles.hint}>{t('Min 8 chars · one uppercase · one number')}</Text>

          <AuthButton
            label={t('Reset Password')}
            variant="filled"
            loading={loading}
            onPress={handleReset}
            containerStyle={{ marginTop: 12 }}
          />

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.backWrap}>
            <Text style={styles.backText}>{t('Back to Login')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.wave} />
    </SafeAreaView>
  );
}
