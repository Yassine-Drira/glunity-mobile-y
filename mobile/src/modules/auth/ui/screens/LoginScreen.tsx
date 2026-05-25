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
import { useFocusEffect } from '@react-navigation/native';
import type { AuthStackParamList } from '../../../../navigation/types';
import { AuthInput } from '../../../../shared/components/AuthInput';
import { AuthButton } from '../../../../shared/components/AuthButton';
import { WaveBackground } from '../../../../shared/components/WaveBackground';
import { Colors, Font, Spacing, Radius } from '../../../../shared/utils/theme';
import { useAuth } from '../../state/auth.context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login, isLoading, error, clearError } = useAuth();

  useFocusEffect(
    React.useCallback(() => {
      clearError();
      return undefined;
    }, [clearError]),
  );
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass]  = useState(false);

  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  function validate(): boolean {
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email';
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleLogin() {
    clearError();
    if (!validate()) return;
    try {
      await login({ email: email.trim().toLowerCase(), password });
      // Navigation handled by RootNavigator after auth state change
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
          {/* Header */}
          <View style={styles.header}>
            <MaterialCommunityIcons name="shield-check-outline" size={80} color={Colors.green} />
            <View style={styles.divider} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Login</Text>

          {/* API error banner */}
          {!!error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          {/* Fields */}
          <AuthInput
            label="Email"
            placeholder="Enter your email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
          />
          <AuthInput
            label="Password"
            placeholder="Enter your password"
            secureTextEntry={!showPass}
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            rightIcon={<Feather name={showPass ? 'eye-off' : 'eye'} size={20} color={Colors.muted} />}
            onRightIconPress={() => setShowPass((p) => !p)}
          />

          {/* Forgot password */}
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('ForgotPassword', {
                email: email.trim().toLowerCase() || undefined,
              })
            }
            style={styles.forgotWrap}
          >
            <Text style={styles.forgot}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Submit */}
          <View style={styles.btnGroup}>
            <AuthButton
              label="LOGIN"
              variant="outlined"
              loading={isLoading}
              onPress={handleLogin}
            />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>No Account? </Text>
        <TouchableOpacity
          onPress={() => {
            clearError();
            navigation.navigate('Register');
          }}
        >
          <Text style={styles.switchLink}>Register</Text>
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
    paddingBottom: 120,
    paddingTop: Spacing.lg,
  },

  // Header area
  header: { alignItems: 'center', marginBottom: Spacing.lg },
  mascot: { fontSize: 80, marginBottom: Spacing.md },
  divider: {
    width: '90%',
    height: 1,
    backgroundColor: Colors.white,
  },

  title: {
    fontSize: 28,
    fontWeight: Font.semibold,
    color: Colors.dark,
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
  errorBannerText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: Font.medium,
  },

  // Forgot
  forgotWrap: { alignSelf: 'flex-start', marginBottom: Spacing.lg },
  forgot: {
    fontSize: 14,
    fontWeight: Font.bold,
    color: Colors.dark,
  },

  btnGroup: { marginBottom: Spacing.lg },

  // Switch
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
  switchText: {
    fontSize: 16,
    fontWeight: Font.medium,
    color: Colors.white,
  },
  switchLink: {
    fontSize: 16,
    fontWeight: Font.bold,
    color: Colors.dark,
  },

  eyeIcon: { fontSize: 18 },

});
