import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { Radius } from '@/shared/utils/theme';
import { Feather } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';
import { useAuth } from '../../../auth/state/auth.context';
import { useTheme } from '@/shared/context/theme.context';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { useFocusEffect } from '@react-navigation/native';
import authApi, { SellerStats } from '../../../auth/api/auth.api';

// SVG components import
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Line,
} from 'react-native-svg';

type Props = NativeStackScreenProps<AppStackParamList, 'SellerStats'>;

const DAY_LABELS_7 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];



function buildAreaPath(values: number[], svgW: number, svgH: number, padX = 20, padY = 14): { linePath: string; areaPath: string; points: [number, number][] } {
  if (!values || values.length === 0) return { linePath: '', areaPath: '', points: [] };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const allEqual = min === max;
  const range = max - min || 1;
  const stepX = (svgW - padX * 2) / (values.length - 1);
  const points: [number, number][] = values.map((v, i) => {
    const x = padX + i * stepX;
    const y = allEqual 
      ? svgH / 2 
      : padY + ((max - v) / range) * (svgH - padY * 2);
    return [x, y];
  });

  let linePath = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpX = (prev[0] + curr[0]) / 2;
    linePath += ` C ${cpX},${prev[1]} ${cpX},${curr[1]} ${curr[0]},${curr[1]}`;
  }
  const last = points[points.length - 1];
  const first = points[0];
  const areaPath = `${linePath} L ${last[0]},${svgH - padY} L ${first[0]},${svgH - padY} Z`;

  return { linePath, areaPath, points };
}

export default function SellerStatsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { theme: T } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = Math.min(windowWidth, 600);
  const [timeframe, setTimeframe] = useState<'7d' | '30d'>('7d');
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false);

  const [statsData, setStatsData] = useState<SellerStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await authApi.getSellerStats();
      setStatsData(res);
    } catch (err) {
      console.error('Error fetching seller stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchStats();
      return undefined;
    }, [])
  );

  const s = React.useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: T.bg },
    flex: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 16 },

    // ── Stats Grid ──────────────────────────────────────────────────────────
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 24,
    },
    statCard: {
      width: (screenWidth - 52) / 2,
      borderRadius: 20,
      backgroundColor: T.surface,
      padding: 14,
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: T.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 2,
    },
    statCardWide: {
      width: '100%',
      borderRadius: 20,
      backgroundColor: T.surface,
      padding: 14,
      borderWidth: 1,
      borderColor: T.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 2,
    },
    statHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    iconWrapper: {
      width: 30,
      height: 30,
      borderRadius: 8,
      backgroundColor: T.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statTitle: {
      fontSize: 10,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statValue: {
      fontSize: 22,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
    },
    statMeta: {
      fontSize: 9,
      fontWeight: '500',
      fontFamily: 'Poppins_500Medium',
      color: T.textMuted,
      marginTop: 2,
    },

    // ── Section Title ───────────────────────────────────────────────────────
    sectionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      zIndex: 10,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
    },

    // ── Timeframe dropdown ──────────────────────────────────────────────────
    dropdownContainer: { position: 'relative', zIndex: 20 },
    timeframeSelect: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: T.surface,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: T.border,
      gap: 4,
    },
    timeframeText: { fontSize: 10, fontFamily: 'Poppins_500Medium', color: T.text },
    dropdownBox: {
      position: 'absolute',
      top: 32,
      right: 0,
      width: 110,
      backgroundColor: T.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: T.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 8,
      zIndex: 30,
    },
    dropdownItem: { paddingVertical: 9, paddingHorizontal: 12 },
    dropdownText: { fontSize: 11, color: T.textMuted, fontFamily: 'Poppins_500Medium' },

    // ── Chart ───────────────────────────────────────────────────────────────
    chartWrapper: {
      backgroundColor: T.surface,
      borderRadius: 20,
      padding: 14,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: T.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    chartLegendRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    chartLegendLabel: {
      fontSize: 9,
      color: T.textMuted,
      fontFamily: 'Poppins_500Medium',
      textAlign: 'center',
      flex: 1,
    },

    // ── Rating distribution ─────────────────────────────────────────────────
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
      gap: 8,
    },
    ratingLabel: { fontSize: 10, color: T.textMuted, width: 14, textAlign: 'right' },
    ratingBarBg: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      backgroundColor: T.surfaceAlt,
      overflow: 'hidden',
    },
    ratingBarFill: { height: 6, borderRadius: 3, backgroundColor: T.green },
    ratingCount: { fontSize: 10, color: T.textMuted, width: 22, textAlign: 'right' },

    // ── Categories ──────────────────────────────────────────────────────────
    catRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 8,
    },
    catBullet: {
      width: 8, height: 8, borderRadius: 4,
    },
    catName: { flex: 1, fontSize: 11, color: T.text, fontFamily: 'Poppins_500Medium' },
    catCount: { fontSize: 11, color: T.textMuted, fontFamily: 'Poppins_500Medium' },

    // ── Insights ────────────────────────────────────────────────────────────
    insightsList: { gap: 10 },
    insightCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: T.surface,
      borderRadius: Radius.lg,
      padding: 12,
      borderWidth: 1,
      borderColor: T.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 3,
      elevation: 1,
    },
    insightIconBox: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: T.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    insightTexts: { flex: 1 },
    insightLabel: { fontSize: 9, color: T.textMuted, marginBottom: 2 },
    insightValue: {
      fontSize: 12,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
    },
    insightValueGreen: {
      fontSize: 12,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.green,
    },
  }), [T, screenWidth]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading && !statsData) {
    return (
      <AppScaffold
        title="Your visibility"
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
        contentStyle={{ backgroundColor: T.bg }}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: T.bg }}>
          <ActivityIndicator size="large" color={T.green} />
        </View>
      </AppScaffold>
    );
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const chartValues = timeframe === '7d'
    ? (statsData?.chartData ?? [150, 150, 150, 150, 150, 150, 150])
    : (statsData?.chartData30d ?? Array(30).fill(150));

  const chartSvgW = screenWidth - 40;
  const chartSvgH = 130;
  const { linePath, areaPath, points: chartPoints } = buildAreaPath(chartValues, chartSvgW, chartSvgH, 24, 12);

  // Peak point
  const maxVal = Math.max(...chartValues);
  const maxIdx = chartValues.indexOf(maxVal);
  const peakPoint = chartPoints[maxIdx];

  // Views shown depend on timeframe
  const viewsShown = timeframe === '7d'
    ? (statsData?.views ?? 0)
    : (statsData?.viewsLast30Days ?? 0);
  const mapClicksShown = timeframe === '7d'
    ? (statsData?.mapClicks ?? 0)
    : (statsData?.mapClicksLast30Days ?? 0);

  const ratingDist = statsData?.ratingDistribution ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const totalRatings = Object.values(ratingDist).reduce((a, b) => a + b, 0);

  const CAT_COLORS = [T.green, '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6'];

  const statCards = [
    {
      title: 'Views',
      value: loading ? '...' : viewsShown.toLocaleString(),
      meta: timeframe === '7d' ? 'Last 7 days' : 'Last 30 days',
      icon: 'eye',
    },
    {
      title: 'Map Clicks',
      value: loading ? '...' : mapClicksShown.toLocaleString(),
      meta: 'Visits generated',
      icon: 'map-pin',
    },
    {
      title: 'Products',
      value: loading ? '...' : (statsData?.productsCount ?? 0).toString(),
      meta: `${statsData?.certifiedGFCount ?? 0} certified GF`,
      icon: 'package',
    },
    {
      title: 'Avg Price',
      value: loading ? '...' : `${(statsData?.avgPrice ?? 0).toFixed(1)} TND`,
      meta: 'Per product',
      icon: 'tag',
    },
  ];

  const timeframeLabel = timeframe === '7d' ? 'Last 7 days' : 'Last 30 days';
  const xLabels7d = statsData?.chartLabels ?? DAY_LABELS_7;
  const xLabels = timeframe === '7d'
    ? xLabels7d
    : ['1', '5', '10', '15', '20', '25', '30'];

  return (
    <AppScaffold
      title="Your visibility"
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
      contentStyle={{ backgroundColor: T.bg }}
    >
      <ScrollView
        style={s.flex}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── KPI Cards ─────────────────────────────────────────────────── */}
        <View style={s.statsGrid}>
          {statCards.map((card, idx) => (
            <View key={idx} style={s.statCard}>
              <View style={s.statHeader}>
                <View style={s.iconWrapper}>
                  <Feather name={card.icon as any} size={15} color={T.green} />
                </View>
                <Text style={s.statTitle}>{card.title}</Text>
              </View>
              <Text style={s.statValue}>{card.value}</Text>
              <Text style={s.statMeta}>{card.meta}</Text>
            </View>
          ))}
        </View>

        {/* ── Chart ──────────────────────────────────────────────────────── */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Views over time</Text>
          <View style={s.dropdownContainer}>
            <TouchableOpacity
              id="btn-timeframe-dropdown"
              style={s.timeframeSelect}
              activeOpacity={0.8}
              onPress={() => setShowTimeframeDropdown(!showTimeframeDropdown)}
            >
              <Text style={s.timeframeText}>{timeframeLabel}</Text>
              <Feather name="chevron-down" size={11} color={T.textMuted} />
            </TouchableOpacity>
            {showTimeframeDropdown && (
              <View style={s.dropdownBox}>
                {([['7d', 'Last 7 days'], ['30d', 'Last 30 days']] as const).map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    style={s.dropdownItem}
                    onPress={() => { setTimeframe(key); setShowTimeframeDropdown(false); }}
                  >
                    <Text style={[s.dropdownText, timeframe === key && { color: T.green, fontWeight: '700' }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={s.chartWrapper}>
          <Svg width={chartSvgW} height={chartSvgH} style={{ overflow: 'visible' }}>
            <Defs>
              <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={T.green} stopOpacity={0.22} />
                <Stop offset="100%" stopColor={T.green} stopOpacity={0.0} />
              </LinearGradient>
            </Defs>

            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map((frac, i) => (
              <Line
                key={i}
                x1={24} y1={12 + frac * (chartSvgH - 24)}
                x2={chartSvgW - 8} y2={12 + frac * (chartSvgH - 24)}
                stroke={T.border} strokeWidth={1}
              />
            ))}

            {/* Area fill */}
            {areaPath ? <Path d={areaPath} fill="url(#grad)" /> : null}

            {/* Line */}
            {linePath ? (
              <Path d={linePath} fill="none" stroke={T.green} strokeWidth={2.5} />
            ) : null}

            {/* Peak dot */}
            {peakPoint && (
              <>
                <Circle cx={peakPoint[0]} cy={peakPoint[1]} r={5} fill={T.surface} stroke={T.green} strokeWidth={2.5} />
              </>
            )}
          </Svg>

          {/* X axis labels */}
          <View style={s.chartLegendRow}>
            {(timeframe === '7d' ? xLabels7d : ['1', '', '5', '', '10', '', '15', '', '20', '', '25', '', '30']).map((lbl: string, i: number) => (
              <Text key={i} style={s.chartLegendLabel}>{lbl}</Text>
            ))}
          </View>
        </View>

        {/* ── Rating Overview ─────────────────────────────────────────────── */}
        {(statsData?.totalReviews ?? 0) > 0 && (
          <>
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>Customer reviews</Text>
              <Text style={{ fontSize: 11, color: T.textMuted, fontFamily: 'Poppins_500Medium' }}>
                {statsData?.totalReviews} total
              </Text>
            </View>
            <View style={[s.statCardWide, { marginBottom: 24 }]}>
              {/* Big rating + distribution */}
              <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                <View style={{ alignItems: 'center', minWidth: 56 }}>
                  <Text style={{ fontSize: 38, fontWeight: '700', fontFamily: 'Poppins_700Bold', color: T.green, lineHeight: 44 }}>
                    {statsData?.rating ?? '—'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <Feather
                        key={star}
                        name="star"
                        size={10}
                        color={parseFloat(statsData?.rating ?? '0') >= star ? '#F59E0B' : T.border}
                      />
                    ))}
                  </View>
                  <Text style={{ fontSize: 8, color: T.textMuted, marginTop: 2 }}>{statsData?.totalReviews} reviews</Text>
                </View>
                <View style={{ flex: 1 }}>
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = ratingDist[star as 1 | 2 | 3 | 4 | 5] ?? 0;
                    const pct = totalRatings > 0 ? count / totalRatings : 0;
                    return (
                      <View key={star} style={s.ratingRow}>
                        <Text style={s.ratingLabel}>{star}</Text>
                        <View style={s.ratingBarBg}>
                          <View style={[s.ratingBarFill, { width: `${pct * 100}%` }]} />
                        </View>
                        <Text style={s.ratingCount}>{count}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </>
        )}

        {/* ── Categories Breakdown ─────────────────────────────────────────── */}
        {(statsData?.topCategories?.length ?? 0) > 0 && (
          <>
            <Text style={[s.sectionTitle, { marginBottom: 12 }]}>Product categories</Text>
            <View style={[s.statCardWide, { marginBottom: 24 }]}>
              {statsData?.topCategories?.map((cat, i) => (
                <View key={i} style={s.catRow}>
                  <View style={[s.catBullet, { backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }]} />
                  <Text style={s.catName}>{cat.name}</Text>
                  <Text style={s.catCount}>{cat.count} products</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Insights ────────────────────────────────────────────────────── */}
        <Text style={[s.sectionTitle, { marginBottom: 12 }]}>Insights</Text>
        <View style={s.insightsList}>

          {/* Most reviewed product */}
          <View style={s.insightCard}>
            <View style={s.insightIconBox}>
              <Feather name="trending-up" size={17} color={T.green} />
            </View>
            <View style={s.insightTexts}>
              <Text style={s.insightLabel}>Most reviewed product</Text>
              <Text style={s.insightValue}>{loading ? '...' : (statsData?.mostViewedProduct ?? '—')}</Text>
            </View>
          </View>

          {/* Top interaction day */}
          <View style={s.insightCard}>
            <View style={s.insightIconBox}>
              <Feather name="calendar" size={17} color={T.green} />
            </View>
            <View style={s.insightTexts}>
              <Text style={s.insightLabel}>Peak interaction day</Text>
              <Text style={s.insightValue}>{loading ? '...' : (statsData?.topInteractionDay ?? '—')}</Text>
            </View>
          </View>

          {/* Certified GF */}
          <View style={s.insightCard}>
            <View style={s.insightIconBox}>
              <Feather name="check-circle" size={17} color={T.green} />
            </View>
            <View style={s.insightTexts}>
              <Text style={s.insightLabel}>Certified gluten-free products</Text>
              <Text style={s.insightValue}>
                {loading ? '...' : `${statsData?.certifiedGFCount ?? 0} / ${statsData?.productsCount ?? 0} products`}
              </Text>
            </View>
            {!loading && (statsData?.certifiedGFCount ?? 0) > 0 && (
              <Text style={[s.insightValueGreen, { marginLeft: 6 }]}>✓</Text>
            )}
          </View>

          {/* Member since */}
          <View style={s.insightCard}>
            <View style={s.insightIconBox}>
              <Feather name="clock" size={17} color={T.green} />
            </View>
            <View style={s.insightTexts}>
              <Text style={s.insightLabel}>Member since</Text>
              <Text style={s.insightValue}>
                {loading ? '...' : statsData?.memberSince ?? '—'}
              </Text>
              {!loading && (statsData?.accountAgeDays ?? 0) > 0 && (
                <Text style={s.insightLabel}>{statsData?.accountAgeDays} days on Glunity</Text>
              )}
            </View>
          </View>

        </View>

        <View style={{ height: 110 }} />
      </ScrollView>
    </AppScaffold>
  );
}
