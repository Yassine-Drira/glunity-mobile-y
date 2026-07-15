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
  Modal,
  TextInput,
  ActivityIndicator,
  Keyboard,
  Alert,
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
import { Feather, MaterialCommunityIcons, AntDesign, FontAwesome } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const GoogleIconSvg = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </Svg>
);

export default function LoginScreen({ navigation, route }: Props) {
  const { login, verify2Fa, isLoading, error, clearError, oauthLogin } = useAuth();
  const [success, setSuccess] = useState<string | null>(null);
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [twoFactorUserId, setTwoFactorUserId] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const { theme: T, isDark } = useTheme();
  const { t, isRTL } = useLanguage();
  const { width: screenWidth } = Dimensions.get('window');
  const imageSize = Math.min(420, Math.floor(screenWidth * 0.72));

  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    clearError();
    
    const performOAuthLogin = async (token: string) => {
      try {
        const res = await oauthLogin(provider, token);
        if (res?.isNewUser) {
          navigation.navigate('Register', {
            oauthSignupToken: res.oauthSignupToken,
            prefill: res.prefill,
          });
        }
      } catch (err) {
        console.warn('OAuth login failed:', err);
        if (Platform.OS === 'web') {
          window.alert(t('OAuth login failed. Please try again.'));
        } else {
          Alert.alert(t('Error'), t('OAuth login failed. Please try again.'));
        }
      }
    };

    if (Platform.OS === 'web') {
      const width = 550;
      const height = 650;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      
      let authUrl = '';
      if (provider === 'google') {
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=258566688549-g08077n4t6ivao0kla5c2kgb5iq92t4g.apps.googleusercontent.com&redirect_uri=${window.location.origin}&response_type=token%20id_token&scope=openid%20profile%20email&nonce=glunity_${Math.floor(Math.random() * 100000)}&prompt=select_account`;
      } else {
        authUrl = `https://www.facebook.com/v12.0/dialog/oauth?client_id=1591511932575000&redirect_uri=${window.location.origin}&response_type=token&scope=email,public_profile`;
      }

      const popup = window.open(
        authUrl,
        provider === 'google' ? 'Google Sign In' : 'Facebook Sign In',
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
      );

      if (!popup) {
        window.alert(t('Please disable your popup blocker to authenticate.'));
        return;
      }

      const interval = setInterval(() => {
        try {
          if (!popup || popup.closed) {
            clearInterval(interval);
            return;
          }

          if (popup.location.origin === window.location.origin) {
            const hash = popup.location.hash;
            if (hash) {
              clearInterval(interval);
              popup.close();
              const params = new URLSearchParams(hash.substring(1));
              const tokenValue = provider === 'google' ? params.get('id_token') : params.get('access_token');
              if (tokenValue) {
                performOAuthLogin(tokenValue);
              } else {
                console.warn('No token found in redirect hash');
              }
            }
          }
        } catch (e) {
          // Ignore cross-origin error until redirect completes
        }
      }, 500);
      return;
    }

    // Native Mock Fallback
    if (__DEV__) {
      Alert.alert(
        t('Dev Mock OAuth'),
        t('Choose a mock profile to sign in or register:'),
        [
          { text: t('Cancel'), style: 'cancel' },
          {
            text: t('Existing User (testuser)'),
            onPress: () => performOAuthLogin('mock_testuser'),
          },
          {
            text: t('New Random User'),
            onPress: () => performOAuthLogin('mock_newuser_' + Math.floor(Math.random() * 10000)),
          },
        ]
      );
    } else {
      Alert.alert(t('Info'), t('Social logins are disabled in this environment.'));
    }
  };

  const styles = React.useMemo(() => StyleSheet.create({
    safe:  { flex: 1, backgroundColor: T.bg },
    flex:  { flex: 1, marginBottom: 125 },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingBottom: 24,
      paddingTop: 12,
    },

    // Header area
    header: { alignItems: 'center', marginBottom: 6, marginTop: -20 },
    mascot: { fontSize: 80, marginBottom: 4 },
    divider: {
      width: '90%',
      height: 1,
      backgroundColor: T.border,
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
    forgotWrap: { alignSelf: isRTL ? 'flex-end' : 'flex-start', marginBottom: 16 },
    forgot: {
      fontSize: 14,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
    },

    btnGroup: { marginBottom: 16 },

    // Social Logins
    socialContainer: { marginTop: 10, marginBottom: 8 },
    socialDividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    socialDividerLine: { flex: 1, height: 1, backgroundColor: T.border },
    socialDividerText: { marginHorizontal: 12, fontSize: 13, color: T.textSub, fontFamily: 'Poppins_500Medium' },
    socialButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
    socialBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderRadius: 14,
      paddingVertical: 14,
      gap: 12,
    },
    socialBtnText: {
      fontSize: 15,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
    },

    // Switch
    switchRow: {
      position: 'absolute',
      bottom: 40,
      left: 0,
      right: 0,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },

    switchText: {
      fontSize: 16,
      fontWeight: '500',
      fontFamily: 'Poppins_500Medium',
      color: 'rgba(255, 255, 255, 0.85)',
    },
    switchLink: {
      fontSize: 16,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: '#FFFFFF',
      textDecorationLine: 'underline',
    },

    eyeIcon: { fontSize: 18 },
    
    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
    modalContent: {
      width: '92%', backgroundColor: T.surface, borderRadius: 24, padding: 24,
      shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 16,
    },
    modalHeader:  { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle:   { fontSize: 18, fontWeight: '700', color: T.text, fontFamily: 'Poppins_700Bold', textAlign: isRTL ? 'right' : 'left' },
    modalErrorBanner: {
      flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, backgroundColor: T.errorLight,
      borderColor: T.red, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 14,
    },
    modalErrorText:   { flex: 1, fontSize: 13, color: T.red, fontFamily: 'Poppins_400Regular', textAlign: isRTL ? 'right' : 'left' },
    modalDesc: { fontSize: 13, color: T.textMuted, marginBottom: 16, fontFamily: 'Poppins_400Regular', textAlign: isRTL ? 'right' : 'left', lineHeight: 20 },
    modalForm:    { gap: 14 },
    inputLabel:   { fontSize: 12, fontWeight: '600', color: T.textSub, fontFamily: 'Poppins_600SemiBold', textAlign: isRTL ? 'right' : 'left' },
    modalInput:   {
      borderWidth: 1.5, borderColor: T.inputBorder, borderRadius: 12,
      paddingVertical: 12, paddingHorizontal: 14,
      fontSize: 20, color: T.text, backgroundColor: T.inputBg, fontFamily: 'Poppins_600SemiBold',
      textAlign: 'center', letterSpacing: 4,
    },
    modalBtn:     { backgroundColor: T.green, borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    modalBtnText: { fontSize: 15, color: T.white, fontWeight: '700', fontFamily: 'Poppins_700Bold' },
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
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  React.useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

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
      const res = await login({ email: email.trim().toLowerCase(), password });
      if (res && res.twoFactorRequired) {
        setTwoFactorUserId(res.userId);
        setTwoFactorError(null);
        setTwoFactorCode('');
        setShowTwoFactorModal(true);
      }
    } catch {
      // error already in context
    }
  }

  async function handleVerify2Fa() {
    if (!twoFactorCode.trim() || twoFactorCode.trim().length !== 6) {
      setTwoFactorError(t('Verification code must be 6 digits'));
      return;
    }
    setTwoFactorError(null);
    setTwoFactorLoading(true);
    try {
      await verify2Fa(twoFactorUserId!, twoFactorCode.trim());
      setShowTwoFactorModal(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('Verification failed. Please try again.');
      setTwoFactorError(msg);
    } finally {
      setTwoFactorLoading(false);
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
          scrollEnabled={false}
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

          {/* Social Logins */}
          <View style={styles.socialContainer}>
            <View style={styles.socialDividerRow}>
              <View style={styles.socialDividerLine} />
              <Text style={styles.socialDividerText}>{t('Or continue with')}</Text>
              <View style={styles.socialDividerLine} />
            </View>

            <View style={styles.socialButtonsRow}>
              {/* Google Button */}
              <TouchableOpacity
                style={[
                  styles.socialBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.75)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
                    shadowColor: T.shadow,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.1,
                    shadowRadius: 10,
                    elevation: 2,
                  }
                ]}
                activeOpacity={0.8}
                onPress={() => handleOAuthLogin('google')}
              >
                <GoogleIconSvg size={20} />
                <Text style={[styles.socialBtnText, { color: T.text }]}>{t('Google')}</Text>
              </TouchableOpacity>

              {/* Facebook Button */}
              <TouchableOpacity
                style={[
                  styles.socialBtn,
                  {
                    backgroundColor: '#1877F2',
                    borderColor: '#1877F2',
                    shadowColor: '#1877F2',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.2,
                    shadowRadius: 10,
                    elevation: 3,
                  }
                ]}
                activeOpacity={0.8}
                onPress={() => handleOAuthLogin('facebook')}
              >
                <FontAwesome name="facebook" size={20} color="#FFFFFF" />
                <Text style={[styles.socialBtnText, { color: '#FFFFFF' }]}>{t('Facebook')}</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {!keyboardOpen && (
        <>
          <WaveBackground color={isDark ? '#1E3516' : '#8BC34A'} />
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>{t('No Account? ')}</Text>
            <TouchableOpacity
              onPress={() => {
                clearError();
                navigation.navigate('RegisterMethods');
              }}
            >
              <Text style={styles.switchLink}>{t('Register')}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Two-Factor Authentication Modal */}
      <Modal
        visible={showTwoFactorModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTwoFactorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('SECURITY_VERIFICATION')}</Text>
              <TouchableOpacity onPress={() => setShowTwoFactorModal(false)}>
                <MaterialCommunityIcons name="close" size={22} color={T.text} />
              </TouchableOpacity>
            </View>

            {!!twoFactorError && (
              <View style={styles.modalErrorBanner}>
                <MaterialCommunityIcons name="alert-circle" size={16} color={T.red} />
                <Text style={styles.modalErrorText}>{twoFactorError}</Text>
              </View>
            )}

            <Text style={styles.modalDesc}>
              {t('ENTER_2FA_CODE')}
            </Text>

            <View style={styles.modalForm}>
              <Text style={styles.inputLabel}>{t('VERIFICATION_CODE')}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="123456"
                placeholderTextColor={T.textMuted}
                value={twoFactorCode}
                onChangeText={setTwoFactorCode}
                keyboardType="number-pad"
                maxLength={6}
              />

              <TouchableOpacity
                style={[styles.modalBtn, twoFactorLoading && { opacity: 0.75 }]}
                onPress={handleVerify2Fa}
                disabled={twoFactorLoading}
              >
                {twoFactorLoading ? (
                  <ActivityIndicator color={T.white} size="small" />
                ) : (
                  <Text style={styles.modalBtnText}>{t('VERIFY_CODE')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
