import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  useWindowDimensions,
} from 'react-native';
import { Radius } from '@/shared/utils/theme';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';
import { useAuth } from '../../../auth/state/auth.context';
import { useTheme } from '@/shared/context/theme.context';
import { AppScaffold } from '@/shared/components/AppScaffold';

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

// Pixels nodes representing the mockup line graph perfectly:
// Monday is at 95px, peaks on Wednesday, dips on Thursday, reaches a massive peak on Friday (20px), and drops on Sunday.
const CHART_PATH = "M 35,95 C 75,90 100,50 140,55 C 180,60 195,100 230,85 C 255,75 270,18 290,20 C 310,22 320,60 340,95";
const GRID_LINES_Y = [30, 65, 100];

export default function SellerStatsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { theme: T } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = Math.min(windowWidth, 600);
  const [timeframe, setTimeframe] = useState('Last 7 days');
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false);

  const s = React.useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: T.bg },
    flex: { flex: 1 },
    content: { paddingHorizontal: 28, paddingTop: 16 },

    // Unified Top Header
    topHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    avatarContainer: {
      position: 'relative',
      width: 40,
      height: 40,
    },
    avatarImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: T.border,
    },
    verifiedBadge: {
      position: 'absolute',
      bottom: -1,
      right: -1,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: T.green,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: T.bg,
    },
    greeting: {
      fontSize: 18,
      fontWeight: '500',
      fontFamily: 'Poppins_500Medium',
      color: T.text,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: T.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    notifIndicator: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: T.green,
      borderWidth: 1.5,
      borderColor: T.bg,
    },

    navRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: T.surface,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: 'rgba(0,0,0,0.05)',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    navTitle: {
      fontSize: 18,
      fontWeight: '500',
      fontFamily: 'Poppins_500Medium',
      color: T.text,
      marginRight: 18,
    },

    // Stats Grid Layout
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 16,
      marginBottom: 28,
    },
    statCard: {
      width: (screenWidth - 72) / 2,
      height: 128.78,
      borderRadius: 24,
      backgroundColor: T.surface,
      padding: 16,
      justifyContent: 'space-between',
      shadowColor: 'rgba(46, 46, 46, 0.2)',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    statHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    iconWrapper: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: T.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statTitle: {
      fontSize: 10.2,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.textMuted,
    },
    statValue: {
      fontSize: 20.4,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
      marginTop: 8,
    },
    statMeta: {
      fontSize: 8.5,
      fontWeight: '500',
      fontFamily: 'Poppins_500Medium',
      color: T.textMuted,
    },

    // Chart Header Controls
    chartHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    chartSectionTitle: {
      fontSize: 15.3,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
    },
    dropdownContainer: {
      position: 'relative',
      zIndex: 10,
    },
    timeframeSelect: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: T.surface,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: T.border,
      gap: 6,
    },
    timeframeText: {
      fontSize: 10.2,
      fontWeight: '500',
      fontFamily: 'Poppins_500Medium',
      color: T.text,
    },
    dropdownBox: {
      position: 'absolute',
      top: 34,
      right: 0,
      width: 100,
      backgroundColor: T.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: T.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    dropdownItem: {
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    dropdownText: {
      fontSize: 10,
      color: T.textMuted,
    },
    dropdownTextActive: {
      fontWeight: '600',
      fontFamily: 'Poppins_600SemiBold',
      color: T.green,
    },

    // SVG Chart wrap
    chartWrapper: {
      backgroundColor: T.surface,
      borderRadius: 24,
      padding: 16,
      marginBottom: 28,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    chartSvg: {
      overflow: 'visible',
    },

    // Insights Styling
    insightsList: {
      gap: 12,
      marginTop: 12,
    },
    insightCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: T.surface,
      borderRadius: Radius.lg,
      padding: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1,
    },
    insightIconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: T.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    insightTexts: {
      flex: 1,
    },
    insightLabel: {
      fontSize: 9,
      color: T.textMuted,
      marginBottom: 2,
    },
    insightValue: {
      fontSize: 12,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
    },

    // Bottom Navigation Bar
    bottomNav: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 80,
      backgroundColor: T.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingBottom: 12,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 10,
    },
    navBtn: { alignItems: 'center', gap: 2, minWidth: 48 },
    navLabel: { fontSize: 8.5, fontWeight: '500', fontFamily: 'Poppins_500Medium', color: T.text, marginTop: 2 },
    fab: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: T.green,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 22,
      borderWidth: 4,
      borderColor: T.bg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 8,
    },
    scannerGrid: {
      width: 28,
      height: 28,
      borderWidth: 2,
      borderColor: '#FFFFFF',
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    scannerBracket: {
      width: 14,
      height: 14,
      borderWidth: 2,
      borderColor: '#FFFFFF',
      borderRadius: 2,
    },
  }), [T, screenWidth]);

  const stats = [
    {
      title: 'Views',
      value: timeframe === 'Last 7 days' ? '1,200' : '5,480',
      meta: 'This month',
      iconName: 'eye',
      bgColor: '#FFFFFF',
    },
    {
      title: 'Reviews',
      value: '4.8',
      meta: 'Average rating',
      iconName: 'star',
      bgColor: '#FFFFFF',
    },
    {
      title: 'Map clicks',
      value: timeframe === 'Last 7 days' ? '320' : '1,120',
      meta: 'Visits generated',
      iconName: 'map-pin',
      bgColor: '#FFFFFF',
    },
    {
      title: 'Products',
      value: '12',
      meta: 'Listed items',
      iconName: 'package',
      bgColor: '#FFFFFF',
    },
  ];

  return (
    <AppScaffold
      title="Your visibility"
      activeTab="home"
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


        {/* ── Statistics Grid ───────────────────────────────────────────────── */}
        <View style={s.statsGrid}>
          {stats.map((stat, idx) => (
            <View key={idx} style={[s.statCard, { backgroundColor: T.surface, borderColor: T.border, borderWidth: 1 }]}>
              <View style={s.statHeader}>
                <View style={[s.iconWrapper, { backgroundColor: T.surfaceAlt }]}>
                  {stat.iconName === 'eye' && <Feather name="eye" size={16} color={T.green} />}
                  {stat.iconName === 'star' && <Feather name="star" size={16} color={T.green} />}
                  {stat.iconName === 'map-pin' && <Feather name="map-pin" size={16} color={T.green} />}
                  {stat.iconName === 'package' && <Feather name="package" size={16} color={T.green} />}
                </View>
                <Text style={[s.statTitle, { color: T.textMuted }]}>{stat.title}</Text>
              </View>
              <Text style={[s.statValue, { color: T.text }]}>{stat.value}</Text>
              <Text style={[s.statMeta, { color: T.textMuted }]}>{stat.meta}</Text>
            </View>
          ))}
        </View>

        <View style={s.chartHeaderRow}>
          <Text style={[s.chartSectionTitle, { color: T.text }]}>Views over time</Text>
          <View style={s.dropdownContainer}>
            <TouchableOpacity
              style={[s.timeframeSelect, { backgroundColor: T.surface, borderColor: T.border }]}
              activeOpacity={0.8}
              onPress={() => setShowTimeframeDropdown(!showTimeframeDropdown)}
              id="btn-timeframe-dropdown"
            >
              <Text style={[s.timeframeText, { color: T.text }]}>{timeframe}</Text>
              <Feather name="chevron-down" size={12} color={T.text} style={{ marginLeft: 4 }} />
            </TouchableOpacity>

            {showTimeframeDropdown && (
              <View style={[s.dropdownBox, { backgroundColor: T.surfaceElevated, borderColor: T.border }]}>
                {['Last 7 days', 'Last 30 days'].map((tf) => (
                  <TouchableOpacity
                    key={tf}
                    style={s.dropdownItem}
                    onPress={() => {
                      setTimeframe(tf);
                      setShowTimeframeDropdown(false);
                    }}
                  >
                    <Text style={[s.dropdownText, { color: T.textMuted }, timeframe === tf ? { color: T.green, fontWeight: '700' } : null]}>
                      {tf}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* ── Beautiful Cubic Bezier Line Chart ─────────────────────────────── */}
        <View style={[s.chartWrapper, { backgroundColor: T.surface, borderColor: T.border, borderWidth: 1 }]}>
          <Svg
            width={screenWidth - 56}
            height={160}
            viewBox="0 0 350 160"
            style={s.chartSvg}
          >
            <Defs>
              <LinearGradient id="gradientFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={T.green} stopOpacity={0.25} />
                <Stop offset="100%" stopColor={T.green} stopOpacity={0.0} />
              </LinearGradient>
            </Defs>

            {/* Grid horizontal helper lines */}
            {GRID_LINES_Y.map((y, idx) => (
              <Line
                key={idx}
                x1="30"
                y1={y}
                x2="340"
                y2={y}
                stroke={T.border}
                strokeWidth={1}
              />
            ))}

            {/* Y Axis Grid values */}
            <SvgText x="10" y="34" fontSize="9" fill={T.textMuted} textAnchor="start">400</SvgText>
            <SvgText x="10" y="69" fontSize="9" fill={T.textMuted} textAnchor="start">200</SvgText>
            <SvgText x="15" y="104" fontSize="9" fill={T.textMuted} textAnchor="start">0</SvgText>

            {/* Line Shading area under path */}
            <Path
              d={`${CHART_PATH} L 340,110 L 35,110 Z`}
              fill="url(#gradientFill)"
            />

            {/* Smooth bezier line */}
            <Path
              d={CHART_PATH}
              fill="none"
              stroke={T.green}
              strokeWidth={3}
            />

            {/* Highlighted active coordinates dot (Friday Peak) */}
            <Circle
              cx="290"
              cy="20"
              r="6"
              fill={T.surface}
              stroke={T.green}
              strokeWidth={3.5}
            />

            {/* X Axis Labels */}
            <SvgText x="40" y="140" fontSize="9.5" fill={T.textMuted} textAnchor="middle">Mon</SvgText>
            <SvgText x="140" y="140" fontSize="9.5" fill={T.textMuted} textAnchor="middle">Wed</SvgText>
            <SvgText x="230" y="140" fontSize="9.5" fill={T.textMuted} textAnchor="middle">Fri</SvgText>
            <SvgText x="320" y="140" fontSize="9.5" fill={T.textMuted} textAnchor="middle">Sun</SvgText>
          </Svg>
        </View>

        {/* ── Insights Section ──────────────────────────────────────────────── */}
        <Text style={[s.chartSectionTitle, { color: T.text, marginTop: 12 }]}>Insights</Text>
        <View style={s.insightsList}>
          {/* Most viewed product */}
          <View style={[s.insightCard, { backgroundColor: T.surface, borderColor: T.border, borderWidth: 1 }]}>
            <View style={[s.insightIconBox, { backgroundColor: T.surfaceAlt }]}>
              <Feather name="trending-up" size={18} color={T.green} />
            </View>
            <View style={s.insightTexts}>
              <Text style={[s.insightLabel, { color: T.textMuted }]}>Your most viewed product</Text>
              <Text style={[s.insightValue, { color: T.text }]}>Almond Croissant</Text>
            </View>
          </View>

          {/* Peak interaction day */}
          <View style={[s.insightCard, { backgroundColor: T.surface, borderColor: T.border, borderWidth: 1 }]}>
            <View style={[s.insightIconBox, { backgroundColor: T.surfaceAlt }]}>
              <Feather name="users" size={18} color={T.green} />
            </View>
            <View style={s.insightTexts}>
              <Text style={[s.insightLabel, { color: T.textMuted }]}>Top user interaction day</Text>
              <Text style={[s.insightValue, { color: T.text }]}>Saturday (Peak at 11 AM)</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>
    </AppScaffold>
  );
}


