import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/modules/auth/navigation/types';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { useAuth } from '@/modules/auth/state/auth.context';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = NativeStackScreenProps<AppStackParamList, 'Privacy'>;

const { width } = Dimensions.get('window');

const F = {
  regular: 'Poppins_400Regular',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
};

// ── SettingItem (Internal Helper) ─────────────────────────────────────────────
interface SettingItemProps {
  iconName: string;
  title: string;
  subtitle?: string;
  showChevron?: boolean;
  showSwitch?: boolean;
  isLast?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  onPress?: () => void;
  theme: ReturnType<typeof useTheme>['theme'];
}

function SettingItem({
  iconName,
  title,
  subtitle,
  showChevron = true,
  showSwitch = false,
  isLast = false,
  switchValue,
  onSwitchChange,
  onPress,
  theme: C,
}: SettingItemProps) {
  const { isRTL } = useLanguage();
  const s = useMemo(() => StyleSheet.create({
    row: { 
      flexDirection: isRTL ? 'row-reverse' : 'row', 
      alignItems: 'center', 
      paddingVertical: 16, 
      paddingHorizontal: 20, 
      backgroundColor: C.surface 
    },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
    rowIcon: { width: 32, alignItems: isRTL ? 'flex-end' : 'flex-start' },
    rowContent: { flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start', paddingHorizontal: 8 },
    rowTitle: { fontFamily: F.semibold, fontSize: 15, color: C.text, textAlign: isRTL ? 'right' : 'left' },
    rowSub: { fontFamily: F.regular, fontSize: 12, color: C.muted, marginTop: 2, textAlign: isRTL ? 'right' : 'left' },
    rowRight: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' },
  }), [C, isRTL]);

  return (
    <TouchableOpacity
      style={[s.row, !isLast && s.rowBorder]}
      onPress={showSwitch ? undefined : onPress}
      activeOpacity={showSwitch ? 1 : 0.7}
    >
      <View style={s.rowIcon}>
        <MaterialCommunityIcons name={iconName as any} size={18} color={C.red} />
      </View>

      <View style={s.rowContent}>
        <Text style={s.rowTitle}>{title}</Text>
        {subtitle ? <Text style={s.rowSub}>{subtitle}</Text> : null}
      </View>

      {showSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: C.switchTrack, true: C.green }}
          thumbColor={C.white}
        />
      ) : (
        <View style={s.rowRight}>
          {showChevron ? <MaterialCommunityIcons name={isRTL ? "chevron-left" : "chevron-right"} size={18} color={C.mutedLight} /> : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── PrivacyScreen ──────────────────────────────────────────────────────────────
export default function PrivacyScreen({ navigation }: Props) {
  const { user, updateProfile } = useAuth();
  const { theme: C } = useTheme();
  const { t, isRTL } = useLanguage();

  // Local mirror states
  const [twoFactor, setTwoFactor] = useState(user?.twoFactorEnabled ?? false);
  const [dataSharing, setDataSharing] = useState(user?.dataSharingEnabled ?? true);
  const [publicProfile, setPublicProfile] = useState(user?.publicProfileEnabled ?? false);

  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Sync state if user context updates
  useEffect(() => {
    if (user) {
      setTwoFactor(user.twoFactorEnabled ?? false);
      setDataSharing(user.dataSharingEnabled ?? true);
      setPublicProfile(user.publicProfileEnabled ?? false);
    }
  }, [user]);

  const handleTwoFactorToggle = async (val: boolean) => {
    setTwoFactor(val);
    try {
      await AsyncStorage.setItem('@pref_2fa', String(val));
      await updateProfile({ twoFactorEnabled: val });
      Alert.alert(
        val ? t('2FA Enabled') : t('2FA Disabled'),
        val
          ? t('Two-factor authentication setup initialized. A verification code will be requested on your next login.')
          : t('Two-factor authentication disabled.')
      );
    } catch (e) {
      console.error('Error updating 2FA:', e);
      Alert.alert(t('Error'), t('Failed to update two-factor setting.'));
    }
  };

  const handleDataSharingToggle = async (val: boolean) => {
    setDataSharing(val);
    try {
      await AsyncStorage.setItem('@pref_data_sharing', String(val));
      await updateProfile({ dataSharingEnabled: val });
    } catch (e) {
      console.error('Error updating data sharing:', e);
    }
  };

  const handlePublicProfileToggle = async (val: boolean) => {
    setPublicProfile(val);
    try {
      await AsyncStorage.setItem('@pref_public_profile', String(val));
      await updateProfile({ publicProfileEnabled: val });
    } catch (e) {
      console.error('Error updating public profile:', e);
    }
  };

  const s = useMemo(() => StyleSheet.create({
    scroll:       { paddingHorizontal: 16, paddingTop: 12 },
    sectionLabel: {
      fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 0.9,
      marginTop: 24, marginBottom: 8, fontFamily: F.bold, paddingHorizontal: 2,
      textAlign: isRTL ? 'right' : 'left',
    },
    card:         { backgroundColor: C.surface, borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
    
    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
    modalContent: {
      width: '92%', maxHeight: '80%', backgroundColor: C.surface, borderRadius: 24, padding: 24,
      shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 16,
    },
    modalHeader:  { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle:   { fontSize: 18, fontWeight: '700', color: C.text, fontFamily: F.bold, textAlign: isRTL ? 'right' : 'left' },
    modalBody:    { fontSize: 14, color: C.textSub, fontFamily: F.regular, lineHeight: 22, textAlign: isRTL ? 'right' : 'left', paddingBottom: 20 },
    modalSectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, fontFamily: F.bold, marginTop: 16, marginBottom: 8, textAlign: isRTL ? 'right' : 'left' },
  }), [C, isRTL]);

  return (
    <>
      <AppScaffold
        title={t('PRIVACY_SECURITY')}
        activeTab="profile"
        onBack={() => navigation.goBack()}
        onPressHome={() => navigation.navigate('Home')}
        onPressEvents={() => navigation.navigate('Map')}
        onPressCenter={() => {}}
        onPressReels={() => {}}
        onPressProfile={() => {
          if (user?.profileType === 'pro_commerce') {
            navigation.navigate('SellerProProfile');
          } else {
            navigation.navigate('Profile');
          }
        }}
        contentStyle={{ backgroundColor: C.bg }}
      >
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          
          <Text style={s.sectionLabel}>{t('PRIVACY_SECURITY')}</Text>
          <View style={s.card}>
            <SettingItem
              theme={C}
              iconName="shield-key-outline"
              title={t('TWO_FACTOR')}
              subtitle={t('TWO_FACTOR_SUB')}
              showSwitch
              switchValue={twoFactor}
              onSwitchChange={handleTwoFactorToggle}
            />
            <SettingItem
              theme={C}
              iconName="database-lock-outline"
              title={t('SHARE_DATA')}
              subtitle={t('SHARE_DATA_SUB')}
              showSwitch
              switchValue={dataSharing}
              onSwitchChange={handleDataSharingToggle}
            />
            <SettingItem
              theme={C}
              iconName="eye-outline"
              title={t('PUBLIC_PROFILE')}
              subtitle={t('PUBLIC_PROFILE_SUB')}
              showSwitch
              switchValue={publicProfile}
              onSwitchChange={handlePublicProfileToggle}
              isLast
            />
          </View>

          <Text style={s.sectionLabel}>{t('SUPPORT')}</Text>
          <View style={s.card}>
            <SettingItem
              theme={C}
              iconName="file-document-outline"
              title={t('PRIVACY_POLICY')}
              subtitle={t('PRIVACY_POLICY_SUB')}
              onPress={() => setShowPrivacyModal(true)}
            />
            <SettingItem
              theme={C}
              iconName="handshake-outline"
              title={t('TERMS_SERVICE')}
              subtitle={t('TERMS_SERVICE_SUB')}
              isLast
              onPress={() => setShowTermsModal(true)}
            />
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </AppScaffold>

      {/* ── Modal: Privacy Policy ────────────────────────────────────────── */}
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{t('PRIVACY_POLICY')}</Text>
              <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
                <MaterialCommunityIcons name="close" size={22} color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.modalBody}>
                {t('At GlUnity, we take your medical and personal data privacy extremely seriously. We are fully committed to GDPR compliance and protecting your health information.')}
              </Text>
              
              <Text style={s.modalSectionTitle}>{t('1. Data We Collect')}</Text>
              <Text style={s.modalBody}>
                {t('We collect basic account credentials (name, email) and non-sensitive health preferences (celiac disease status, dietary rules) to customize your user journey.')}
              </Text>

              <Text style={s.modalSectionTitle}>{t('2. Clinical Data Sharing')}</Text>
              <Text style={s.modalBody}>
                {t('If you opt in to "Share Research Data", we provide fully anonymized stats on celiac symptom frequency and food scans to scientific medical studies. No personally identifiable details are ever shared.')}
              </Text>

              <Text style={s.modalSectionTitle}>{t('3. Information Security')}</Text>
              <Text style={s.modalBody}>
                {t('All client-server payloads are encrypted using Transport Layer Security (TLS 1.3). Account settings and credentials are secured via modern database hashing standards.')}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Terms of Service ──────────────────────────────────────── */}
      <Modal
        visible={showTermsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{t('TERMS_SERVICE')}</Text>
              <TouchableOpacity onPress={() => setShowTermsModal(false)}>
                <MaterialCommunityIcons name="close" size={22} color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.modalBody}>
                {t('Welcome to GlUnity. By using our application, you agree to comply with the terms and guidelines outlined below.')}
              </Text>

              <Text style={s.modalSectionTitle}>{t('1. Medical Disclaimer')}</Text>
              <Text style={s.modalBody}>
                {t('GlUnity provides educational patient resources, diet suggestions, and community support. The application does NOT provide clinical diagnosis, medical advice, or replacement for professional consultations.')}
              </Text>

              <Text style={s.modalSectionTitle}>{t('2. Code of Conduct')}</Text>
              <Text style={s.modalBody}>
                {t('We promote a supportive community. Any harassment, false reporting of gluten-free restaurants, or toxic behavior on events and community chats will lead to permanent account suspension.')}
              </Text>

              <Text style={s.modalSectionTitle}>{t('3. Account Credentials')}</Text>
              <Text style={s.modalBody}>
                {t('You are responsible for keeping your login credentials secure. We highly recommend activating Two-Factor Authentication (2FA) for optimal account integrity.')}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
