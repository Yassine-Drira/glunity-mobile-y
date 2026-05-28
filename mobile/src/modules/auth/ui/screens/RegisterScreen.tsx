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
  Keyboard,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import type { AuthStackParamList } from '../../../../navigation/types';
import { AuthInput } from '../../../../shared/components/AuthInput';
import { AuthButton } from '../../../../shared/components/AuthButton';
import { WaveBackground } from '../../../../shared/components/WaveBackground';
import { Radius } from '../../../../shared/utils/theme';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import { useAuth } from '../../state/auth.context';
import { Feather } from '@expo/vector-icons';
import type { RegisterProfileType } from '../../api/auth.api';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

interface FormState {
  fullName: string;
  email: string;
  password: string;
  confirm: string;
  profileType: RegisterProfileType | null;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirm?: string;
  profileType?: string;
}

const PROFILE_OPTIONS: Array<{ value: RegisterProfileType; label: string }> = [
  { value: 'celiac', label: 'Celiac' },
  { value: 'proche', label: 'Proche' },
  { value: 'pro_commerce', label: 'Pro Commerce' },
  { value: 'pro_health', label: 'Pro Health' },
];

export default function RegisterScreen({ navigation }: Props) {
  const { register, isLoading, error, clearError } = useAuth();
  const { theme: T, isDark } = useTheme();
  const { t, isRTL } = useLanguage();

  const styles = React.useMemo(() => StyleSheet.create({
    safe:  { flex: 1, backgroundColor: T.bg },
    flex:  { flex: 1 },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingBottom: 110,
      paddingTop: 12,
    },

    divider: {
      width: '90%',
      height: 1,
      backgroundColor: '#FFFFFF',
      alignSelf: 'center',
      marginBottom: 8,
    },

    title: {
      fontSize: 22,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
      textAlign: 'center',
      letterSpacing: 1.5,
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 14,
      color: T.textSub,
      fontWeight: '500',
      fontFamily: 'Poppins_500Medium',
      textAlign: 'center',
      marginBottom: 16,
    },

    // Error banner
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: T.errorLight,
      borderWidth: 1,
      borderColor: T.red,
      borderRadius: Radius.md,
      padding: 12,
      marginBottom: 12,
    },
    errorBannerText: { color: T.red, fontSize: 13, fontWeight: '500', fontFamily: 'Poppins_500Medium' },

    hint: {
      fontSize: 12,
      color: T.textSub,
      marginBottom: 16,
      textAlign: 'center',
      fontFamily: 'Poppins_400Regular',
    },

    profileLabel: {
      fontSize: 13,
      fontWeight: '500',
      fontFamily: 'Poppins_500Medium',
      color: T.textSub,
      marginTop: 4,
      marginBottom: 4,
      letterSpacing: 0.3,
    },
    profileGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 12,
    },
    profileChip: {
      borderWidth: 1,
      borderColor: T.border,
      backgroundColor: T.surface,
      borderRadius: Radius.md,
      paddingVertical: 9,
      paddingHorizontal: 12,
      marginRight: 8,
      marginBottom: 8,
    },
    profileChipSelected: {
      borderColor: T.green,
      backgroundColor: T.greenLight,
    },
    profileChipText: {
      fontSize: 13,
      color: T.text,
      fontWeight: '500',
      fontFamily: 'Poppins_500Medium',
    },
    profileChipTextSelected: {
      color: T.green,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
    },
    profileError: {
      fontSize: 12,
      color: T.red,
      marginTop: -4,
      marginBottom: 12,
      fontFamily: 'Poppins_400Regular',
    },

    btnGroup: { marginBottom: 24 },

    switchRow: {
      position: 'absolute',
      bottom: 56,
      left: 0,
      right: 0,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    switchText: { fontSize: 16, fontWeight: '500', fontFamily: 'Poppins_500Medium', color: '#FFFFFF' },
    switchLink: { fontSize: 16, fontWeight: '700', fontFamily: 'Poppins_700Bold', color: '#343831' },

    eye: { fontSize: 18 },
  }), [T, isRTL]);

  useFocusEffect(
    React.useCallback(() => {
      clearError();
      return undefined;
    }, [clearError]),
  );

  const [keyboardOpen, setKeyboardOpen] = useState(false);

  React.useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const [form, setForm] = useState<FormState>({
    fullName: '',
    email: '',
    password: '',
    confirm: '',
    profileType: null,
  });
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors]           = useState<FormErrors>({});

  const set = (key: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  function validate(): boolean {
    const e: FormErrors = {};
    if (!form.fullName.trim() || form.fullName.trim().length < 2)
      e.fullName = t('Full name must be at least 2 characters');
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email))
      e.email = t('Valid email is required');
    if (form.password.length < 8)
      e.password = t('Password must be at least 8 characters');
    else if (!/[A-Z]/.test(form.password))
      e.password = t('Must contain an uppercase letter');
    else if (!/[0-9]/.test(form.password))
      e.password = t('Must contain a number');
    if (form.confirm !== form.password)
      e.confirm = t('Passwords do not match');
    if (!form.profileType)
      e.profileType = t('Please select a profile type');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleRegister() {
    if (Platform.OS === 'web') {
      const el = document.activeElement as HTMLElement | null;
      el?.blur();
    } else {
      Keyboard.dismiss();
    }

    clearError();
    if (!validate()) return;
    try {
      await register({
        fullName: form.fullName.trim(),
        email:    form.email.trim().toLowerCase(),
        password: form.password,
        profileType: form.profileType as RegisterProfileType,
      });
    } catch (err: any) {
      if (err?.message === 'EMAIL_NOT_VERIFIED') {
        clearError();
        navigation.navigate('Login', {
          successMessage: 'Account created. Please verify your email before logging in.',
        });
      }
    }
  }

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
          scrollEnabled={keyboardOpen}
        >
          {/* Divider accent */}
          <View style={styles.divider} />

          {/* Title */}
          <Text style={styles.title}>{t('GET STARTED')}</Text>

          {/* API error banner */}
          {!!error && (
            <View style={styles.errorBanner}>
              <Feather name="alert-circle" size={18} color={T.red} style={{ marginHorizontal: 8 }} />
              <Text style={styles.errorBannerText}>{t(error)}</Text>
            </View>
          )}

          {/* Fields */}
          <AuthInput
            label={t('Full Name')}
            placeholder={t('Enter your name')}
            value={form.fullName}
            onChangeText={set('fullName')}
            error={errors.fullName}
          />
          <AuthInput
            label={t('Email')}
            placeholder={t('Enter your email')}
            keyboardType="email-address"
            value={form.email}
            onChangeText={set('email')}
            error={errors.email}
          />
          <AuthInput
            label={t('Password')}
            placeholder={t('Create a password')}
            secureTextEntry={!showPass}
            value={form.password}
            onChangeText={set('password')}
            error={errors.password}
            rightIcon={<Feather name={showPass ? 'eye-off' : 'eye'} size={20} color={T.textMuted} />}
            onRightIconPress={() => setShowPass((p) => !p)}
          />
          <AuthInput
            label={t('Confirm Password')}
            placeholder={t('Re-enter your password')}
            secureTextEntry={!showConfirm}
            value={form.confirm}
            onChangeText={set('confirm')}
            error={errors.confirm}
            rightIcon={<Feather name={showConfirm ? 'eye-off' : 'eye'} size={20} color={T.textMuted} />}
            onRightIconPress={() => setShowConfirm((p) => !p)}
          />

          <Text style={styles.profileLabel}>{t('Profile Type')}</Text>
          <View style={styles.profileGrid}>
            {PROFILE_OPTIONS.map((option) => {
              const selected = form.profileType === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.profileChip, selected && styles.profileChipSelected]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setForm((prev) => ({ ...prev, profileType: option.value }));
                    if (errors.profileType) {
                      setErrors((prev) => ({ ...prev, profileType: undefined }));
                    }
                  }}
                >
                  <Text style={[styles.profileChipText, selected && styles.profileChipTextSelected]}>
                    {t(option.label)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {!!errors.profileType && (
            <Text style={styles.profileError}>{t(errors.profileType)}</Text>
          )}

          {/* Password strength hint */}
          <Text style={styles.hint}>
            {t('Min 8 chars · one uppercase · one number')}
          </Text>

          {/* Submit */}
          <View style={styles.btnGroup}>
            <AuthButton
              label={t('REGISTER')}
              variant="outlined"
              loading={isLoading}
              onPress={handleRegister}
            />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <WaveBackground />

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>{t('Already Account? ')}</Text>
        <TouchableOpacity
          onPress={() => {
            clearError();
            navigation.navigate('Login');
          }}
        >
          <Text style={styles.switchLink}>{t('Login')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
