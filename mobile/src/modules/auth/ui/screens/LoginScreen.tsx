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
  Image,
  Dimensions,
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
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation, route }: Props) {
  const { login, isLoading, error, clearError } = useAuth();
  const [success, setSuccess] = useState<string | null>(null);
  const { theme: T, isDark } = useTheme();
  const { t, isRTL } = useLanguage();
  const { width: screenWidth } = Dimensions.get('window');
  const imageSize = Math.min(420, Math.floor(screenWidth * 0.72));

  const styles = React.useMemo(() => StyleSheet.create({
    safe:  { flex: 1, backgroundColor: T.bg },
    flex:  { flex: 1 },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingBottom: 40,
      paddingTop: 12,
    },

    // Header area
    header: { alignItems: 'center', marginBottom: 6 },
    mascot: { fontSize: 80, marginBottom: 4 },
    divider: {
      width: '90%',
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.35)',
    },

    title: {
      fontSize: 28,
      fontWeight: '600',
      fontFamily: 'Poppins_600SemiBold',
      color: T.text,
      textAlign: 'center',
      marginBottom: 6,
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
    errorBannerText: {
      color: T.red,
      fontSize: 13,
      fontWeight: '500',
      fontFamily: 'Poppins_500Medium',
    },

    // Success banner
    successBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#E8F5E9',
      borderWidth: 1,
      borderColor: '#8BC34A',
      borderRadius: Radius.md,
      padding: 12,
      marginBottom: 12,
    },
    successBannerText: {
      color: '#388E3C',
      fontSize: 13,
      fontWeight: '500',
      fontFamily: 'Poppins_500Medium',
    },

    // Forgot
    // Forgot
    forgotWrap: { alignSelf: isRTL ? 'flex-end' : 'flex-start', marginBottom: 24 },
    forgot: {
      fontSize: 14,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
    },

    btnGroup: { marginBottom: 24 },

    // Switch
    switchRow: {
      marginTop: 20,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 5,
    },

    switchText: {
      fontSize: 16,
      fontWeight: '500',
      fontFamily: 'Poppins_500Medium',
      color: '#FFFFFF',
    },
    switchLink: {
      fontSize: 16,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: isDark ? T.green : '#343831',
    },

    eyeIcon: { fontSize: 18 },
  }), [T, isRTL]);

  useFocusEffect(
    React.useCallback(() => {
      clearError();
      if (route.params?.successMessage) {
        setSuccess(route.params.successMessage);
        navigation.setParams({ successMessage: undefined });
      } else {
        setSuccess(null);
      }
      return undefined;
    }, [clearError, route.params?.successMessage]),
  );
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass]  = useState(false);

  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  function validate(): boolean {
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = t('Email is required');
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = t('Invalid email');
    if (!password) newErrors.password = t('Password is required');
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
          {/* Header */}
          <View style={styles.header}>
            {/* Use same welcome image as WelcomeScreen */}
            <Image
              source={require('../../../../../assets/Logo/image 2 (2).png')}
              style={{ width: imageSize, height: imageSize, resizeMode: 'contain', marginBottom: 4 }}
            />
              <View style={styles.divider} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{t('Login')}</Text>

          {/* Success banner */}
          {!!success && (
            <View style={styles.successBanner}>
              <Feather name="check-circle" size={18} color="#388E3C" style={{ marginHorizontal: 8 }} />
              <Text style={styles.successBannerText}>{t(success)}</Text>
            </View>
          )}

          {/* API error banner */}
          {!!error && (
            <View style={styles.errorBanner}>
              <Feather name="alert-circle" size={18} color={T.red} style={{ marginHorizontal: 8 }} />
              <Text style={styles.errorBannerText}>{t(error)}</Text>
            </View>
          )}

          {/* Fields */}
          <AuthInput
            label={t('Email')}
            placeholder={t('Enter your email')}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            themeColors={T}
          />
          <AuthInput
            label={t('Password')}
            placeholder={t('Enter your password')}
            secureTextEntry={!showPass}
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            rightIcon={<Feather name={showPass ? 'eye-off' : 'eye'} size={20} color={T.textMuted} />}
            onRightIconPress={() => setShowPass((p) => !p)}
            themeColors={T}
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
            <Text style={styles.forgot}>{t('Forgot Password?')}</Text>
          </TouchableOpacity>

          {/* Submit */}
          <View style={styles.btnGroup}>
            <AuthButton
              label={t('LOGIN')}
              variant="outlined"
              loading={isLoading}
              onPress={handleLogin}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>{t('No Account? ')}</Text>
            <TouchableOpacity
              onPress={() => {
                clearError();
                navigation.navigate('Register');
              }}
            >
              <Text style={styles.switchLink}>{t('Register')}</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <WaveBackground color={isDark ? '#1E3516' : '#8BC34A'} />
    </SafeAreaView>
  );
}
