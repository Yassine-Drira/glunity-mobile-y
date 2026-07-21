import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../shared/context/theme.context';
import { Colors, Font, Spacing } from '../../../../shared/utils/theme';
import { useAdminUsers } from '../../hooks/useAdminUsers';
import { UserCard } from '../components/UserCard';
import { UserActionModal } from '../components/UserActionModal';
import { UserFilterBar } from '../components/UserFilterBar';
import { SkeletonCard } from '../components/SkeletonCard';

import { useLanguage } from '../../../../shared/context/language.context';

export function AdminUsersScreen({ navigation }: any) {
  const { theme: T, isDark } = useTheme();
  const { t } = useLanguage();
  const primaryGreen = Colors.green || '#8BC34A';
  const { filter, setFilter, searchQuery, setSearchQuery, users, loading, handleToggleStatus, modal } = useAdminUsers();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: T.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? '#1C1C1E' : Colors.white, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
          <Feather name="arrow-left" size={20} color={T.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="people" size={20} color="#3B82F6" />
            <Text style={[styles.headerTitle, { color: T.text }]}>{t('users.title', 'Gestion des Membres')}</Text>
          </View>
          <Text style={[styles.headerSub, { color: T.textMuted }]}>{t('users.sub', "Consultez la liste des utilisateurs, rôles et statuts d'accès")}</Text>
        </View>
      </View>

      <UserFilterBar
        filter={filter}
        setFilter={setFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Content */}
      <ScrollView contentContainerStyle={styles.contentScroll}>
        {loading ? (
          <>
            <SkeletonCard height={80} />
            <SkeletonCard height={80} />
            <SkeletonCard height={80} />
            <SkeletonCard height={80} />
          </>
        ) : users.length === 0 ? (
          <View style={styles.emptyBox}>
            <Feather name="users" size={40} color={T.textMuted} />
            <Text style={[styles.emptyText, { color: T.textMuted }]}>Aucun utilisateur trouvé</Text>
            <Text style={[styles.emptySubText, { color: T.textMuted }]}>Essayez de modifier vos filtres de recherche</Text>
          </View>
        ) : (
          users.map((u) => (
            <UserCard
              key={u.id}
              user={u}
              onPress={() => {
                modal.setSelectedUser(u);
                modal.setVisible(true);
              }}
              onToggleStatus={() => handleToggleStatus(u)}
            />
          ))
        )}
      </ScrollView>

      {/* Control Modal */}
      <UserActionModal
        visible={modal.visible}
        onClose={() => modal.setVisible(false)}
        user={modal.selectedUser}
        onToggleStatus={modal.handleToggleStatus}
        onResetPassword={modal.handlePasswordReset}
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
    marginBottom: Spacing.sm,
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
  headerTitle: { fontFamily: Font.bold, fontSize: 20, marginLeft: 6 },
  headerSub: { fontFamily: Font.regular, fontSize: 12 },
  contentScroll: { paddingHorizontal: Spacing.md, paddingBottom: 120 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xxl, marginTop: Spacing.lg },
  emptyText: { fontFamily: Font.semibold, fontSize: 16, marginTop: Spacing.md },
  emptySubText: { fontFamily: Font.regular, fontSize: 13, marginTop: 4, textAlign: 'center' },
});
