import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Image,
  Platform,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/types';
import { AuthButton } from '@/shared/components/AuthButton';
import { WaveBackground } from '@/shared/components/WaveBackground';
import { useAuth } from '@/modules/auth/state/auth.context';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  const { theme: T, isDark } = useTheme();
  const { t, isRTL } = useLanguage();
  const { clearError } = useAuth();
  const { width: screenWidth } = Dimensions.get('window');
  const imageSize = Math.min(420, Math.floor(screenWidth * 0.72));

  const styles = React.useMemo(() => StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: T.bg,
    },
    container: {
      flex: 1,
      paddingHorizontal: 24,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 40,
      paddingBottom: 140,
    },
    mascotWrap: {
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
      backgroundColor: 'transparent',
      padding: 0,
      // remove any native shadow/elevation
      shadowColor: 'transparent',
      shadowOpacity: 0,
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 0,
      elevation: 0,
    },
    mascot: {
      fontSize: 140,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
      textAlign: 'center',
      marginBottom: 6,
    },
    // no footer text; only WaveBackground will render
    subtitle: {
      fontSize: 14,
      fontWeight: '500',
      fontFamily: 'Poppins_500Medium',
      color: T.textSub,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 28,
    },
    btnGroup: {
      width: '100%',
    },
    btnSep: {
      height: 16,
    },
    waveBg: {
      position: 'absolute',
      bottom: 0,
      left: -4,
      right: -4,
      height: 130,
      backgroundColor: T.green,
      borderTopLeftRadius: 9999,
      borderTopRightRadius: 9999,
      opacity: 0.15,
    },
  }), [T]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={T.bg} />

      <View style={styles.container}>
        {/* Mascot */}
        <View style={styles.mascotWrap}>
          {/* Local welcome image (place image 2 (2).png in mobile/assets/) */}
          <Image
            source={require('../../../../../assets/Logo/image 2 (2).png')}
            style={{ width: imageSize, height: imageSize, resizeMode: 'contain' }}
          />
        </View>

        {/* Heading */}
        <Text style={styles.title}>{t('Salut , Bienvenue!')}</Text>
        <Text style={styles.subtitle}>{t('Connectez-vous pour continuer')}</Text>

        {/* CTA Buttons */}
        <View style={styles.btnGroup}>
          <AuthButton
            label={t('Se connecter')}
            variant="filled"
            onPress={() => navigation.navigate('Login')}
          />
          <View style={styles.btnSep} />
          <AuthButton
            label={t('Creer un compte')}
            variant="outlined"
            onPress={() => navigation.navigate('Register')}
          />
        </View>
      </View>


      <WaveBackground />
    </SafeAreaView>
  );
}
