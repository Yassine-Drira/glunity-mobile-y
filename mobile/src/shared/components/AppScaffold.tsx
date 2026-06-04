import React from 'react';
import { StatusBar, StyleSheet, View, ViewStyle, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/theme.context';
import { AppHeader } from './AppHeader';
import { BottomNavBar } from './BottomNavBar';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/modules/auth/state/auth.context';

export type AppTabKey = 'home' | 'events' | 'reels' | 'profile';

interface AppScaffoldProps {
  title: string;
  activeTab: AppTabKey;
  onBack?: () => void;
  rightIcon?: string;
  onRightPress?: () => void;
  rightElement?: React.ReactNode;
  showSearch?: boolean;
  onSearchPress?: () => void;
  searchIcon?: string;
  children: React.ReactNode;
  contentStyle?: ViewStyle;
  onPressHome?: () => void;
  onPressEvents?: () => void;
  onPressCenter?: () => void;
  onPressReels?: () => void;
  onPressProfile?: () => void;
}

export function AppScaffold({
  title,
  activeTab,
  onBack,
  rightIcon,
  onRightPress,
  rightElement,
  showSearch,
  onSearchPress,
  searchIcon,
  children,
  contentStyle,
  onPressHome,
  onPressEvents,
  onPressCenter,
  onPressReels,
  onPressProfile,
}: AppScaffoldProps) {
  const { theme: C } = useTheme();
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const handleHome = onPressHome || (() => navigation.navigate('Home'));
  const handleEvents = onPressEvents || (() => navigation.navigate('Events'));
  const handleCenter = onPressCenter || (() => navigation.navigate('Map'));
  const handleReels = onPressReels || (() => {});
  const handleProfile = onPressProfile || (() => {
    if (user?.profileType === 'pro_commerce') {
      navigation.navigate('SellerProProfile');
    } else {
      navigation.navigate('Profile');
    }
  });

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safe, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />
      <AppHeader
        title={title}
        onBack={onBack}
        rightIcon={rightIcon}
        onRightPress={onRightPress}
        rightElement={rightElement}
        showSearch={showSearch}
        onSearchPress={onSearchPress}
        searchIcon={searchIcon}
      />
      <View style={[styles.content, { backgroundColor: C.bg }, contentStyle]}>
        {children}
      </View>
      <BottomNavBar
        activeTab={activeTab}
        onPressHome={handleHome}
        onPressEvents={handleEvents}
        onPressCenter={handleCenter}
        onPressReels={handleReels}
        onPressProfile={handleProfile}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    ...Platform.select({
      web: {
        maxWidth: 600,
        width: '100%',
        alignSelf: 'center',
        boxShadow: '0 0 20px rgba(0,0,0,0.1)',
      },
    }),
  },
  content: {
    flex: 1,
  },
});
