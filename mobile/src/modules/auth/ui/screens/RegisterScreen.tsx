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
import { Colors, Font, Spacing, Radius } from '../../../../shared/utils/theme';
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

  useFocusEffect(
    React.useCallback(() => {
      clearError();
      return undefined;
    }, [clearError]),
  );

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
      e.fullName = 'Full name must be at least 2 characters';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email))
      e.email = 'Valid email is required';
    if (form.password.length < 8)
      e.password = 'Password must be at least 8 characters';
    else if (!/[A-Z]/.test(form.password))
      e.password = 'Must contain an uppercase letter';
    else if (!/[0-9]/.test(form.password))
      e.password = 'Must contain a number';
    if (form.confirm !== form.password)
      e.confirm = 'Passwords do not match';
    if (!form.profileType)
      e.profileType = 'Please select a profile type';
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
    } catch {
      // error already in context
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Divider accent */}
          <View style={styles.divider} />

          {/* Title */}
          <Text style={styles.title}>GET STARTED</Text>
          <Text style={styles.subtitle}>Create your free account</Text>

          {/* API error banner */}
          {!!error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          {/* Fields */}
          <AuthInput
            label="Full Name"
            placeholder="Enter your name"
            value={form.fullName}
            onChangeText={set('fullName')}
            error={errors.fullName}
          />
          <AuthInput
            label="Email"
            placeholder="Enter your email"
            keyboardType="email-address"
            value={form.email}
            onChangeText={set('email')}
            error={errors.email}
          />
          <AuthInput
            label="Password"
            placeholder="Create a password"
            secureTextEntry={!showPass}
            value={form.password}
            onChangeText={set('password')}
            error={errors.password}
            rightIcon={<Feather name={showPass ? 'eye-off' : 'eye'} size={20} color={Colors.muted} />}
            onRightIconPress={() => setShowPass((p) => !p)}
          />
          <AuthInput
            label="Confirm Password"
            placeholder="Re-enter your password"
            secureTextEntry={!showConfirm}
            value={form.confirm}
            onChangeText={set('confirm')}
            error={errors.confirm}
            rightIcon={<Feather name={showConfirm ? 'eye-off' : 'eye'} size={20} color={Colors.muted} />}
            onRightIconPress={() => setShowConfirm((p) => !p)}
          />

          <Text style={styles.profileLabel}>Profile Type</Text>
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
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {!!errors.profileType && (
            <Text style={styles.profileError}>{errors.profileType}</Text>
          )}

          {/* Password strength hint */}
          <Text style={styles.hint}>
            Min 8 chars · one uppercase · one number
          </Text>

          {/* Submit */}
          <View style={styles.btnGroup}>
            <AuthButton
              label="REGISTER"
              variant="outlined"
              loading={isLoading}
              onPress={handleRegister}
            />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>Already Account? </Text>
        <TouchableOpacity
          onPress={() => {
            clearError();
            navigation.navigate('Login');
          }}
        >
          <Text style={styles.switchLink}>Login</Text>
        </TouchableOpacity>
      </View>

      <WaveBackground />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: Colors.bg },
  flex:  { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 130,
    paddingTop: Spacing.xl,
  },

  divider: {
    width: '90%',
    height: 1,
    backgroundColor: Colors.white,
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },

  title: {
    fontSize: 22,
    fontWeight: Font.bold,
    color: Colors.dark,
    textAlign: 'center',
    letterSpacing: 1.5,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.muted,
    fontWeight: Font.medium,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },

  // Error banner
  errorBanner: {
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorBannerText: { color: Colors.error, fontSize: 13, fontWeight: Font.medium },

  hint: {
    fontSize: 12,
    color: Colors.muted,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },

  profileLabel: {
    fontSize: 13,
    fontWeight: Font.medium,
    color: Colors.muted,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
    letterSpacing: 0.3,
  },
  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.md,
  },
  profileChip: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.md,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  profileChipSelected: {
    borderColor: Colors.green,
    backgroundColor: Colors.greenLight,
  },
  profileChipText: {
    fontSize: 13,
    color: Colors.dark,
    fontWeight: Font.medium,
  },
  profileChipTextSelected: {
    color: Colors.green,
    fontWeight: Font.bold,
  },
  profileError: {
    fontSize: 12,
    color: Colors.error,
    marginTop: -4,
    marginBottom: Spacing.sm,
  },

  btnGroup: { marginBottom: Spacing.lg },

  switchRow: {
    position: 'absolute',
    bottom: 18,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  switchText: { fontSize: 16, fontWeight: Font.medium, color: Colors.white },
  switchLink: { fontSize: 16, fontWeight: Font.bold, color: Colors.dark },

  eye: { fontSize: 18 },

});
