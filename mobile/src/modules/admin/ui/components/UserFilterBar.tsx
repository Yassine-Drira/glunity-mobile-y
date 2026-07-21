import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../../shared/context/theme.context';
import { Colors, Font, Radius, Spacing } from '../../../../shared/utils/theme';
import { UserFilter } from '../../hooks/useAdminUsers';

import { useLanguage } from '../../../../shared/context/language.context';

interface UserFilterBarProps {
  filter: UserFilter;
  setFilter: (f: UserFilter) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export function UserFilterBar({ filter, setFilter, searchQuery, setSearchQuery }: UserFilterBarProps) {
  const { theme: T, isDark } = useTheme();
  const { t } = useLanguage();
  const primaryGreen = Colors.green || '#8BC34A';

  const tabs: { id: UserFilter; label: string; isDanger?: boolean }[] = [
    { id: 'all', label: t('resources.filter_all', 'Tous') },
    { id: 'celiac', label: t('role.celiac', 'Patients') },
    { id: 'pro_commerce', label: t('role.seller', 'Vendeurs') },
    { id: 'pro_health', label: t('role.health_pro', 'Santé') },
    { id: 'suspended', label: `🚫 ${t('users.status_suspended', 'Suspendus')}`, isDanger: true },
  ];

  return (
    <>
      <View style={[styles.searchBox, { backgroundColor: isDark ? '#2C2C2E' : 'rgba(46,46,46,0.06)', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(46,46,46,0.2)' }]}>
        <Feather name="search" size={15} color={T.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: T.text }]}
          placeholder={t('users.search', 'Rechercher par nom, email...')}
          placeholderTextColor={T.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Feather name="x-circle" size={16} color={T.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabBarContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {tabs.map((tab) => {
            const isActive = filter === tab.id;
            const activeBg = tab.isDanger ? '#EF4444' : primaryGreen;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tabPill,
                  { backgroundColor: isActive ? activeBg : isDark ? '#2C2C2E' : 'rgba(46,46,46,0.06)' },
                ]}
                onPress={() => setFilter(tab.id)}
              >
                <Text style={[styles.tabLabel, { color: isActive ? '#FFF' : tab.isDanger ? '#EF4444' : T.text }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.md,
    height: 42,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: Font.regular,
    fontSize: 14,
    height: '100%',
  },
  tabBarContainer: {
    marginBottom: Spacing.xs,
  },
  tabsScroll: {
    paddingHorizontal: Spacing.md,
    gap: 8,
  },
  tabPill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontFamily: Font.medium,
    fontSize: 13,
  },
});
