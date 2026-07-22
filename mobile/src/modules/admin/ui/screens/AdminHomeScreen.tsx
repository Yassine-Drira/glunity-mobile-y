import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, RefreshControl, useWindowDimensions, ActivityIndicator } from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../shared/context/theme.context';
import { Colors, Font, Spacing, Radius } from '../../../../shared/utils/theme';
import { useAuth } from '../../../auth/state/auth.context';
import { useAdminDashboard, DashboardPeriod } from '../../hooks/useAdminDashboard';

// Components
import { KpiCard } from '../components/KpiCard';
import { SectionHeader } from '../components/SectionHeader';
import { AreaChart } from '../components/AreaChart';
import { DonutChart } from '../components/DonutChart';
import { BarChart } from '../components/BarChart';
import { SparklineChart } from '../components/SparklineChart';
import { SkeletonCard } from '../components/SkeletonCard';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { ModerationPreview } from '../components/ModerationPreview';
import { RecentRegistrations } from '../components/RecentRegistrations';
import { TopXpLeaderboard } from '../components/TopXpLeaderboard';
import { PlatformHealth } from '../components/PlatformHealth';
import { DauWauMau } from '../components/DauWauMau';
import { RegistrationInsights } from '../components/RegistrationInsights';
import { AdminSettingsModal } from '../components/AdminSettingsModal';

import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../../../../shared/context/language.context';

export function AdminHomeScreen({ navigation }: any) {
  const rootNavigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const { theme: T, isDark, setDark } = useTheme();
  const { user, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const { stats, loading, isRevalidating, error, period, changePeriod, refresh, lastSyncAt } = useAdminDashboard();
  const [activeTab, setActiveTab] = React.useState<'overview' | 'health' | 'engagement' | 'all'>('overview');
  const [settingsModalVisible, setSettingsModalVisible] = React.useState(false);

  const primaryGreen = Colors.green || '#8BC34A';

  // Computed Values
  const celiacCount = stats?.userDistribution?.celiac ?? 0;
  const sellerCount = stats?.userDistribution?.seller ?? 0;
  const healthCount = stats?.userDistribution?.health ?? 0;
  const nonAdminTotal = celiacCount + sellerCount + healthCount;

  const totalForDonut = nonAdminTotal > 0 ? nonAdminTotal : 1;
  const celiacPct = Math.round((celiacCount / totalForDonut) * 100);
  const sellerPct = Math.round((sellerCount / totalForDonut) * 100);
  const healthPct = nonAdminTotal > 0 ? Math.max(0, 100 - celiacPct - sellerPct) : 0;

  const renderContent = () => {
    if (error && !stats) {
      return (
        <View style={{ padding: Spacing.md }}>
          <ErrorState message="Erreur de connexion aux serveurs d'analyse" onRetry={refresh} />
        </View>
      );
    }

    if (loading && !stats) {
      return (
        <View style={{ padding: Spacing.md }}>
          <View style={styles.metricsGrid}>
            <SkeletonCard width="48%" height={120} />
            <SkeletonCard width="48%" height={120} />
            <SkeletonCard width="48%" height={120} />
            <SkeletonCard width="48%" height={120} />
          </View>
          <SkeletonCard height={150} />
          <SkeletonCard height={200} />
          <SkeletonCard height={200} />
        </View>
      );
    }

    // Charts Data Prep
    const areaChartData = stats?.registrationsByDay?.map((d: any) => d.count) || [];
    const areaChartLabels = stats?.registrationsByDay?.map((d: any) => d.date) || [];
    const donutData = [
      { value: celiacPct, color: primaryGreen },
      { value: sellerPct, color: '#3B82F6' },
      { value: healthPct, color: '#F59E0B' },
    ];
    const categoryDonutData = (stats?.contentCategories?.filter((c: any) => c.percentage > 0) || []).map((c: any) => ({ value: c.percentage, color: c.color }));
    
    const weeklyBarData = stats?.activityTimeline?.map((day: any) => ({
      label: day.day,
      values: [
        { value: day.patients || 0, color: '#3B82F6' },
        { value: day.events || 0, color: '#8BC34A' },
        { value: day.reels || 0, color: '#EC4899' },
        { value: day.moderations || 0, color: '#F59E0B' }
      ]
    })) || [];

    const isOverview = activeTab === 'overview' || activeTab === 'all';
    const isHealth = activeTab === 'health' || activeTab === 'all';
    const isEngagement = activeTab === 'engagement' || activeTab === 'all';

    return (
      <View style={styles.contentPad}>
        {/* Active Period Insight Banner */}
        <View style={[styles.periodInsightBanner, { backgroundColor: isDark ? '#1C1C1E' : '#F0F9FF', borderColor: isDark ? 'rgba(59,130,246,0.3)' : '#BAE6FD' }]}>
          <Feather name="bar-chart-2" size={16} color="#0284C7" />
          <Text style={[styles.periodInsightText, { color: isDark ? '#7DD3FC' : '#0369A1' }]}>
            {t('insight.banner_prefix', 'Stats pour')} <Text style={{ fontFamily: Font.bold }}>{stats?.periodLabel || '7 derniers jours'}</Text> : <Text style={{ fontFamily: Font.bold }}>+{stats?.newUsersInPeriod || 0}</Text> {t('insight.registered', 'inscrits')}, <Text style={{ fontFamily: Font.bold }}>+{stats?.contentSubmittedInPeriod || 0}</Text> {t('insight.created', 'contenus créés')}
          </Text>
        </View>

        {/* 🧬 SECTION: Health & Questionnaire Insights */}
        {isHealth && (
          <>
            <SectionHeader title={t('heading.patient_questionnaires', 'Questionnaires Patients & Santé Cœliaque')} subtitle={t('heading.clinical_analysis_sub', 'Analyses cliniques et symptômes post-ingestion de gluten')} />
            <RegistrationInsights
              stats={stats?.questionnaireStats}
              authMethodStats={stats?.authMethodStats}
              totalUsers={stats?.totalUsers}
            />
          </>
        )}

        {/* 📊 SECTION: Executive KPIs & Growth */}
        {isOverview && (
          <>
            {/* Platform Health */}
            <SectionHeader title={t('heading.platform_health', 'Santé de la Plateforme')} subtitle={t('kpi.db_status', 'Mesures système')} />
            <PlatformHealth health={stats?.platformHealth} />

            {/* KPI Row */}
            <View style={styles.metricsGrid}>
              {/* Card 1: Nouveaux Inscrits sur la Période */}
              <KpiCard
                title={`${t('kpi.new_users', 'Inscrits')} (${stats?.periodLabel || 'Période'})`}
                value={`+${stats?.newUsersInPeriod || 0}`}
                icon={<Ionicons name="person-add" size={20} color="#3B82F6" />}
                iconBgColor="rgba(59, 130, 246, 0.12)"
                badge={
                  <View style={[styles.trendBadge, { backgroundColor: (stats?.usersGrowth || 0) >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
                    <Feather name={(stats?.usersGrowth || 0) >= 0 ? "trending-up" : "trending-down"} size={10} color={(stats?.usersGrowth || 0) >= 0 ? "#10B981" : "#EF4444"} />
                    <Text style={{ color: (stats?.usersGrowth || 0) >= 0 ? '#10B981' : '#EF4444', fontSize: 10, fontFamily: Font.bold, marginLeft: 2 }}>
                      {(stats?.usersGrowth || 0) >= 0 ? `+${stats?.usersGrowth}%` : `${stats?.usersGrowth}%`}
                    </Text>
                  </View>
                }
                subDetail="vs fenêtre précédente"
              />

              {/* Card 2: Contenus Créés sur la Période */}
              <KpiCard
                title={`${t('heading.content_split', 'Contenus')} (${stats?.periodLabel || 'Période'})`}
                value={`+${stats?.contentSubmittedInPeriod || 0}`}
                icon={<MaterialCommunityIcons name="folder-plus-outline" size={20} color="#8B5CF6" />}
                iconBgColor="rgba(139, 92, 246, 0.12)"
                subDetail={`${stats?.pendingModeration?.total || 0} en attente modération`}
                onPress={() => navigation.navigate('AdminModeration')}
              />

              {/* Card 3: Utilisateurs Totaux (Base) */}
              <KpiCard
                title={t('kpi.total_users', "Base d'Utilisateurs")}
                value={stats?.totalUsers?.toLocaleString() || '0'}
                icon={<Ionicons name="people" size={20} color={primaryGreen} />}
                iconBgColor={Colors.greenLight}
                subDetail={`${stats?.userDistribution?.celiac || 0} patients cœliaques`}
              />

              {/* Card 4: Vendeurs Vérifiés */}
              <KpiCard
                title={t('tab.shops', 'Vendeurs & Boutiques')}
                value={stats?.verifiedSellers || '0'}
                icon={<MaterialCommunityIcons name="storefront" size={20} color="#F59E0B" />}
                iconBgColor="rgba(245, 158, 11, 0.12)"
                badge={<Text style={{ color: '#F59E0B', fontSize: 10, fontFamily: Font.bold }}>{stats?.pendingSellersCount || 0} dossier(s)</Text>}
                onPress={() => navigation.navigate('AdminSellerVerification')}
              >
                <View style={styles.progressMeterBg}>
                  <View style={[styles.progressMeterFill, { width: `${Math.round(((stats?.verifiedSellers || 0) / Math.max(((stats?.verifiedSellers || 0) + (stats?.pendingSellersCount || 0)), 1)) * 100)}%`, backgroundColor: '#F59E0B' }]} />
                </View>
              </KpiCard>
            </View>

            {/* Growth Area Chart */}
            <SectionHeader title={t('heading.registrations_trend', 'Inscriptions au fil du temps')} />
            <View style={[styles.chartCard, { backgroundColor: isDark ? '#1C1C1E' : Colors.white, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              {areaChartData.length > 0 ? (
                <AreaChart data={areaChartData} labels={areaChartLabels} width={width - 64} height={180} color="#3B82F6" />
              ) : (
                <EmptyState message="Pas de nouvelles inscriptions" icon="trending-up" />
              )}
            </View>

            {/* Demographics Donut */}
            <SectionHeader title={t('insights.dietary_profiles', 'Répartition des profils')} />
            <View style={[styles.chartCard, { backgroundColor: isDark ? '#1C1C1E' : Colors.white, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <DonutChart data={donutData} size={120} />
                <View style={{ marginLeft: Spacing.lg, flex: 1 }}>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: primaryGreen }]} />
                    <Text style={[styles.legendText, { color: T.text }]}>Patients Cœliaques ({celiacPct}%)</Text>
                  </View>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                    <Text style={[styles.legendText, { color: T.text }]}>Vendeurs ({sellerPct}%)</Text>
                  </View>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                    <Text style={[styles.legendText, { color: T.text }]}>Professionnels ({healthPct}%)</Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Engagement & XP */}
        {isEngagement && (
          <>
            <SectionHeader title={t('section.engagement', 'Engagement & Gamification')} subtitle="Utilisateurs Actifs & Top Performers" />
            {stats?.activeUsers ? (
              <DauWauMau data={stats.activeUsers} />
            ) : null}
            {stats?.topByXp && stats.topByXp.length > 0 ? (
              <TopXpLeaderboard users={stats.topByXp as any} />
            ) : (
              <EmptyState icon="award" message="Aucune donnée XP disponible" />
            )}
          </>
        )}

        {isOverview && (
          <>
            {/* Content Analytics */}
            <SectionHeader title={t('heading.platform_health', 'Activité de la Plateforme')} subtitle={`Activité par période (${stats?.periodLabel || 'période'})`} />
            <View style={[styles.chartCard, { backgroundColor: isDark ? '#1C1C1E' : Colors.white, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', paddingTop: Spacing.xl }]}>
              <View style={styles.chartLegendGrid}>
                <View style={styles.chartLegendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                  <Text style={[styles.legendText, { color: T.text, fontSize: 10 }]}>Inscriptions</Text>
                </View>
                <View style={styles.chartLegendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#8BC34A' }]} />
                  <Text style={[styles.legendText, { color: T.text, fontSize: 10 }]}>Événements</Text>
                </View>
                <View style={styles.chartLegendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#EC4899' }]} />
                  <Text style={[styles.legendText, { color: T.text, fontSize: 10 }]}>Reels</Text>
                </View>
                <View style={styles.chartLegendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={[styles.legendText, { color: T.text, fontSize: 10 }]}>Modérations</Text>
                </View>
              </View>
              {weeklyBarData.length > 0 ? (
                <BarChart data={weeklyBarData} height={140} maxHeight={100} />
              ) : (
                <EmptyState icon="bar-chart-2" />
              )}
            </View>

            <SectionHeader title={t('heading.content_split', 'Répartition des Contenus')} />
            <View style={[styles.chartCard, { backgroundColor: isDark ? '#1C1C1E' : Colors.white, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <DonutChart data={categoryDonutData} size={100} />
                <View style={{ marginLeft: Spacing.lg, flex: 1 }}>
                  {(stats?.contentCategories?.filter((c: any) => c.percentage > 0) || []).map((c: any) => (
                    <View key={c.name} style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: c.color }]} />
                      <Text style={[styles.legendText, { color: T.text }]}>{c.name} ({c.percentage}%)</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Moderation Preview */}
            <SectionHeader title={t('heading.moderation_queue', "File d'attente de Modération")} />
            {stats?.moderationPreview && stats.moderationPreview.length > 0 ? (
              <ModerationPreview items={stats.moderationPreview} onViewAll={() => navigation.navigate('AdminModeration')} />
            ) : (
              <EmptyState icon="check-circle" message="La file d'attente est vide" />
            )}

            {/* Recent Registrations */}
            <SectionHeader title={t('heading.recent_registrations', 'Nouvelles Inscriptions')} />
            {stats?.recentRegistrations && stats.recentRegistrations.length > 0 ? (
              <RecentRegistrations users={stats.recentRegistrations} />
            ) : (
              <EmptyState icon="users" message="Aucune inscription récente" />
            )}
          </>
        )}

      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? '#1C1C1E' : Colors.white, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.adminAvatar, { backgroundColor: primaryGreen }]}>
            <MaterialCommunityIcons name="shield-crown" size={20} color="#FFF" />
          </View>
          <View>
            <View style={styles.adminTitleRow}>
              <Text style={[styles.appName, { color: T.text }]}>Glu10</Text>
              <View style={[styles.badgeAdmin, { backgroundColor: Colors.greenLight }]}>
                <Text style={[styles.badgeAdminText, { color: primaryGreen }]}>ANALYTICS AVANCÉES</Text>
              </View>
            </View>
            <Text style={[styles.adminSub, { color: T.textMuted }]}>
              {user?.fullName || 'Super Administrateur'}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.syncDot, { backgroundColor: isRevalidating ? '#F59E0B' : primaryGreen }]} />
          {/* 3-Dots Quick Settings Menu Trigger */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.headerBtn, { backgroundColor: isDark ? '#2C2C2E' : 'rgba(46,46,46,0.06)' }]}
            onPress={() => setSettingsModalVisible(true)}
          >
            <Feather name="more-vertical" size={18} color={T.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Settings Dropdown Modal */}
      <AdminSettingsModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
        isDark={isDark}
        setDark={setDark}
        logout={logout}
        onNavigateUserSpace={() => {
          setSettingsModalVisible(false);
          rootNavigation.navigate('Home');
        }}
        user={user}
      />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading && !stats} onRefresh={refresh} tintColor={primaryGreen} />}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Sticky Period Selector Bar */}
        <View style={[styles.periodBarContainer, { backgroundColor: T.bg }]}>
          <View style={styles.periodHeaderRow}>
            <Text style={[styles.periodBarTitle, { color: T.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{t('period.title', "Période d'Analyse Analytics")}</Text>
            {isRevalidating ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <ActivityIndicator size="small" color="#F59E0B" />
                <Text style={[styles.syncText, { color: '#F59E0B', fontFamily: Font.bold }]}>{t('admin.syncing', 'Synchro...')}</Text>
              </View>
            ) : lastSyncAt ? (
              <Text style={[styles.syncText, { color: T.textMuted }]} numberOfLines={1}>
                {t('admin.updated_at', 'Mis à jour à')} {lastSyncAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </Text>
            ) : null}
          </View>
          <View style={[styles.periodPillsRow, { backgroundColor: isDark ? '#1C1C1E' : Colors.white }]}>
            {[
              { id: 'today', label: t('period.pill_today', 'Auj.') },
              { id: '7d', label: t('period.pill_7d', '7 jours') },
              { id: '30d', label: t('period.pill_30d', '30 jours') },
              { id: '3m', label: t('period.pill_3m', '3 mois') },
              { id: '1y', label: t('period.pill_1y', '1 an') },
            ].map((p) => {
              const isActive = period === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.periodPill, { backgroundColor: isActive ? primaryGreen : 'transparent' }]}
                  onPress={() => changePeriod(p.id as DashboardPeriod)}
                >
                  <Text
                    style={[styles.periodPillText, { color: isActive ? '#FFF' : T.textMuted, fontWeight: isActive ? Font.bold : Font.medium }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Section Navigator Bar with Vector Icons */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ paddingRight: Spacing.md }}>
            <View style={[styles.sectionTabsRow, { backgroundColor: isDark ? '#1C1C1E' : Colors.white }]}>
              {[
                { id: 'overview', label: t('section.overview', 'Aperçu Général'), icon: (color: string) => <Feather name="bar-chart-2" size={14} color={color} /> },
                { id: 'health', label: t('section.health', 'Santé & Symptômes'), icon: (color: string) => <MaterialCommunityIcons name="heart-pulse" size={15} color={color} /> },
                { id: 'engagement', label: t('section.engagement', 'Engagement & XP'), icon: (color: string) => <Feather name="zap" size={14} color={color} /> },
                { id: 'all', label: t('section.all', 'Vue Complète'), icon: (color: string) => <Feather name="layers" size={14} color={color} /> },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                const iconColor = isActive ? '#FFFFFF' : T.textMuted;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.sectionTab, { backgroundColor: isActive ? primaryGreen : 'transparent' }]}
                    onPress={() => setActiveTab(tab.id as any)}
                  >
                    {tab.icon(iconColor)}
                    <Text style={[styles.sectionTabText, { color: iconColor, fontWeight: isActive ? Font.bold : Font.medium }]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {renderContent()}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminAvatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  adminTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  appName: {
    fontFamily: Font.bold,
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  badgeAdmin: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  badgeAdminText: {
    fontFamily: Font.bold,
    fontSize: 9,
  },
  adminSub: {
    fontFamily: Font.regular,
    fontSize: 13,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.sm,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  periodBarContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    zIndex: 10,
  },
  periodHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
  },
  periodBarTitle: {
    fontFamily: Font.bold,
    fontSize: 16,
  },
  syncText: {
    fontFamily: Font.regular,
    fontSize: 11,
  },
  periodPillsRow: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    padding: 4,
  },
  periodPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.md - 2,
    alignItems: 'center',
  },
  periodPillText: {
    fontFamily: Font.medium,
    fontSize: 13,
  },
  contentPad: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  periodInsightBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: 8,
  },
  periodInsightText: {
    fontFamily: Font.medium,
    fontSize: 12,
    flex: 1,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  progressMeterBg: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 2,
    marginTop: Spacing.sm,
    width: '100%',
    overflow: 'hidden',
  },
  progressMeterFill: {
    height: '100%',
    borderRadius: 2,
  },
  chartCard: {
    padding: Spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  chartLegendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    paddingHorizontal: 4,
  },
  chartLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  legendText: {
    fontFamily: Font.regular,
    fontSize: 12,
  },
  sectionTabsRow: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: Radius.md,
    gap: 4,
  },
  sectionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.sm,
    gap: 6,
  },
  sectionTabText: {
    fontSize: 12,
  },
});
