import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';
import { useAuth } from '../../../auth/state/auth.context';
import { useTheme } from '@/shared/context/theme.context';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { useFocusEffect } from '@react-navigation/native';
import authApi, { SellerStats } from '../../../auth/api/auth.api';
import { useLanguage } from '@/shared/context/language.context';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line, Text as SvgText, Rect } from 'react-native-svg';

let BlurView: any;
try { BlurView = require('expo-blur').BlurView; } catch (e) { BlurView = null; }

type Props = NativeStackScreenProps<AppStackParamList, 'SellerStats'>;
const DAY_LABELS_7 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildAreaPath(values: number[], svgW: number, svgH: number, padLeft = 38, padRight = 16, padY = 18): { linePath: string; areaPath: string; points: [number, number][] } {
  if (!values || values.length === 0) return { linePath: '', areaPath: '', points: [] };
  const min = 0; const max = Math.max(...values);
  const allEqual = max === 0; const range = max - min || 1;
  const stepX = (svgW - padLeft - padRight) / (values.length - 1);
  const points: [number, number][] = values.map((v, i) => {
    const x = padLeft + i * stepX;
    const y = allEqual
      ? svgH - padY - 12
      : padY + ((max - v) / range) * (svgH - padY * 2 - 12);
    return [x, y];
  });
  let linePath = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]; const curr = points[i]; const cpX = (prev[0] + curr[0]) / 2;
    linePath += ` C ${cpX},${prev[1]} ${cpX},${curr[1]} ${curr[0]},${curr[1]}`;
  }
  const last = points[points.length - 1]; const first = points[0];
  const areaPath = `${linePath} L ${last[0]},${svgH - padY - 12} L ${first[0]},${svgH - padY - 12} Z`;
  return { linePath, areaPath, points };
}

export default function SellerStatsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { theme: T, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = Math.min(windowWidth, 600);
  const { t, isRTL } = useLanguage();

  const renderGlassIcon = (iconName: string, size: number, iconColor: string, containerSize: number, borderRadius: number, containerStyle?: any) => {
    return (
      <View style={[{
        width: containerSize,
        height: containerSize,
        borderRadius: borderRadius,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(200, 16, 46, 0.15)',
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(200, 16, 46, 0.04)',
        shadowColor: iconColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        overflow: 'hidden',
      }, containerStyle]}>
        {BlurView ? (
          <BlurView 
            intensity={12} 
            tint={isDark ? 'dark' : 'light'} 
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
        ) : null}
        <Feather 
          name={iconName as any} 
          size={size} 
          color={iconColor} 
          style={{
            textShadowColor: iconColor,
            textShadowOffset: { width: 0.25, height: 0.25 },
            textShadowRadius: 0.8,
          }}
        />
      </View>
    );
  };
  const [timeframe, setTimeframe] = useState<'7d' | '30d'>('7d');
  const [selectedPointIdx, setSelectedPointIdx] = useState<number | null>(null);
  const [statsData, setStatsData] = useState<SellerStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try { setLoading(true); const res = await authApi.getSellerStats(); setStatsData(res); }
    catch (err) { console.error('Error fetching seller stats:', err); }
    finally { setLoading(false); }
  };

  useFocusEffect(React.useCallback(() => { fetchStats(); return undefined; }, []));

  if (loading && !statsData) {
    return (
      <AppScaffold title={t('Store Analytics')} activeTab="profile" onBack={() => navigation.goBack()}
        onPressHome={() => navigation.navigate('Home')} onPressEvents={() => navigation.navigate('Map')}
        onPressCenter={() => {}} onPressReels={() => navigation.navigate('ReelsFeed')}
        onPressProfile={() => { if (user?.profileType === 'pro_commerce') navigation.navigate('SellerProProfile'); else navigation.navigate('Profile'); }}
        contentStyle={{ backgroundColor: T.bg }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: `${T.red}18`, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <ActivityIndicator size="large" color={T.red} />
          </View>
          <Text style={{ fontFamily: 'Poppins_600SemiBold', color: T.textMuted, fontSize: 13 }}>{t('Loading your analytics…')}</Text>
        </View>
      </AppScaffold>
    );
  }

  const chartValues = timeframe === '7d' ? (statsData?.chartData ?? [0,0,0,0,0,0,0]) : (statsData?.chartData30d ?? Array(30).fill(0));
  const chartSvgW = screenWidth - 40; const chartSvgH = 150;
  const { linePath, areaPath, points: chartPoints } = buildAreaPath(chartValues, chartSvgW - 32, chartSvgH, 38, 16, 18);
  const maxVal = Math.max(...chartValues); const maxIdx = chartValues.indexOf(maxVal);
  const peakPoint = chartPoints[maxIdx]; const rangeVal = maxVal - Math.min(...chartValues);
  const padY = 18; const padLeft = 38; const padRight = 16;
  const yLabels: { y: number; val: number }[] = [];
  if (rangeVal === 0) {
    [maxVal + 2, maxVal, Math.max(0, maxVal - 2)].forEach((val, i, arr) => yLabels.push({ y: padY + (i / (arr.length - 1)) * (chartSvgH - padY * 2 - 12), val }));
  } else {
    for (let i = 0; i < 4; i++) yLabels.push({ y: padY + (i / 3) * (chartSvgH - padY * 2 - 12), val: Math.round(maxVal - (i / 3) * rangeVal) });
  }

  const viewsShown = timeframe === '7d' ? (statsData?.views ?? 0) : (statsData?.viewsLast30Days ?? 0);
  const mapClicksShown = timeframe === '7d' ? (statsData?.mapClicks ?? 0) : (statsData?.mapClicksLast30Days ?? 0);
  const ratingDist = statsData?.ratingDistribution ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const totalRatings = Object.values(ratingDist).reduce((a, b) => a + b, 0);
  const xLabels7d = statsData?.chartLabels ?? DAY_LABELS_7;
  const totalReelInteractions = (statsData?.reelsLikesCount ?? 0) + (statsData?.reelsCommentsCount ?? 0);

  const statCards = [
    { title: t('Profile Views'), value: loading ? '—' : viewsShown.toLocaleString(), meta: timeframe === '7d' ? t('Last 7 days') : t('Last 30 days'), icon: 'eye' as const, color: T.red, bg: `${T.red}15` },
    { title: t('Map Clicks'), value: loading ? '—' : mapClicksShown.toLocaleString(), meta: t('Directions requested'), icon: 'map-pin' as const, color: T.red, bg: `${T.red}12` },
    { title: t('Products'), value: loading ? '—' : (statsData?.productsCount ?? 0).toString(), meta: `${statsData?.certifiedGFCount ?? 0} ${t('GF certified')}`, icon: 'package' as const, color: T.red, bg: `${T.red}12` },
    { title: t('Avg Price'), value: loading ? '—' : `${(statsData?.avgPrice ?? 0).toFixed(1)} TND`, meta: t('Per product'), icon: 'tag' as const, color: T.red, bg: `${T.red}12` },
  ];

  const C = { card: { backgroundColor: T.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: T.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 } };

  return (
    <AppScaffold title={t('Store Analytics')} activeTab="profile" onBack={() => navigation.goBack()}
      onPressHome={() => navigation.navigate('Home')} onPressEvents={() => navigation.navigate('Events')}
      onPressCenter={() => {}} onPressReels={() => navigation.navigate('ReelsFeed')}
      onPressProfile={() => { if (user?.profileType === 'pro_commerce') navigation.navigate('SellerProProfile'); else navigation.navigate('Profile'); }}
      contentStyle={{ backgroundColor: T.bg }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>

        {/* ── Hero Banner ── */}
        <View style={{ marginHorizontal: 20, marginTop: 16, marginBottom: 24, borderRadius: 24, overflow: 'hidden', backgroundColor: T.red, shadowColor: T.red, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 10 }}>
          <View style={{ position: 'absolute', top: -30, right: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.10)' }} />
          <View style={{ position: 'absolute', bottom: -40, right: 60, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.07)' }} />
          <View style={{ padding: 20, gap: 12 }}>
            <TouchableOpacity onPress={() => navigation.navigate('SellerProfile', { sellerId: user?._id })} activeOpacity={0.85} id="btn-stats-view-profile"
              style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
              {renderGlassIcon('shopping-bag', 18, '#FFF', 40, 20)}
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#FFF' }}>{user?.storeInfo?.storeName || t('My Store')}</Text>
                <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.78)' }}>{t('Voir le profil public')} →</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('EditStore')}
              activeOpacity={0.85}
              id="btn-stats-edit-store"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.22)',
                borderRadius: 12,
                paddingVertical: 10,
                gap: 8,
              }}
            >
              <Feather name="edit-3" size={15} color="#FFFFFF" />
              <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 13, color: '#FFFFFF' }}>
                {t('Gérer & Éditer le magasin', 'Gérer & Éditer le magasin')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── KPI Cards ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {statCards.map((card, idx) => (
              <View key={idx} style={{ width: (screenWidth - 52) / 2, borderRadius: 18, backgroundColor: T.surface, padding: 16, borderWidth: 1, borderColor: T.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  {renderGlassIcon(card.icon, 15, card.color, 32, 10)}
                  <Text style={{ fontSize: 9, fontFamily: 'Poppins_700Bold', color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, flex: 1 }}>{card.title}</Text>
                </View>
                <Text style={{ fontSize: 24, fontFamily: 'Poppins_700Bold', color: T.text }}>{card.value}</Text>
                <Text style={{ fontSize: 9, fontFamily: 'Poppins_400Regular', color: T.textMuted, marginTop: 2 }}>{card.meta}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Views Chart ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          {/* Header row */}
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <View>
              <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 15, color: T.text }}>{t('Views Over Time')}</Text>
              <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 10, color: T.textMuted, marginTop: 1 }}>
                {timeframe === '7d' ? t('Last 7 days') : t('Last 30 days')}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', backgroundColor: isDark ? '#FFFFFF0F' : '#0000000A', borderRadius: 10, padding: 3 }}>
              {(['7d', '30d'] as const).map(key => (
                <TouchableOpacity
                  key={key}
                  onPress={() => {
                    setTimeframe(key);
                    setSelectedPointIdx(null);
                  }}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8,
                    backgroundColor: timeframe === key ? T.red : 'transparent',
                  }}
                >
                  <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: timeframe === key ? '#FFF' : T.textMuted }}>
                    {key === '7d' ? t('7 days') : t('30 days')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Chart card */}
          <View style={{
            backgroundColor: T.surface,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: T.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
            overflow: 'hidden',
          }}>

            <View style={{ padding: 18, paddingTop: 16 }}>

              {/* Dynamic Scrubbing/Peak Info Header */}
              {(() => {
                const activeIdx = selectedPointIdx !== null ? selectedPointIdx : maxIdx;
                const activeVal = chartValues[activeIdx] ?? 0;
                const isPeak = activeIdx === maxIdx;
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      backgroundColor: isPeak ? `${T.red}14` : (isDark ? '#FFFFFF0A' : '#00000006'),
                      borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7,
                    }}>
                      <Feather name={isPeak ? "trending-up" : "eye"} size={13} color={isPeak ? T.red : T.textMuted} />
                      <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 11, color: isPeak ? T.red : T.text }}>
                        {timeframe === '7d'
                          ? (xLabels7d[activeIdx] ?? '')
                          : `${t('Day')} ${activeIdx + 1}`
                        }: {activeVal} {t('views')}
                      </Text>
                    </View>

                    {selectedPointIdx !== null && selectedPointIdx !== maxIdx ? (
                      <TouchableOpacity
                        onPress={() => setSelectedPointIdx(null)}
                        style={{
                          backgroundColor: `${T.red}10`,
                          borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
                        }}
                      >
                        <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 9, color: T.red }}>
                          {t('Reset to Peak')}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      maxVal > 0 && (
                        <View style={{
                          flexDirection: 'row', alignItems: 'center', gap: 5,
                          backgroundColor: `${T.red}14`,
                          borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
                        }}>
                          <Feather name="zap" size={11} color={T.red} />
                          <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 9, color: T.red, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                            {t('Peak Period')}
                          </Text>
                        </View>
                      )
                    )}
                  </View>
                );
              })()}

              {/* SVG Chart */}
              {(() => {
                const svgW = chartSvgW - 36;
                const svgH = 200;
                const svgPadLeft = 38;
                const svgPadRight = 16;
                const svgPadY = 22;
                const { linePath: lp, areaPath: ap, points: pts } = buildAreaPath(chartValues, svgW, svgH, svgPadLeft, svgPadRight, svgPadY);

                const maxV = Math.max(...chartValues);
                const yMax = maxV || 4;
                const yLbls: { y: number; val: number }[] = [];
                for (let i = 0; i < 5; i++) {
                  yLbls.push({
                    y: svgPadY + (i / 4) * (svgH - svgPadY * 2 - 12),
                    val: Math.round(yMax - (i / 4) * yMax)
                  });
                }

                const activeIdx = selectedPointIdx !== null ? selectedPointIdx : maxIdx;
                const activePt = pts[activeIdx];
                const activeVal = chartValues[activeIdx];

                return (
                  <Svg width={svgW} height={svgH} style={{ overflow: 'visible' }}>
                    <Defs>
                      <LinearGradient id="chartGradFill" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor={T.red} stopOpacity={0.30} />
                        <Stop offset="60%" stopColor={T.red} stopOpacity={0.06} />
                        <Stop offset="100%" stopColor={T.red} stopOpacity={0.0} />
                      </LinearGradient>
                      <LinearGradient id="lineGlow" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor={T.red} stopOpacity={0.15} />
                        <Stop offset="100%" stopColor={T.red} stopOpacity={0.0} />
                      </LinearGradient>
                    </Defs>

                    {/* Horizontal Grid lines */}
                    {yLbls.map((lbl, i) => (
                      <React.Fragment key={i}>
                        <Line
                          x1={svgPadLeft} y1={lbl.y}
                          x2={svgW - svgPadRight} y2={lbl.y}
                          stroke={isDark ? '#FFFFFF10' : '#00000009'}
                          strokeWidth={1}
                          strokeDasharray={i === yLbls.length - 1 ? '0' : '4 5'}
                        />
                        <SvgText
                          x={svgPadLeft - 6} y={lbl.y}
                          fill={T.textMuted} fontSize={9}
                          fontFamily="Poppins_500Medium"
                          textAnchor="end"
                          alignmentBaseline="middle"
                        >
                          {lbl.val}
                        </SvgText>
                      </React.Fragment>
                    ))}

                    {/* Volume columns backdrop silhouettes */}
                    {pts.map((pt, idx) => {
                      const barH = svgH - svgPadY - 12 - pt[1];
                      if (barH <= 0) return null;
                      return (
                        <Rect
                          key={`vol-${idx}`}
                          x={pt[0] - 4}
                          y={pt[1]}
                          width={8}
                          height={barH}
                          rx={4}
                          fill={idx === activeIdx ? T.red : (isDark ? '#FFFFFF' : '#000000')}
                          fillOpacity={idx === activeIdx ? 0.16 : (isDark ? 0.04 : 0.03)}
                          pointerEvents="none"
                        />
                      );
                    })}

                    {/* Gradient fill area */}
                    {ap ? <Path d={ap} fill="url(#chartGradFill)" /> : null}

                    {/* Selected scrubber vertical tracking line */}
                    {activePt && (
                      <Line
                        x1={activePt[0]} y1={svgPadY - 4}
                        x2={activePt[0]} y2={svgH - svgPadY - 12}
                        stroke={T.red}
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                        strokeOpacity={0.55}
                        pointerEvents="none"
                      />
                    )}

                    {/* Curved line glow drop-shadow */}
                    {lp ? (
                      <Path
                        d={lp}
                        fill="none"
                        stroke={T.red}
                        strokeWidth={6}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeOpacity={0.12}
                        pointerEvents="none"
                      />
                    ) : null}

                    {/* Curved line main stroke */}
                    {lp ? (
                      <Path
                        d={lp}
                        fill="none"
                        stroke={T.red}
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        pointerEvents="none"
                      />
                    ) : null}

                    {/* Data point markers */}
                    {pts.map((pt, idx) => {
                      const isSelected = idx === activeIdx;
                      const isPeak = idx === maxIdx;
                      return (
                        <React.Fragment key={idx}>
                          {isSelected ? (
                            <>
                              {/* Soft pulsing rings */}
                              <Circle cx={pt[0]} cy={pt[1]} r={12} fill={T.red} fillOpacity={0.12} pointerEvents="none" />
                              <Circle cx={pt[0]} cy={pt[1]} r={7.5} fill={T.red} fillOpacity={0.25} pointerEvents="none" />
                              {/* Selected point dot */}
                              <Circle cx={pt[0]} cy={pt[1]} r={4.5} fill={T.surface} stroke={T.red} strokeWidth={2.5} pointerEvents="none" />
                            </>
                          ) : (
                            isPeak && maxV > 0 && (
                              <Circle cx={pt[0]} cy={pt[1]} r={3.5} fill={T.red} fillOpacity={0.4} pointerEvents="none" />
                            )
                          )}
                        </React.Fragment>
                      );
                    })}

                    {/* X-Axis Labels */}
                    {timeframe === '7d' && xLabels7d.map((lbl, idx) => {
                      const pt = pts[idx];
                      if (!pt) return null;
                      const isSelected = idx === activeIdx;
                      return (
                        <React.Fragment key={idx}>
                          {isSelected && (
                            <Circle
                              cx={pt[0]} cy={svgH}
                              r={2}
                              fill={T.red}
                            />
                          )}
                          <SvgText
                            x={pt[0]} y={svgH - 4}
                            fill={isSelected ? T.red : T.textMuted}
                            fontSize={9}
                            fontFamily={isSelected ? 'Poppins_700Bold' : 'Poppins_500Medium'}
                            fontWeight={isSelected ? '700' : '500'}
                            textAnchor="middle"
                          >
                            {lbl}
                          </SvgText>
                        </React.Fragment>
                      );
                    })}

                    {timeframe === '30d' && pts.map((pt, idx) => {
                      if (![0, 6, 13, 20, 27, 29].includes(idx)) return null;
                      const isSelected = idx === activeIdx;
                      return (
                        <React.Fragment key={idx}>
                          {isSelected && (
                            <Circle
                              cx={pt[0]} cy={svgH}
                              r={2}
                              fill={T.red}
                            />
                          )}
                          <SvgText
                            key={idx}
                            x={pt[0]} y={svgH - 4}
                            fill={isSelected ? T.red : T.textMuted}
                            fontSize={8}
                            fontFamily={isSelected ? 'Poppins_700Bold' : 'Poppins_500Medium'}
                            fontWeight={isSelected ? '700' : '500'}
                            textAnchor="middle"
                          >
                            {idx + 1}
                          </SvgText>
                        </React.Fragment>
                      );
                    })}

                    {/* Touch targets overlay: vertical column hot-zones */}
                    {pts.map((pt, idx) => {
                      const colW = (svgW - svgPadLeft - svgPadRight) / (chartValues.length - 1 || 1);
                      const touchProps = Platform.OS === 'web'
                        ? { onClick: () => setSelectedPointIdx(idx) }
                        : { onPress: () => setSelectedPointIdx(idx) };
                      return (
                        <Circle
                          key={`touch-${idx}`}
                          cx={pt[0]}
                          cy={pt[1]}
                          r={Math.min(24, colW / 1.1)}
                          fill="transparent"
                          {...touchProps}
                        />
                      );
                    })}
                  </Svg>
                );
              })()}

              {/* Bottom stats bar */}
              <View style={{
                flexDirection: 'row',
                marginTop: 18,
                borderTopWidth: 1,
                borderTopColor: isDark ? '#FFFFFF0C' : '#0000000A',
                paddingTop: 14,
                gap: 0,
              }}>
                {[
                  {
                    label: t('Total'),
                    value: chartValues.reduce((a, b) => a + b, 0).toLocaleString(),
                    icon: 'bar-chart-2' as const,
                  },
                  {
                    label: t('Daily Avg'),
                    value: (chartValues.reduce((a, b) => a + b, 0) / (chartValues.length || 1)).toFixed(1),
                    icon: 'activity' as const,
                  },
                  {
                    label: t('Peak Day'),
                    value: maxVal.toLocaleString(),
                    icon: 'zap' as const,
                  },
                ].map((stat, i, arr) => (
                  <React.Fragment key={i}>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      {renderGlassIcon(stat.icon, 14, T.red, 32, 10, { marginBottom: 6 })}
                      <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 14, color: T.text }}>{stat.value}</Text>
                      <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 9, color: T.textMuted, marginTop: 2 }}>{stat.label}</Text>
                    </View>
                    {i < arr.length - 1 && (
                      <View style={{ width: 1, backgroundColor: isDark ? '#FFFFFF0C' : '#0000000A', marginVertical: 4 }} />
                    )}
                  </React.Fragment>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* ── Rating Overview ── */}
        {(statsData?.totalReviews ?? 0) > 0 && (
          <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 15, color: T.text }}>{t('Customer Reviews')}</Text>
              <View style={{ backgroundColor: `${T.red}15`, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: T.red }}>{statsData?.totalReviews} {t('total')}</Text>
              </View>
            </View>
            <View style={C.card}>
              <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                <View style={{ alignItems: 'center', minWidth: 64 }}>
                  <Text style={{ fontSize: 44, fontFamily: 'Poppins_700Bold', color: T.red, lineHeight: 52 }}>{statsData?.rating ?? '—'}</Text>
                  <View style={{ flexDirection: 'row', gap: 2 }}>
                    {[1,2,3,4,5].map(star => <Feather key={star} name="star" size={12} color={parseFloat(statsData?.rating ?? '0') >= star ? T.red : T.border} />)}
                  </View>
                  <Text style={{ fontSize: 9, color: T.textMuted, marginTop: 4, fontFamily: 'Poppins_400Regular' }}>{statsData?.totalReviews} {t('reviews')}</Text>
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  {[5,4,3,2,1].map(star => {
                    const count = ratingDist[star as 1|2|3|4|5] ?? 0; const pct = totalRatings > 0 ? count / totalRatings : 0;
                    return (
                      <View key={star} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: 10, color: T.textMuted, width: 10, textAlign: 'right' }}>{star}</Text>
                        <Feather name="star" size={9} color={T.red} />
                        <View style={{ flex: 1, height: 7, borderRadius: 4, backgroundColor: isDark ? '#FFFFFF0F' : '#0000000A', overflow: 'hidden' }}>
                          <View style={{ height: 7, borderRadius: 4, width: `${pct * 100}%`, backgroundColor: T.red }} />
                        </View>
                        <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: 9, color: T.textMuted, width: 18, textAlign: 'right' }}>{count}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── Product Categories ── */}
        {(statsData?.topCategories?.length ?? 0) > 0 && (
          <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 15, color: T.text, marginBottom: 14 }}>{t('Product Categories')}</Text>
            <View style={C.card}>
              {statsData?.topCategories?.map((cat, i) => {
                const total = statsData?.productsCount || 1; const pct = Math.round((cat.count / total) * 100);
                return (
                  <View key={i} style={{ marginBottom: i < (statsData.topCategories.length - 1) ? 14 : 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: T.red, marginRight: 8 }} />
                      <Text style={{ flex: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: T.text }}>{cat.name}</Text>
                      <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 11, color: T.red }}>{cat.count}</Text>
                      <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 10, color: T.textMuted, marginLeft: 2 }}>{t('products')}</Text>
                    </View>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: isDark ? '#FFFFFF0F' : '#0000000A', overflow: 'hidden' }}>
                      <View style={{ height: 6, borderRadius: 3, width: `${pct}%`, backgroundColor: T.red }} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Reels Analytics ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 15, color: T.text, marginBottom: 14 }}>{t('Reels Analytics')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {[
              { label: t('Published'), value: String(statsData?.reelsCount ?? 0), icon: 'film' as const },
              { label: t('Total Views'), value: (statsData?.reelsViewsCount ?? 0).toLocaleString(), icon: 'play' as const },
              { label: t('Interactions'), value: totalReelInteractions.toLocaleString(), icon: 'heart' as const },
              { label: t('Engagement'), value: `${statsData?.reelsEngagementRate ?? '0.0'}%`, icon: 'percent' as const },
            ].map((item, i) => (
              <View key={i} style={{ width: (screenWidth - 52) / 2, backgroundColor: T.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: T.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
                {renderGlassIcon(item.icon, 16, T.red, 34, 11, { marginBottom: 10 })}
                <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 22, color: T.text }}>{loading ? '—' : item.value}</Text>
                <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 9, color: T.textMuted, marginTop: 2 }}>{item.label}</Text>
              </View>
            ))}
          </View>
          {totalReelInteractions > 0 && (
            <View style={{ marginTop: 12, backgroundColor: T.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: T.border }}>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                {[
                  { icon: 'heart' as const, count: statsData?.reelsLikesCount ?? 0, label: t('Likes') },
                  { icon: 'message-circle' as const, count: statsData?.reelsCommentsCount ?? 0, label: t('Comments') },
                ].map((item, i, arr) => (
                  <React.Fragment key={i}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {renderGlassIcon(item.icon, 14, T.red, 30, 9)}
                      <View>
                        <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 16, color: T.text }}>{item.count.toLocaleString()}</Text>
                        <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 9, color: T.textMuted }}>{item.label}</Text>
                      </View>
                    </View>
                    {i < arr.length - 1 && <View style={{ width: 1, backgroundColor: T.border }} />}
                  </React.Fragment>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* ── Insights ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 15, color: T.text, marginBottom: 14 }}>{t('Store Insights')}</Text>
          <View style={{ gap: 10 }}>
            {[
              { icon: 'trending-up' as const, label: t('Most reviewed product'), value: loading ? '…' : (statsData?.mostViewedProduct ?? '—') },
              { icon: 'calendar' as const, label: t('Peak interaction day'), value: loading ? '…' : (statsData?.topInteractionDay ?? '—') },
              { icon: 'check-circle' as const, label: t('Gluten-free certified'), value: loading ? '…' : `${statsData?.certifiedGFCount ?? 0} / ${statsData?.productsCount ?? 0} ${t('products')}`, badge: (statsData?.certifiedGFCount ?? 0) > 0 ? '✓ GF' : undefined },
              { icon: 'clock' as const, label: t('Member since'), value: loading ? '…' : (statsData?.memberSince ?? '—'), sub: !loading && (statsData?.accountAgeDays ?? 0) > 0 ? `${statsData?.accountAgeDays} ${t('days on Glunity')}` : undefined },
              { icon: 'map-pin' as const, label: t('Map clicks (30d)'), value: loading ? '…' : (statsData?.mapClicksLast30Days ?? 0).toLocaleString() },
            ].map((item: any, i) => (
              <View key={i} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: T.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: T.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, gap: 12 }}>
                {renderGlassIcon(item.icon, 18, T.red, 42, 13)}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 10, color: T.textMuted, marginBottom: 2 }}>{item.label}</Text>
                  <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 13, color: T.text }}>{item.value}</Text>
                  {item.sub && <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 10, color: T.textMuted, marginTop: 1 }}>{item.sub}</Text>}
                </View>
                {item.badge && (
                  <View style={{ backgroundColor: `${T.red}18`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 9, color: T.red }}>{item.badge}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </AppScaffold>
  );
}
