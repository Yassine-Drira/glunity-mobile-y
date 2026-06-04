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
import { useLanguage } from '@/shared/context/language.context';

// SVG components import
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Text as SvgText,
} from 'react-native-svg';

type Props = NativeStackScreenProps<AppStackParamList, 'SellerStats'>;

const DAY_LABELS_7 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];



function buildAreaPath(values: number[], svgW: number, svgH: number, padLeft = 38, padRight = 16, padY = 18): { linePath: string; areaPath: string; points: [number, number][] } {
  if (!values || values.length === 0) return { linePath: '', areaPath: '', points: [] };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const allEqual = min === max;
  const range = max - min || 1;
  const stepX = (svgW - padLeft - padRight) / (values.length - 1);
  const points: [number, number][] = values.map((v, i) => {
    const x = padLeft + i * stepX;
    const y = allEqual 
      ? svgH / 2 
      : padY + ((max - v) / range) * (svgH - padY * 2 - 12); // Reserve 12px at bottom for X labels
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
  const areaPath = `${linePath} L ${last[0]},${svgH - padY - 12} L ${first[0]},${svgH - padY - 12} Z`;

  return { linePath, areaPath, points };
}

export default function SellerStatsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { theme: T } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = Math.min(windowWidth, 600);
  const { t } = useLanguage();
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
      borderRadius: 16,
      backgroundColor: T.surface,
      paddingVertical: 14,
      paddingLeft: 18,
      paddingRight: 14,
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: T.border,
      position: 'relative',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 2,
    },
    cardIndicator: {
      position: 'absolute',
      left: 0,
      top: 12,
      bottom: 12,
      width: 4,
      borderTopRightRadius: 4,
      borderBottomRightRadius: 4,
    },
    statCardWide: {
      width: '100%',
      borderRadius: 16,
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
      fontSize: 24,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
      marginTop: 4,
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
    ? (statsData?.chartData ?? [0, 0, 0, 0, 0, 0, 0])
    : (statsData?.chartData30d ?? Array(30).fill(0));

  const chartSvgW = screenWidth - 40;
  const chartSvgH = 140;
  const { linePath, areaPath, points: chartPoints } = buildAreaPath(chartValues, chartSvgW, chartSvgH, 38, 16, 18);

  // Peak point
  const maxVal = Math.max(...chartValues);
  const minVal = Math.min(...chartValues);
  const maxIdx = chartValues.indexOf(maxVal);
  const peakPoint = chartPoints[maxIdx];

  // Calculate Y-axis tick values and locations
  const rangeVal = maxVal - minVal;
  const padY = 18;
  const padLeft = 38;
  const padRight = 16;
  const yLabels: { y: number; val: number }[] = [];

  if (rangeVal === 0) {
    const baseVal = maxVal;
    // 3 ticks: base + 2, base, base - 2 (clamped at 0)
    const ticks = [baseVal + 2, baseVal, Math.max(0, baseVal - 2)];
    // Make sure we have unique values if clamp makes them equal
    const uniqueTicks = Array.from(new Set(ticks)).sort((a, b) => b - a);
    uniqueTicks.forEach((val, i) => {
      const frac = uniqueTicks.length > 1 ? i / (uniqueTicks.length - 1) : 0.5;
      yLabels.push({
        y: padY + frac * (chartSvgH - padY * 2 - 12),
        val
      });
    });
  } else {
    // 4 ticks: max, 2/3, 1/3, min
    const ticksCount = 4;
    for (let i = 0; i < ticksCount; i++) {
      const frac = i / (ticksCount - 1);
      yLabels.push({
        y: padY + frac * (chartSvgH - padY * 2 - 12),
        val: Math.round(maxVal - frac * rangeVal)
      });
    }
  }

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
      title: t('Views'),
      value: loading ? '...' : viewsShown.toLocaleString(),
      meta: timeframe === '7d' ? t('Last 7 days') : t('Last 30 days'),
      icon: 'eye',
      color: T.green,
      bg: T.greenLight,
    },
    {
      title: t('Map Clicks'),
      value: loading ? '...' : mapClicksShown.toLocaleString(),
      meta: t('Visits generated'),
      icon: 'map-pin',
      color: '#3B82F6',
      bg: 'rgba(59, 130, 246, 0.12)',
    },
    {
      title: t('Products'),
      value: loading ? '...' : (statsData?.productsCount ?? 0).toString(),
      meta: `${statsData?.certifiedGFCount ?? 0} ${t('certified GF')}`,
      icon: 'package',
      color: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.12)',
    },
    {
      title: t('Avg Price'),
      value: loading ? '...' : `${(statsData?.avgPrice ?? 0).toFixed(1)} TND`,
      meta: t('Per product'),
      icon: 'tag',
      color: '#8B5CF6',
      bg: 'rgba(139, 92, 246, 0.12)',
    },
  ];

  const timeframeLabel = timeframe === '7d' ? t('Last 7 days') : t('Last 30 days');
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
      onPressEvents={() => navigation.navigate('Events')}
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
              <View style={[s.cardIndicator, { backgroundColor: card.color }]} />
              <View style={s.statHeader}>
                <View style={[s.iconWrapper, { backgroundColor: card.bg }]}>
                  <Feather name={card.icon as any} size={15} color={card.color} />
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
          <Text style={s.sectionTitle}>{t('Views over time')}</Text>
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
                {(([['7d', t('Last 7 days')], ['30d', t('Last 30 days')]] as const)).map(([key, label]) => (
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

            {/* Grid lines & Y-axis labels */}
            {yLabels.map((lbl, i) => (
              <React.Fragment key={i}>
                <Line
                  x1={padLeft}
                  y1={lbl.y}
                  x2={chartSvgW - padRight}
                  y2={lbl.y}
                  stroke={T.border}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <SvgText
                  x={padLeft - 8}
                  y={lbl.y}
                  fill={T.textMuted}
                  fontSize={8}
                  fontFamily="Poppins_500Medium"
                  textAnchor="end"
                  alignmentBaseline="middle"
                >
                  {lbl.val}
                </SvgText>
              </React.Fragment>
            ))}

            {/* Area fill */}
            {areaPath ? <Path d={areaPath} fill="url(#grad)" /> : null}

            {/* Line */}
            {linePath ? (
              <Path d={linePath} fill="none" stroke={T.green} strokeWidth={2.5} />
            ) : null}

            {/* Data Dots & Value Labels */}
            {chartPoints.map((pt, idx) => {
              const val = chartValues[idx];
              const isPeak = idx === maxIdx;
              const showLabel = timeframe === '7d' || (timeframe === '30d' && isPeak && val > 0);

              return (
                <React.Fragment key={idx}>
                  <Circle
                    cx={pt[0]}
                    cy={pt[1]}
                    r={isPeak ? 5 : 3.5}
                    fill={isPeak ? T.surface : T.green}
                    stroke={T.green}
                    strokeWidth={isPeak ? 2.5 : 1.5}
                  />
                  {showLabel && (
                    <SvgText
                      x={pt[0]}
                      y={pt[1] - 8}
                      fill={isPeak ? T.green : T.text}
                      fontSize={8}
                      fontWeight={isPeak ? '700' : '500'}
                      fontFamily={isPeak ? 'Poppins_700Bold' : 'Poppins_500Medium'}
                      textAnchor="middle"
                    >
                      {val}
                    </SvgText>
                  )}
                </React.Fragment>
              );
            })}

            {/* X axis labels (aligned with data points inside Svg) */}
            {timeframe === '7d' && xLabels7d.map((lbl, idx) => {
              const pt = chartPoints[idx];
              if (!pt) return null;
              return (
                <SvgText
                  key={idx}
                  x={pt[0]}
                  y={chartSvgH - 4}
                  fill={T.textMuted}
                  fontSize={8}
                  fontFamily="Poppins_500Medium"
                  textAnchor="middle"
                >
                  {lbl}
                </SvgText>
              );
            })}

            {timeframe === '30d' && chartPoints.map((pt, idx) => {
              const labelDays = [0, 4, 9, 14, 19, 24, 29];
              if (!labelDays.includes(idx)) return null;
              const dayNum = idx + 1;
              return (
                <SvgText
                  key={idx}
                  x={pt[0]}
                  y={chartSvgH - 4}
                  fill={T.textMuted}
                  fontSize={8}
                  fontFamily="Poppins_500Medium"
                  textAnchor="middle"
                >
                  {dayNum}
                </SvgText>
              );
            })}
          </Svg>
        </View>

        {/* ── Rating Overview ─────────────────────────────────────────────── */}
        {(statsData?.totalReviews ?? 0) > 0 && (
          <>
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>{t('Customer reviews')}</Text>
              <Text style={{ fontSize: 11, color: T.textMuted, fontFamily: 'Poppins_500Medium' }}>
                {statsData?.totalReviews} {t('total')}
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
                  <Text style={{ fontSize: 8, color: T.textMuted, marginTop: 2 }}>{statsData?.totalReviews} {t('reviews')}</Text>
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
            <Text style={[s.sectionTitle, { marginBottom: 12 }]}>{t('Product categories')}</Text>
            <View style={[s.statCardWide, { marginBottom: 24 }]}>
              {statsData?.topCategories?.map((cat, i) => (
                <View key={i} style={s.catRow}>
                  <View style={[s.catBullet, { backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }]} />
                  <Text style={s.catName}>{cat.name}</Text>
                  <Text style={s.catCount}>{cat.count} {t('products')}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Insights ────────────────────────────────────────────────────── */}
        <Text style={[s.sectionTitle, { marginBottom: 12 }]}>{t('Insights')}</Text>
        <View style={s.insightsList}>

          {/* Most reviewed product */}
          <View style={s.insightCard}>
            <View style={s.insightIconBox}>
              <Feather name="trending-up" size={17} color={T.green} />
            </View>
            <View style={s.insightTexts}>
              <Text style={s.insightLabel}>{t('Most reviewed product')}</Text>
              <Text style={s.insightValue}>{loading ? '...' : (statsData?.mostViewedProduct ?? '—')}</Text>
            </View>
          </View>

          {/* Top interaction day */}
          <View style={s.insightCard}>
            <View style={s.insightIconBox}>
              <Feather name="calendar" size={17} color={T.green} />
            </View>
            <View style={s.insightTexts}>
              <Text style={s.insightLabel}>{t('Peak interaction day')}</Text>
              <Text style={s.insightValue}>{loading ? '...' : (statsData?.topInteractionDay ?? '—')}</Text>
            </View>
          </View>

          {/* Certified GF */}
          <View style={s.insightCard}>
            <View style={s.insightIconBox}>
              <Feather name="check-circle" size={17} color={T.green} />
            </View>
            <View style={s.insightTexts}>
              <Text style={s.insightLabel}>{t('Certified gluten-free products')}</Text>
              <Text style={s.insightValue}>
                {loading ? '...' : `${statsData?.certifiedGFCount ?? 0} / ${statsData?.productsCount ?? 0} ${t('products')}`}
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
              <Text style={s.insightLabel}>{t('Member since')}</Text>
              <Text style={s.insightValue}>
                {loading ? '...' : statsData?.memberSince ?? '—'}
              </Text>
              {!loading && (statsData?.accountAgeDays ?? 0) > 0 && (
                <Text style={s.insightLabel}>{statsData?.accountAgeDays} {t('days on Glunity')}</Text>
              )}
            </View>
          </View>

        </View>

        <View style={{ height: 110 }} />
      </ScrollView>
    </AppScaffold>
  );
}
