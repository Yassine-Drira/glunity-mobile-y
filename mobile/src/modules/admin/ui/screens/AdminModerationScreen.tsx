import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../../shared/context/theme.context';
import { Colors, Font, Radius, Spacing } from '../../../../shared/utils/theme';
import { useAdminModeration, TabType } from '../../hooks/useAdminModeration';
import { ModerationCard } from '../components/ModerationCard';
import { ActionModal } from '../components/ActionModal';
import { SkeletonCard } from '../components/SkeletonCard';

import { useLanguage } from '../../../../shared/context/language.context';

export function AdminModerationScreen({ route, navigation }: any) {
  const { theme: T, isDark } = useTheme();
  const { t } = useLanguage();
  const initialTab: TabType = route?.params?.initialTab || 'products';
  const { activeTab, setActiveTab, loading, filteredItems, modal } = useAdminModeration(initialTab);
  const primaryGreen = Colors.green || '#8BC34A';

  const tabs: { id: TabType; label: string; icon: string; color: string }[] = [
    { id: 'products', label: t('mod.filter_products', 'Produits'), icon: 'food-apple', color: '#8BC34A' },
    { id: 'events', label: t('mod.filter_events', 'Événements'), icon: 'calendar', color: '#3B82F6' },
    { id: 'recipes', label: t('mod.filter_recipes', 'Recettes'), icon: 'chef-hat', color: '#F59E0B' },
    { id: 'reels', label: t('mod.filter_reels', 'Reels'), icon: 'movie-play', color: '#EC4899' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: T.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? '#1C1C1E' : Colors.white, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
          <Feather name="arrow-left" size={20} color={T.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: T.text }]}>{t('mod.title', 'Centre de Modération')}</Text>
          <Text style={[styles.headerSub, { color: T.textMuted }]}>{t('mod.sub', 'Validation des produits, recettes, événements et reels')}</Text>
        </View>
      </View>

      {/* Pill Tabs */}
      <View style={styles.tabBarContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tabPill,
                  { backgroundColor: isActive ? tab.color : isDark ? '#2C2C2E' : 'rgba(46,46,46,0.06)' },
                ]}
                onPress={() => setActiveTab(tab.id)}
              >
                <MaterialCommunityIcons name={tab.icon as any} size={15} color={isActive ? '#FFF' : T.textMuted} />
                <Text style={[styles.tabLabel, { color: isActive ? '#FFF' : T.text }]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.contentScroll}>
        {loading ? (
          <>
            <SkeletonCard height={100} />
            <SkeletonCard height={100} />
            <SkeletonCard height={100} />
          </>
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyBox}>
            <Feather name="check-circle" size={40} color={primaryGreen} />
            <Text style={[styles.emptyText, { color: T.textMuted }]}>Aucun contenu en attente dans cette catégorie</Text>
          </View>
        ) : (
          filteredItems.map((item) => (
            <ModerationCard
              key={item.id}
              item={item}
              onApprove={() => modal.handleOpenAction(item, 'approve')}
              onReject={() => modal.handleOpenAction(item, 'reject')}
            />
          ))
        )}
      </ScrollView>

      {/* Decision Modal */}
      <ActionModal
        visible={modal.visible}
        onClose={() => modal.setVisible(false)}
        onConfirm={modal.handleConfirmAction}
        actionType={modal.actionType}
        selectedItem={modal.selectedItem}
        rejectReason={modal.rejectReason}
        setRejectReason={modal.setRejectReason}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  headerText: { flex: 1 },
  headerTitle: { fontFamily: Font.bold, fontSize: 20 },
  headerSub: { fontFamily: Font.regular, fontSize: 13, marginTop: 2 },
  tabBarContainer: { marginTop: Spacing.md, marginBottom: Spacing.xs },
  tabsScroll: { paddingHorizontal: Spacing.md, gap: 8 },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    gap: 5,
  },
  tabLabel: { fontFamily: Font.medium, fontSize: 13 },
  contentScroll: { padding: Spacing.md, paddingBottom: 120 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xxl, marginTop: Spacing.lg },
  emptyText: { fontFamily: Font.medium, fontSize: 15, marginTop: Spacing.md, textAlign: 'center' },
});
