import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../../shared/context/theme.context';
import { Colors, Font, Radius, Spacing } from '../../../../shared/utils/theme';
import { AdminDashboardStats } from '../../api/admin.types';
import { useLanguage } from '../../../../shared/context/language.context';

interface RegistrationInsightsProps {
  stats?: AdminDashboardStats['questionnaireStats'];
  authMethodStats?: AdminDashboardStats['authMethodStats'];
  totalUsers?: number;
}

export function RegistrationInsights({ stats, authMethodStats, totalUsers }: RegistrationInsightsProps) {
  const { theme: T, isDark } = useTheme();
  const { t } = useLanguage();
  const primaryGreen = Colors.green || '#8BC34A';

  if (!stats) return null;

  const symptoms    = stats.symptoms || [];
  const ageGroups   = stats.ageGroups || [];
  const dietary     = stats.dietaryPreferences || [];
  const severity    = stats.severity || { mild: { pct: 0, count: 0 }, moderate: { pct: 0, count: 0 }, severe: { pct: 0, count: 0 }, hasData: false };

  return (
    <View style={styles.container}>
      {/* Executive Health Callout Header */}
      <View style={[styles.insightHeaderBanner, { backgroundColor: isDark ? '#1C1C1E' : '#F0FDF4', borderColor: isDark ? 'rgba(16,185,129,0.3)' : '#BBF7D0' }]}>
        <View style={[styles.headerIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
          <MaterialCommunityIcons name="heart-pulse" size={20} color="#10B981" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.bannerTitle, { color: isDark ? '#6EE7B7' : '#065F46' }]}>
            {t('insights.title', 'Analyse Clinique & Questionnaires Patients')} ({stats.totalSurveyed || 0} {t('insights.surveyed', 'répondants')})
          </Text>
          <Text style={[styles.bannerSub, { color: isDark ? '#A7F3D0' : '#047857' }]}>
            {stats.hasInsufficientData
              ? t('insights.insufficient_sub', 'En cours de collecte — questionnaires non encore remplis par les patients')
              : t('insights.sub', "Synthèse des symptômes déclarés, tranches d'âge et sévérité des réactions au gluten")}
          </Text>
        </View>
        {stats.hasInsufficientData && (
          <View style={{ backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 }}>
            <Text style={{ fontSize: 9, color: '#F59E0B', fontFamily: Font.bold }}>
              {t('insights.collecting', 'En Collecte')}
            </Text>
          </View>
        )}
      </View>

      {/* ── Insufficient Data State ─────────────────────────────── */}
      {stats.hasInsufficientData ? (
        <View style={[styles.card, { backgroundColor: isDark ? '#1C1C1E' : Colors.white, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', alignItems: 'center', paddingVertical: 32 }]}>
          <MaterialCommunityIcons name="clipboard-text-clock-outline" size={48} color={isDark ? '#6EE7B7' : '#10B981'} style={{ opacity: 0.5 }} />
          <Text style={[styles.cardTitle, { color: T.text, marginTop: 12, textAlign: 'center' }]}>
            {t('insights.no_data_title', 'Questionnaires en cours de collecte')}
          </Text>
          <Text style={[styles.cardSubtitle, { color: T.textMuted, textAlign: 'center', marginTop: 6, maxWidth: 260 }]}>
            {t('insights.no_data_sub', `Seulement ${stats.totalSurveyed} patient(s) ont rempli leur questionnaire de santé sur ${totalUsers || '?'} utilisateurs inscrits. Les données s'afficheront automatiquement dès que 5+ répondants seront enregistrés.`)}
          </Text>
          <View style={[styles.barTrack, { marginTop: 16, width: '80%', height: 8 }]}>
            <View style={[styles.barFill, { width: `${Math.min(100, Math.round(((stats.totalSurveyed || 0) / Math.max(totalUsers || 1, 1)) * 100))}%`, backgroundColor: '#10B981' }]} />
          </View>
          <Text style={{ color: T.textMuted, fontSize: 11, marginTop: 4 }}>
            {stats.totalSurveyed}/{totalUsers} ({Math.round(((stats.totalSurveyed||0)/Math.max(totalUsers||1,1))*100)}% de complétion)
          </Text>
        </View>
      ) : (
        <>
        {/* Card 1: Symptoms & Problems Caused by Eating Gluten */}
        <View style={[styles.card, { backgroundColor: isDark ? '#1C1C1E' : Colors.white, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
            <Text style={[styles.cardTitle, { color: T.text }]}>{t('insights.symptoms_title', "Symptômes & Rejets Suite à l'Ingestion de Gluten")}</Text>
          </View>
        <Text style={[styles.cardSubtitle, { color: T.textMuted }]}>
          {t('insights.symptoms_sub', "Répartition des signalements (Somme = 100%) & Fréquence de survenue par patient")}
        </Text>

        <View style={{ marginTop: Spacing.md, gap: 12 }}>
          {symptoms.map((item: any) => (
            <View key={item.id}>
              <View style={styles.itemHeader}>
                <Text style={[styles.itemLabel, { color: T.text }]}>{item.label}</Text>
                <Text style={[styles.itemPct, { color: item.color }]}>
                  {item.pct}% <Text style={{ fontSize: 11, color: T.textMuted }}>({item.count} cas · {item.prevalencePct || item.pct}% touchés)</Text>
                </Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.min(100, Math.max(item.pct, 4))}%`, backgroundColor: item.color }]} />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Card 2: Severity, Clinical Diagnosis & Family History */}
      <View style={[styles.card, { backgroundColor: isDark ? '#1C1C1E' : Colors.white, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
        <View style={styles.cardTitleRow}>
          <MaterialCommunityIcons name="stethoscope" size={18} color="#8B5CF6" />
          <Text style={[styles.cardTitle, { color: T.text }]}>{t('insights.severity_title', 'Sévérité des Réactions & Diagnostic Médical')}</Text>
        </View>

        {/* Severity Meter — residual absorber: moderate takes remainder so Σ ≤ 100% */}
        <Text style={[styles.subSectionTitle, { color: T.textMuted }]}>{t('insights.severity_scale', 'Échelle de sévérité globale des réactions :')}</Text>
        <View style={styles.severityBarContainer}>
          {(() => {
            const mildW   = Math.max(severity.mild.pct,   2);
            const severeW = Math.max(severity.severe.pct, 2);
            const modW    = Math.max(0, 100 - mildW - severeW);
            return (
              <>
                <View style={[styles.severitySegment, { width: `${mildW}%`,   backgroundColor: '#10B981' }]} />
                <View style={[styles.severitySegment, { width: `${modW}%`,    backgroundColor: '#F59E0B' }]} />
                <View style={[styles.severitySegment, { width: `${severeW}%`, backgroundColor: '#EF4444' }]} />
              </>
            );
          })()}
        </View>
        <View style={styles.severityLegendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
            <Text style={[styles.legendText, { color: T.text }]}>{t('insights.mild', 'Légère')} ({severity.mild.pct}%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
            <Text style={[styles.legendText, { color: T.text }]}>{t('insights.moderate', 'Modérée')} ({severity.moderate.pct}%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
            <Text style={[styles.legendText, { color: T.text }]}>{t('insights.severe', 'Sévère')} ({severity.severe.pct}%)</Text>
          </View>
        </View>

        {/* Key Health Metrics Grid */}
        <View style={styles.healthMetricsGrid}>
          <View style={[styles.metricTile, { backgroundColor: isDark ? '#2C2C2E' : 'rgba(59, 130, 246, 0.08)' }]}>
            <Text style={[styles.metricNumber, { color: '#3B82F6' }]}>{stats.clinicalDiagnosisPct}%</Text>
            <Text style={[styles.metricLabel, { color: T.text }]}>{t('insights.clinical_diagnosis', 'Diagnostic Médical Confirmé (Biopsie / Sérologie)')}</Text>
          </View>
          <View style={[styles.metricTile, { backgroundColor: isDark ? '#2C2C2E' : 'rgba(139, 92, 246, 0.08)' }]}>
            <Text style={[styles.metricNumber, { color: '#8B5CF6' }]}>{stats.familyHistoryPct}%</Text>
            <Text style={[styles.metricLabel, { color: T.text }]}>{t('insights.family_history', 'Antécédents Familiaux de Cœliaquie Déclarés')}</Text>
          </View>
        </View>
      </View>

      {/* Card 3: Age Distribution & Dietary Preferences */}
      <View style={[styles.gridTwoCards]}>
        {/* Age Histogram */}
        <View style={[styles.cardHalf, { backgroundColor: isDark ? '#1C1C1E' : Colors.white, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="people-outline" size={18} color="#3B82F6" />
            <Text style={[styles.cardTitle, { color: T.text }]}>{t('insights.age_groups', "Tranches d'Âge")}</Text>
          </View>

          <View style={{ marginTop: Spacing.md, gap: 10 }}>
            {ageGroups.map((age: any) => (
              <View key={age.label}>
                <View style={styles.itemHeader}>
                  <Text style={[styles.itemLabel, { color: T.text, fontSize: 11 }]}>{age.label}</Text>
                  <Text style={[styles.itemPct, { color: '#3B82F6', fontSize: 11 }]}>{age.pct}%</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.max(age.pct, 4)}%`, backgroundColor: '#3B82F6' }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Diet Preferences */}
        <View style={[styles.cardHalf, { backgroundColor: isDark ? '#1C1C1E' : Colors.white, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
          <View style={styles.cardTitleRow}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={18} color={primaryGreen} />
            <Text style={[styles.cardTitle, { color: T.text }]}>Profils Alimentaires</Text>
          </View>

          <View style={{ marginTop: Spacing.md, gap: 10 }}>
            {dietary.map((diet: any) => (
              <View key={diet.id}>
                <View style={styles.itemHeader}>
                  <Text style={[styles.itemLabel, { color: T.text, fontSize: 11 }]} numberOfLines={1}>{diet.label}</Text>
                  <Text style={[styles.itemPct, { color: primaryGreen, fontSize: 11 }]}>{diet.pct}%</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.max(diet.pct, 4)}%`, backgroundColor: primaryGreen }]} />
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
      </>
      )}

      {/* Auth Method Breakdown Card — always shown, real data */}
      {authMethodStats && (
        <View style={[styles.card, { backgroundColor: isDark ? '#1C1C1E' : Colors.white, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
          <View style={styles.cardTitleRow}>
            <MaterialCommunityIcons name="login-variant" size={18} color="#3B82F6" />
            <Text style={[styles.cardTitle, { color: T.text }]}>{t('insights.auth_method_title', 'Méthode de Connexion des Utilisateurs')}</Text>
          </View>
          <Text style={[styles.cardSubtitle, { color: T.textMuted }]}>
            {t('insights.auth_method_sub', `Répartition des ${authMethodStats.total} comptes par mode d'authentification`)}
          </Text>

          <View style={{ marginTop: Spacing.md, gap: 12 }}>
            {/* Email / Password */}
            <View>
              <View style={styles.itemHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="mail" size={13} color="#6366F1" />
                  <Text style={[styles.itemLabel, { color: T.text }]}>{t('insights.auth_email', 'Email & Mot de passe')}</Text>
                </View>
                <Text style={[styles.itemPct, { color: '#6366F1' }]}>{authMethodStats.email.pct}% <Text style={{ fontSize: 11, color: T.textMuted }}>({authMethodStats.email.count} comptes)</Text></Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.max(authMethodStats.email.pct, 2)}%`, backgroundColor: '#6366F1' }]} />
              </View>
            </View>

            {/* Google */}
            <View>
              <View style={styles.itemHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialCommunityIcons name="google" size={13} color="#EF4444" />
                  <Text style={[styles.itemLabel, { color: T.text }]}>{t('insights.auth_google', 'Google OAuth')}</Text>
                </View>
                <Text style={[styles.itemPct, { color: '#EF4444' }]}>{authMethodStats.google.pct}% <Text style={{ fontSize: 11, color: T.textMuted }}>({authMethodStats.google.count} comptes)</Text></Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.max(authMethodStats.google.pct, 2)}%`, backgroundColor: '#EF4444' }]} />
              </View>
            </View>

            {/* Facebook */}
            <View>
              <View style={styles.itemHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialCommunityIcons name="facebook" size={13} color="#1877F2" />
                  <Text style={[styles.itemLabel, { color: T.text }]}>{t('insights.auth_facebook', 'Facebook OAuth')}</Text>
                </View>
                <Text style={[styles.itemPct, { color: '#1877F2' }]}>{authMethodStats.facebook.pct}% <Text style={{ fontSize: 11, color: T.textMuted }}>({authMethodStats.facebook.count} comptes)</Text></Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.max(authMethodStats.facebook.pct, 2)}%`, backgroundColor: '#1877F2' }]} />
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  insightHeaderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 12,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerTitle: {
    fontFamily: Font.bold,
    fontSize: 14,
    marginBottom: 2,
  },
  bannerSub: {
    fontFamily: Font.regular,
    fontSize: 11,
    lineHeight: 15,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontFamily: Font.bold,
    fontSize: 15,
  },
  cardSubtitle: {
    fontFamily: Font.regular,
    fontSize: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemLabel: {
    fontFamily: Font.medium,
    fontSize: 12,
  },
  itemPct: {
    fontFamily: Font.bold,
    fontSize: 12,
  },
  barTrack: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  subSectionTitle: {
    fontFamily: Font.medium,
    fontSize: 12,
    marginTop: Spacing.md,
    marginBottom: 8,
  },
  severityBarContainer: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    gap: 2,
    marginBottom: 8,
  },
  severitySegment: {
    height: '100%',
    borderRadius: 2,
  },
  severityLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: Font.regular,
    fontSize: 11,
  },
  healthMetricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricTile: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  metricNumber: {
    fontFamily: Font.bold,
    fontSize: 22,
    marginBottom: 4,
  },
  metricLabel: {
    fontFamily: Font.medium,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  gridTwoCards: {
    flexDirection: 'row',
    gap: 12,
  },
  cardHalf: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
});
