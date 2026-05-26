import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Colors, Font, Spacing, Radius } from '@/shared/utils/theme';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';
import { useAuth } from '../../../auth/state/auth.context';
import { BottomNavBar } from '@/shared/components/BottomNavBar';

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

const { width } = Dimensions.get('window');

// Pixels nodes representing the mockup line graph perfectly:
// Monday is at 95px, peaks on Wednesday, dips on Thursday, reaches a massive peak on Friday (20px), and drops on Sunday.
const CHART_PATH = "M 35,95 C 75,90 100,50 140,55 C 180,60 195,100 230,85 C 255,75 270,18 290,20 C 310,22 320,60 340,95";
const GRID_LINES_Y = [30, 65, 100];

export default function SellerStatsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState('Last 7 days');
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false);

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
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />

      <ScrollView
        style={s.flex}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Unified Yassmine Top User Header ────────────────────────────── */}
        <View style={s.topHeader}>
          <View style={s.userRow}>
            <View style={s.avatarContainer}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150' }}
                style={s.avatarImage}
              />
              <View style={s.verifiedBadge}>
                <Feather name="check" size={8} color={Colors.white} />
              </View>
            </View>
            <Text style={s.greeting}>Yassmine</Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
              <Feather name="search" size={18} color="#393C40" />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
              <Feather name="bell" size={18} color="#393C40" />
              <View style={s.notifIndicator} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 2. Back Navigation Header ─────────────────────────────────────── */}
        <View style={s.navRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} id="stats-back">
            <Feather name="arrow-left" size={20} color={Colors.dark} />
          </TouchableOpacity>
          <Text style={s.navTitle}>Your visibility</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* ── Statistics Grid ───────────────────────────────────────────────── */}
        <View style={s.statsGrid}>
          {stats.map((stat, idx) => (
            <View key={idx} style={[s.statCard, { backgroundColor: stat.bgColor }]}>
              <View style={s.statHeader}>
                <View style={s.iconWrapper}>
                  {stat.iconName === 'eye' && <Feather name="eye" size={16} color="#C8102E" />}
                  {stat.iconName === 'star' && <Feather name="star" size={16} color="#C8102E" />}
                  {stat.iconName === 'map-pin' && <Feather name="map-pin" size={16} color="#C8102E" />}
                  {stat.iconName === 'package' && <Feather name="package" size={16} color="#C8102E" />}
                </View>
                <Text style={s.statTitle}>{stat.title}</Text>
              </View>
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statMeta}>{stat.meta}</Text>
            </View>
          ))}
        </View>

        {/* ── Chart Header (Views over time + Dropdown) ────────────────────── */}
        <View style={s.chartHeaderRow}>
          <Text style={s.chartSectionTitle}>Views over time</Text>
          <View style={s.dropdownContainer}>
            <TouchableOpacity
              style={s.timeframeSelect}
              activeOpacity={0.8}
              onPress={() => setShowTimeframeDropdown(!showTimeframeDropdown)}
              id="btn-timeframe-dropdown"
            >
              <Text style={s.timeframeText}>{timeframe}</Text>
              <Feather name="chevron-down" size={12} color={Colors.dark} style={{ marginLeft: 4 }} />
            </TouchableOpacity>

            {showTimeframeDropdown && (
              <View style={s.dropdownBox}>
                {['Last 7 days', 'Last 30 days'].map((tf) => (
                  <TouchableOpacity
                    key={tf}
                    style={s.dropdownItem}
                    onPress={() => {
                      setTimeframe(tf);
                      setShowTimeframeDropdown(false);
                    }}
                  >
                    <Text style={[s.dropdownText, timeframe === tf ? s.dropdownTextActive : null]}>
                      {tf}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* ── Beautiful Cubic Bezier Line Chart ─────────────────────────────── */}
        <View style={s.chartWrapper}>
          <Svg width={width - 56} height={160} style={s.chartSvg}>
            <Defs>
              <LinearGradient id="gradientFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#8BC34A" stopOpacity={0.25} />
                <Stop offset="100%" stopColor="#8BC34A" stopOpacity={0.0} />
              </LinearGradient>
            </Defs>

            {/* Grid horizontal helper lines */}
            {GRID_LINES_Y.map((y, idx) => (
              <Line
                key={idx}
                x1="30"
                y1={y}
                x2={width - 70}
                y2={y}
                stroke="#E5E7EB"
                strokeWidth={1}
              />
            ))}

            {/* Y Axis Grid values */}
            <SvgText x="10" y="34" fontSize="9" fill={Colors.muted} textAnchor="start">400</SvgText>
            <SvgText x="10" y="69" fontSize="9" fill={Colors.muted} textAnchor="start">200</SvgText>
            <SvgText x="15" y="104" fontSize="9" fill={Colors.muted} textAnchor="start">0</SvgText>

            {/* Line Shading area under path */}
            <Path
              d={`${CHART_PATH} L 340,110 L 35,110 Z`}
              fill="url(#gradientFill)"
            />

            {/* Smooth bezier line */}
            <Path
              d={CHART_PATH}
              fill="none"
              stroke="#8BC34A"
              strokeWidth={3}
            />

            {/* Highlighted active coordinates dot (Friday Peak) */}
            <Circle
              cx="290"
              cy="20"
              r="6"
              fill={Colors.white}
              stroke="#8BC34A"
              strokeWidth={3.5}
            />

            {/* X Axis Labels */}
            <SvgText x="40" y="140" fontSize="9.5" fill={Colors.muted} textAnchor="middle">Mon</SvgText>
            <SvgText x="140" y="140" fontSize="9.5" fill={Colors.muted} textAnchor="middle">Wed</SvgText>
            <SvgText x="230" y="140" fontSize="9.5" fill={Colors.muted} textAnchor="middle">Fri</SvgText>
            <SvgText x="320" y="140" fontSize="9.5" fill={Colors.muted} textAnchor="middle">Sun</SvgText>
          </Svg>
        </View>

        {/* ── Insights Section ──────────────────────────────────────────────── */}
        <Text style={s.chartSectionTitle}>Insights</Text>
        <View style={s.insightsList}>
          {/* Most viewed product */}
          <View style={s.insightCard}>
            <View style={s.insightIconBox}>
              <Feather name="trending-up" size={18} color="#C8102E" />
            </View>
            <View style={s.insightTexts}>
              <Text style={s.insightLabel}>Your most viewed product</Text>
              <Text style={s.insightValue}>Almond Croissant</Text>
            </View>
          </View>

          {/* Peak interaction day */}
          <View style={s.insightCard}>
            <View style={s.insightIconBox}>
              <Feather name="users" size={18} color="#C8102E" />
            </View>
            <View style={s.insightTexts}>
              <Text style={s.insightLabel}>Top user interaction day</Text>
              <Text style={s.insightValue}>Saturday (Peak at 11 AM)</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── Bottom Navigation Bar ─────────────────────────────────────────── */}
      <BottomNavBar
        activeTab="home"
        idPrefix="home-nav"
        onPressHome={() => navigation.navigate('Home')}
        onPressEvents={() => {}}
        onPressCenter={() => {}}
        onPressReels={() => {}}
        onPressProfile={() => {
          if (user?.profileType === 'pro_commerce') {
            navigation.navigate('SellerProfile');
          } else {
            navigation.navigate('Profile');
          }
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
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
    borderColor: '#E2E8F0',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.bg,
  },
  greeting: {
    fontSize: 18,
    fontWeight: Font.medium,
    color: '#343831',
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
    backgroundColor: '#F6F5F3',
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
    backgroundColor: Colors.green,
    borderWidth: 1.5,
    borderColor: Colors.bg,
  },

  // Back Navigation Row
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
    backgroundColor: Colors.white,
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
    fontWeight: Font.medium,
    color: Colors.dark,
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
    width: (width - 72) / 2,
    height: 128.78,
    borderRadius: 24,
    backgroundColor: Colors.white,
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
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTitle: {
    fontSize: 10.2,
    fontWeight: Font.bold,
    color: 'rgba(46, 46, 46, 0.6)',
  },
  statValue: {
    fontSize: 20.4,
    fontWeight: Font.bold,
    color: Colors.dark,
    marginTop: 8,
  },
  statMeta: {
    fontSize: 8.5,
    fontWeight: Font.medium,
    color: 'rgba(46, 46, 46, 0.5)',
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
    fontWeight: Font.bold,
    color: Colors.dark,
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 10,
  },
  timeframeSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(46, 46, 46, 0.08)',
    gap: 6,
  },
  timeframeText: {
    fontSize: 10.2,
    fontWeight: Font.medium,
    color: Colors.dark,
  },
  dropdownBox: {
    position: 'absolute',
    top: 34,
    right: 0,
    width: 100,
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(46, 46, 46, 0.1)',
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
    color: Colors.muted,
  },
  dropdownTextActive: {
    fontWeight: Font.semibold,
    color: Colors.green,
  },

  // SVG Chart wrap
  chartWrapper: {
    backgroundColor: Colors.white,
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
    backgroundColor: Colors.white,
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
    backgroundColor: '#FDF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  insightTexts: {
    flex: 1,
  },
  insightLabel: {
    fontSize: 9,
    color: Colors.muted,
    marginBottom: 2,
  },
  insightValue: {
    fontSize: 12,
    fontWeight: Font.bold,
    color: Colors.dark,
  },

  // Bottom Navigation Bar
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: Colors.white,
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
  navLabel: { fontSize: 8.5, fontWeight: Font.medium, color: Colors.dark, marginTop: 2 },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    borderWidth: 4,
    borderColor: Colors.bg,
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
    borderColor: Colors.white,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  scannerBracket: {
    width: 14,
    height: 14,
    borderWidth: 2,
    borderColor: Colors.white,
    borderRadius: 2,
  },
});
