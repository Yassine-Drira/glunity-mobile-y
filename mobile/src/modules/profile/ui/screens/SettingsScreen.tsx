import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Switch,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/modules/auth/navigation/types';
import { BottomNavBar } from '@/shared/components/BottomNavBar';
import { useAuth } from '../../../auth/state/auth.context';

type Props = NativeStackScreenProps<AppStackParamList, 'Settings'>;

const C = {
  green: '#8BC34A',
  dark: '#2E2E2E',
  bg: '#F6F5F3',
  white: '#FFFFFF',
  muted: '#9E9E9E',
  mutedLight: '#BBBBBB',
  red: '#C8102E',
  redLight: 'rgba(200,16,46,0.10)',
  border: 'rgba(0,0,0,0.08)',
  rowDivider: '#F0F0F0',
};

const F = {
  regular: 'Poppins_400Regular',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
};

// ── SettingItem ────────────────────────────────────────────────────────────────
interface SettingItemProps {
  iconName: string;
  title: string;
  subtitle?: string;
  showChevron?: boolean;
  showSwitch?: boolean;
  valueText?: string;
  isLast?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  onPress?: () => void;
}

function SettingItem({
  iconName,
  title,
  subtitle,
  showChevron = true,
  showSwitch = false,
  valueText,
  isLast = false,
  switchValue,
  onSwitchChange,
  onPress,
}: SettingItemProps) {
  const [enabled, setEnabled] = useState(true);
  const currentSwitchValue = switchValue ?? enabled;

  const handleSwitchChange = (value: boolean) => {
    if (onSwitchChange) {
      onSwitchChange(value);
      return;
    }
    setEnabled(value);
  };

  return (
    <TouchableOpacity
      style={[s.row, !isLast && s.rowBorder]}
      onPress={onPress}
      activeOpacity={0.7}
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
          value={currentSwitchValue}
          onValueChange={handleSwitchChange}
          trackColor={{ false: '#E0E0E0', true: C.green }}
          thumbColor={C.white}
        />
      ) : (
        <View style={s.rowRight}>
          {valueText ? <Text style={s.rowValue}>{valueText}</Text> : null}
          {showChevron ? <MaterialCommunityIcons name="chevron-right" size={18} color={C.mutedLight} /> : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── SettingsScreen ─────────────────────────────────────────────────────────────
export default function SettingsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerBack} onPress={() => navigation.goBack()} id="settings-back-btn">
          <MaterialCommunityIcons name="arrow-left" size={22} color={C.dark} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Settings</Text>
        <View style={s.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ACCOUNT */}
        <Text style={s.sectionLabel}>ACCOUNT</Text>
        <View style={s.card}>
          <SettingItem
            iconName="account-edit-outline"
            title="Edit Profile"
            subtitle="Update your name, photo & info"
            onPress={() => navigation.navigate('EditProfile')}
          />
          <SettingItem
            iconName="lock-outline"
            title="Change Password"
            subtitle="Update your login credentials"
            isLast
            onPress={() => navigation.navigate('EditProfile')}
          />
        </View>

        {/* NOTIFICATIONS */}
        <Text style={s.sectionLabel}>NOTIFICATIONS</Text>
        <View style={s.card}>
          <SettingItem
            iconName="bell-ring-outline"
            title="Push Notifications"
            subtitle="Alerts, reminders and updates"
            showSwitch
            switchValue={pushEnabled}
            onSwitchChange={setPushEnabled}
          />
          <SettingItem
            iconName="email-outline"
            title="Email Updates"
            subtitle="Weekly digest and newsletters"
            showSwitch
            switchValue={emailEnabled}
            onSwitchChange={setEmailEnabled}
            isLast
          />
        </View>

        {/* APPEARANCE */}
        <Text style={s.sectionLabel}>APPEARANCE</Text>
        <View style={s.card}>
          <SettingItem
            iconName="weather-night"
            title="Dark Mode"
            subtitle="Switch to dark theme"
            showSwitch
            switchValue={darkModeEnabled}
            onSwitchChange={setDarkModeEnabled}
          />
          <SettingItem
            iconName="format-size"
            title="Text Size"
            valueText="Medium"
            isLast
          />
        </View>

        {/* SUPPORT */}
        <Text style={s.sectionLabel}>SUPPORT</Text>
        <View style={s.card}>
          <SettingItem
            iconName="help-circle-outline"
            title="Help Center"
            subtitle="FAQs and guides"
          />
          <SettingItem
            iconName="bug-outline"
            title="Report a Bug"
            subtitle="Help us improve the app"
            isLast
          />
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={() => navigation.navigate('Profile')}>
          <View style={s.logoutIconWrap}>
            <MaterialCommunityIcons name="logout" size={20} color={C.white} />
          </View>
          <Text style={s.logoutText}>Log out</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={C.white} />
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNavBar
        activeTab="profile"
        idPrefix="settings-nav"
        onPressHome={() => navigation.navigate('Home')}
        onPressEvents={() => {}}
        onPressCenter={() => {}}
        onPressReels={() => {}}
        onPressProfile={() => {
          if (user?.profileType === 'pro_commerce') {
            navigation.navigate('SellerProfile');
          } else {
            navigation.navigate('Profile');
          }
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  headerBack: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 24,
    height: 24,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: C.dark,
    fontFamily: F.semibold,
  },

  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.dark,
    marginTop: 20,
    marginBottom: 8,
    fontFamily: F.bold,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.redLight,
  },
  rowContent: { flex: 1 },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.dark,
    fontFamily: F.semibold,
  },
  rowSub: {
    fontSize: 11,
    color: C.muted,
    marginTop: 2,
    fontFamily: F.regular,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowValue: {
    fontSize: 13,
    color: C.muted,
    fontFamily: F.regular,
  },

  logoutBtn: {
    marginTop: 20,
    marginHorizontal: 16,
    height: 52,
    borderRadius: 12,
    backgroundColor: C.green,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoutIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  logoutText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    color: C.white,
    fontWeight: '600',
    fontFamily: F.semibold,
  },
});
