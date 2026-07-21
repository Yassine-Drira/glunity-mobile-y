import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, RefreshControl } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../../shared/context/theme.context';
import { Colors, Font, Spacing, Radius } from '../../../../shared/utils/theme';
import { useAdminResources, ResourceTypeFilter, ResourceStatusFilter } from '../../hooks/useAdminResources';
import { ResourceCard } from '../components/ResourceCard';
import { ResourceFormModal } from '../components/ResourceFormModal';
import { SkeletonCard } from '../components/SkeletonCard';
import { useLanguage } from '../../../../shared/context/language.context';

export function AdminResourcesScreen({ navigation }: any) {
  const { theme: T, isDark } = useTheme();
  const { t } = useLanguage();
  const primaryGreen = Colors.green || '#8BC34A';
  
  const {
    resources,
    analytics,
    loading,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    refresh,
    openCreateModal,
    openEditModal,
    handleSaveResource,
    handleDeleteResource,
    modal,
  } = useAdminResources();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: T.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? '#1C1C1E' : Colors.white, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
          <Feather name="arrow-left" size={20} color={T.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <View style={styles.headerTitleRow}>
            <MaterialCommunityIcons name="book-open-page-variant" size={22} color={primaryGreen} />
            <Text style={[styles.headerTitle, { color: T.text }]}>{t('resources.title', 'Ressources Médicales Patients')}</Text>
          </View>
          <Text style={[styles.headerSub, { color: T.textMuted }]}>
            {t('resources.sub', 'Consultez, modifiez et gérez les articles, guides PDF et vidéos de la communauté cœliaque.')}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentScroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={primaryGreen} />}
      >
        {/* Top Analytics Summary Row */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: isDark ? '#1C1C1E' : Colors.white, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.summaryIconBox, { backgroundColor: 'rgba(139, 195, 74, 0.12)' }]}>
                <Ionicons name="library" size={16} color={primaryGreen} />
              </View>
              <Text style={[styles.summaryValue, { color: T.text }]}>{analytics.totalResources || resources.length}</Text>
            </View>
            <Text style={[styles.summaryLabel, { color: T.textMuted }]}>
              {t('resources.stat_resources', 'Ressources')}
            </Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: isDark ? '#1C1C1E' : Colors.white, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.summaryIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                <Feather name="eye" size={16} color="#3B82F6" />
              </View>
              <Text style={[styles.summaryValue, { color: T.text }]}>{analytics.totalViews || 0}</Text>
            </View>
            <Text style={[styles.summaryLabel, { color: T.textMuted }]}>
              {t('resources.stat_views', 'Vues Total')}
            </Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: isDark ? '#1C1C1E' : Colors.white, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.summaryIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                <Feather name="mouse-pointer" size={16} color="#10B981" />
              </View>
              <Text style={[styles.summaryValue, { color: T.text }]}>{analytics.totalClicks || 0}</Text>
            </View>
            <Text style={[styles.summaryLabel, { color: T.textMuted }]}>
              {t('resources.stat_clicks', 'Clics Total')}
            </Text>
          </View>
        </View>

        {/* Action Header & Search Bar */}
        <View style={styles.controlsContainer}>
          <View style={styles.topActionsRow}>
            <Text style={[styles.sectionHeading, { color: T.text }]} numberOfLines={1}>{t('resources.library', 'Bibliothèque')}</Text>
            <TouchableOpacity style={[styles.btnAdd, { backgroundColor: primaryGreen }]} onPress={openCreateModal}>
              <Feather name="plus" size={15} color="#FFF" />
              <Text style={styles.btnAddText}>{t('resources.add', '+ Nouvelle')}</Text>
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={[styles.searchBox, { backgroundColor: isDark ? '#1C1C1E' : Colors.white, borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }]}>
            <Feather name="search" size={16} color={T.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: T.text }]}
              placeholder={t('resources.search', 'Rechercher par titre, auteur...')}
              placeholderTextColor={T.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Feather name="x" size={14} color={T.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {[
              { id: 'all', label: t('resources.filter_all', 'Toutes') },
              { id: 'article', label: t('resources.filter_article', 'Articles') },
              { id: 'document', label: t('resources.filter_document', 'Documents') },
              { id: 'video', label: t('resources.filter_video', 'Vidéos') },
            ].map((p) => {
              const isActive = typeFilter === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.filterPill, { backgroundColor: isActive ? primaryGreen : isDark ? '#1C1C1E' : Colors.white }]}
                  onPress={() => setTypeFilter(p.id as ResourceTypeFilter)}
                >
                  <Text style={[styles.filterPillText, { color: isActive ? '#FFF' : T.text }]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}

            <View style={styles.filterDivider} />

            {[
              { id: 'all', label: 'Tous Statuts' },
              { id: 'Published', label: 'Publiés' },
              { id: 'Draft', label: 'Brouillons' },
            ].map((s) => {
              const isActive = statusFilter === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.filterPill, { backgroundColor: isActive ? '#3B82F6' : isDark ? '#1C1C1E' : Colors.white }]}
                  onPress={() => setStatusFilter(s.id as ResourceStatusFilter)}
                >
                  <Text style={[styles.filterPillText, { color: isActive ? '#FFF' : T.text }]}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Resources List */}
        {loading && resources.length === 0 ? (
          <View style={{ gap: 12 }}>
            <SkeletonCard height={120} />
            <SkeletonCard height={120} />
            <SkeletonCard height={120} />
          </View>
        ) : resources.length === 0 ? (
          <View style={styles.emptyBox}>
            <Feather name="file-text" size={44} color={primaryGreen} />
            <Text style={[styles.emptyTitle, { color: T.text }]}>Aucune ressource trouvée</Text>
            <Text style={[styles.emptySub, { color: T.textMuted }]}>
              {searchQuery ? 'Essayez de modifier votre recherche' : 'Publiez une nouvelle ressource pour enrichir la plateforme.'}
            </Text>
          </View>
        ) : (
          resources.map((res) => (
            <ResourceCard
              key={res.id}
              resource={res}
              onEdit={() => openEditModal(res)}
              onDelete={() => handleDeleteResource(res.id, res.title)}
            />
          ))
        )}
      </ScrollView>

      {/* Unified Create / Edit Modal */}
      <ResourceFormModal
        visible={modal.visible}
        initialData={modal.editingItem}
        onClose={() => modal.setVisible(false)}
        onSave={handleSaveResource}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
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
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  headerTitle: { fontFamily: Font.bold, fontSize: 18, marginLeft: 6 },
  headerSub: { fontFamily: Font.regular, fontSize: 12 },
  contentScroll: { padding: Spacing.md, paddingBottom: 120 },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    flex: 1,
    padding: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryValue: {
    fontFamily: Font.bold,
    fontSize: 16,
  },
  summaryLabel: {
    fontFamily: Font.medium,
    fontSize: 11,
  },
  controlsContainer: {
    marginBottom: Spacing.lg,
  },
  topActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: 8,
  },
  sectionHeading: {
    fontFamily: Font.bold,
    fontSize: 16,
    flex: 1,
  },
  btnAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    gap: 4,
  },
  btnAddText: {
    color: '#FFF',
    fontFamily: Font.bold,
    fontSize: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 42,
    marginBottom: Spacing.md,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: Font.regular,
    fontSize: 13,
  },
  filterScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: Spacing.lg,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  filterPillText: {
    fontFamily: Font.medium,
    fontSize: 12,
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 4,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    marginTop: Spacing.lg,
  },
  emptyTitle: {
    fontFamily: Font.bold,
    fontSize: 16,
    marginTop: Spacing.md,
  },
  emptySub: {
    fontFamily: Font.regular,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
});
