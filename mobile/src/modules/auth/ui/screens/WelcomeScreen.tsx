import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/types';
import { AuthButton } from '@/shared/components/AuthButton';
import { Colors, Font, Spacing } from '@/shared/utils/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />

      <View style={styles.container}>
        {/* Mascot */}
        <View style={styles.mascotWrap}>
          <MaterialCommunityIcons name={"barley" as any} size={80} color={Colors.green} />
        </View>

        {/* Heading */}
        <Text style={styles.title}>Salut, Bienvenue!</Text>
        <Text style={styles.subtitle}>
          Connectez-vous{'\n'}pour continuer
        </Text>

        {/* CTA Buttons */}
        <View style={styles.btnGroup}>
          <AuthButton
            label="Se connecter"
            variant="filled"
            onPress={() => navigation.navigate('Login')}
          />
          <View style={styles.btnSep} />
          <AuthButton
            label="Créer un compte"
            variant="outlined"
            onPress={() => navigation.navigate('Register')}
          />
        </View>
      </View>

      {/* Bottom wave decoration */}
      <View style={styles.waveBg} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascotWrap: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(139,195,74,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    // subtle shadow
    ...Platform.select({
      ios: {
        shadowColor: Colors.green,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: `0px 8px 20px rgba(139, 195, 74, 0.18)`,
      },
    }),
  },
  mascot: {
    fontSize: 80,
  },
  title: {
    fontSize: 34,
    fontWeight: Font.semibold,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: Font.medium,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: Spacing.xxl,
  },
  btnGroup: {
    width: '100%',
  },
  btnSep: {
    height: Spacing.md,
  },
  waveBg: {
    position: 'absolute',
    bottom: 0,
    left: -4,
    right: -4,
    height: 130,
    backgroundColor: Colors.green,
    borderTopLeftRadius: 9999,
    borderTopRightRadius: 9999,
    opacity: 0.15,
  },
});
