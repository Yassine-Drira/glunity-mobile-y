import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../../../navigation/types';
import { WaveBackground } from '../../../../shared/components/WaveBackground';
import { Radius, Font } from '../../../../shared/utils/theme';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import { useAuth } from '../../state/auth.context';
import { Feather, FontAwesome } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

type Props = NativeStackScreenProps<AuthStackParamList, 'RegisterMethods'>;

const GoogleIconSvg = ({ size = 22 }: { size?: number }) => (
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

export default function RegisterMethodsScreen({ navigation }: Props) {
  const { oauthLogin, clearError } = useAuth();
  const { theme: T, isDark } = useTheme();
  const { t, isRTL } = useLanguage();
  const { width: screenWidth } = Dimensions.get('window');

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
    safe: {
      flex: 1,
      backgroundColor: T.bg,
    },
    flex: {
      flex: 1,
    },
    scroll: {
      flexGrow: 1,
      paddingBottom: 160,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 4,
      justifyContent: 'space-between',
    },
    backBtn: {
      padding: 8,
      borderRadius: 12,
      backgroundColor: T.surface,
      borderWidth: 1,
      borderColor: T.border,
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
      justifyContent: 'center',
    },
    titleSection: {
      marginBottom: 36,
      alignItems: 'center',
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: T.textSub,
      fontFamily: 'Poppins_500Medium',
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 12,
    },
    methodsContainer: {
      gap: 16,
      width: '100%',
    },
    btn: {
      height: 54,
      borderRadius: Radius.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
      borderWidth: 1.5,
      width: '100%',
      gap: 16,
    },
    btnText: {
      fontSize: 16,
      fontWeight: Font.bold,
      fontFamily: 'Poppins_700Bold',
    },
    // Google Styling (Premium Glassmorphism Card)
    googleBtn: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.75)',
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
      shadowColor: T.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 2,
    },
    googleText: {
      color: T.text,
    },
    // Facebook Styling (Premium Brand Blue Glass)
    facebookBtn: {
      backgroundColor: '#1877F2',
      borderColor: '#1877F2',
      shadowColor: '#1877F2',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 3,
    },
    facebookText: {
      color: T.white,
    },
    // Email Styling (Glunity Green Brand Glass)
    emailBtn: {
      backgroundColor: T.green,
      borderColor: T.green,
      shadowColor: T.green,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 3,
    },
    emailText: {
      color: T.white,
    },
    switchRow: {
      position: 'absolute',
      bottom: 40,
      alignSelf: 'center',
      flexDirection: 'row',
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
  }), [T, isDark]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={T.bg} />
      
      <ScrollView 
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Feather name={isRTL ? 'arrow-right' : 'arrow-left'} size={20} color={T.text} />
          </TouchableOpacity>
          {/* Spacer */}
          <View style={{ width: 40 }} />
        </View>

        {/* Main Container */}
        <View style={styles.content}>
          {/* Title Block */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>{t('Créer un compte')}</Text>
            <Text style={styles.subtitle}>
              {t('Rejoignez la communauté Glunity et commencez votre parcours sans gluten.')}
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.methodsContainer}>
            {/* Google Sign-up */}
            <TouchableOpacity
              style={[styles.btn, styles.googleBtn]}
              activeOpacity={0.8}
              onPress={() => handleOAuthLogin('google')}
            >
              <GoogleIconSvg size={22} />
              <Text style={[styles.btnText, styles.googleText]}>
                {t("S'inscrire avec Google")}
              </Text>
            </TouchableOpacity>

            {/* Facebook Sign-up */}
            <TouchableOpacity
              style={[styles.btn, styles.facebookBtn]}
              activeOpacity={0.8}
              onPress={() => handleOAuthLogin('facebook')}
            >
              <FontAwesome name="facebook" size={22} color={T.white} />
              <Text style={[styles.btnText, styles.facebookText]}>
                {t("S'inscrire avec Facebook")}
              </Text>
            </TouchableOpacity>

            {/* Email Sign-up */}
            <TouchableOpacity
              style={[styles.btn, styles.emailBtn]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Register')}
            >
              <Feather name="mail" size={22} color={T.white} />
              <Text style={[styles.btnText, styles.emailText]}>
                {t("S'inscrire avec un e-mail")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Wave Background + Footer Login Redirect */}
      <WaveBackground color={isDark ? '#1E3516' : '#8BC34A'} />
      <View style={styles.switchRow}>
        <Text style={styles.switchText}>{t('Déjà un compte ? ')}</Text>
        <TouchableOpacity
          onPress={() => {
            navigation.navigate('Login');
          }}
        >
          <Text style={styles.switchLink}>{t('Connexion')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
