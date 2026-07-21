import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../../../shared/context/theme.context';
import { Colors, Font, Spacing } from '../../../../shared/utils/theme';
import { useSellerVerification } from '../../hooks/useSellerVerification';
import { SellerDossierCard } from '../components/SellerDossierCard';
import { DossierActionModal } from '../components/DossierActionModal';
import { SkeletonCard } from '../components/SkeletonCard';

import { useLanguage } from '../../../../shared/context/language.context';

export function AdminSellerVerificationScreen({ navigation }: any) {
  const { theme: T, isDark } = useTheme();
  const { t } = useLanguage();
  const primaryGreen = Colors.green || '#8BC34A';
  const { sellers, loading, modal } = useSellerVerification();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: T.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? '#1C1C1E' : Colors.white, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
          <Feather name="arrow-left" size={20} color={T.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <View style={styles.headerTitleRow}>
            <MaterialIcons name="verified" size={22} color="#3B82F6" />
            <Text style={[styles.headerTitle, { color: T.text }]}>{t('sellers.title', 'Vérification Vendeurs')}</Text>
          </View>
          <Text style={[styles.headerSub, { color: T.textMuted }]}>
            {t('sellers.sub', 'Audit des kbis, siret, certifications et boutiques cœliaques')}
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.contentScroll}>
        {loading ? (
          <>
            <SkeletonCard height={130} />
            <SkeletonCard height={130} />
            <SkeletonCard height={130} />
          </>
        ) : sellers.length === 0 ? (
          <View style={styles.emptyBox}>
            <Feather name="shield" size={40} color={primaryGreen} />
            <Text style={[styles.emptyText, { color: T.textMuted }]}>Aucun dossier en attente</Text>
            <Text style={[styles.emptySubText, { color: T.textMuted }]}>Tous les dossiers vendeurs ont été traités</Text>
          </View>
        ) : (
          sellers.map((s) => (
            <SellerDossierCard
              key={s.id}
              seller={s}
              onOpenDetails={() => modal.handleOpenDetails(s)}
              onApprove={() => modal.handleOpenAction(s, 'approve')}
              onRevision={() => modal.handleOpenAction(s, 'revision')}
              onReject={() => modal.handleOpenAction(s, 'reject')}
            />
          ))
        )}
      </ScrollView>

      {/* Modals */}
      <DossierActionModal
        modalType={modal.type}
        onClose={() => modal.setType(null)}
        seller={modal.selectedSeller}
        actionKind={modal.actionKind}
        remarks={modal.remarks}
        setRemarks={modal.setRemarks}
        onConfirmAction={modal.handleConfirmAction}
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
  headerTitle: { fontFamily: Font.bold, fontSize: 20, marginLeft: 8 },
  headerSub: { fontFamily: Font.regular, fontSize: 13 },
  contentScroll: { paddingHorizontal: Spacing.md, paddingBottom: 120 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xxl, marginTop: Spacing.lg },
  emptyText: { fontFamily: Font.semibold, fontSize: 16, marginTop: Spacing.md },
  emptySubText: { fontFamily: Font.regular, fontSize: 13, marginTop: 4, textAlign: 'center' },
});
