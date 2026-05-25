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
import { WaveBackground } from '@/shared/components/WaveBackground';
import { Colors, Font, Spacing, Radius } from '@/shared/utils/theme';
import authApi from '../../api/auth.api';
import { Feather } from '@expo/vector-icons';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

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
  const [email, setEmail]     = useState(initialEmail ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleSubmit() {
    setError('');
    const trimmed = email.trim();
    if (!trimmed || !/\S+@\S+\.\S+/.test(trimmed)) {
      setError('Please enter a valid email address');
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
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Illustration */}
        <View style={styles.illustrationBox}>
          <Feather name="mail" size={40} color={Colors.green} />
        </View>

        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>
          Enter your email address and we'll send you a password reset link.
        </Text>

        {/* Error */}
        {!!error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <AuthInput
          label="Email"
          placeholder="Enter your email"
          keyboardType="email-address"
          autoComplete="off"
          value={email}
          onChangeText={setEmail}
        />

        <AuthButton
          label="Submit"
          variant="filled"
          loading={loading}
          onPress={handleSubmit}
          containerStyle={{ marginTop: Spacing.sm }}
        />

        <TouchableOpacity onPress={onBack} style={styles.backWrap} activeOpacity={0.7}>
          <Text style={styles.backText}>← Back to Login</Text>
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
  return (
    <View style={[styles.scroll, styles.centeredContent]}>
      <View style={styles.mailboxBox}>
        <Feather name="send" size={60} color={Colors.green} />
      </View>

      <Text style={styles.title}>Check Your Inbox</Text>
      <Text style={styles.sentBody}>
        A password reset link has been sent to{'\n'}
        <Text style={styles.sentEmail}>{email}</Text>
      </Text>
      <Text style={styles.sentHint}>
        The link expires in 15 minutes. Check your spam folder if you don't see it.
      </Text>

      <AuthButton
        label="Back to Login"
        variant="filled"
        onPress={onBackToLogin}
        containerStyle={{ marginTop: Spacing.xl, width: '100%' }}
      />
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ForgotPasswordScreen({ navigation, route }: Props) {
  const initialEmail = route.params?.email ?? '';
  const [step, setStep]           = useState<'email' | 'sent'>('email');
  const [sentEmail, setSentEmail] = useState('');

  function handleSent(email: string) {
    setSentEmail(email);
    setStep('sent');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />

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
    paddingTop:        Spacing.xxl,
    paddingBottom:     140,
  },
  centeredContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  illustrationBox: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.xl,
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  illustrationEmoji: { fontSize: 52 },

  mailboxBox: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  mailboxEmoji: { fontSize: 80 },

  title: {
    fontSize: 24,
    fontWeight: Font.bold,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.muted,
    fontWeight: Font.regular,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },

  errorBanner: {
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: { color: Colors.error, fontSize: 13 },

  backWrap: { alignSelf: 'center', marginTop: Spacing.lg },
  backText: {
    fontSize: 14,
    fontWeight: Font.medium,
    color: Colors.muted,
  },

  // Sent state
  sentBody: {
    fontSize: 15,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.sm,
  },
  sentEmail: { fontWeight: Font.bold, color: Colors.dark },
  sentHint: {
    fontSize: 12,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },

});
