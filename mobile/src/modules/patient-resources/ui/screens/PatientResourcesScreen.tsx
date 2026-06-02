import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import {
  Ionicons,
  MaterialCommunityIcons,
  Feather,
} from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AppStackParamList } from '@/modules/auth/navigation/types';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import { AppScaffold } from '@/shared/components/AppScaffold';
import patientResourcesApi, {
  PatientArticle,
  ResourceVideo,
  ResourceCategory,
} from '../../api/patient-resources.api';

type Props = NativeStackScreenProps<AppStackParamList, 'PatientResources'>;

const F = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
};

// ── Category chip config — exact icon + color + bg matching design ─────────
const CATEGORIES: {
  key: ResourceCategory;
  label: string;
  icon: string;
  iconLib: 'mc' | 'ion';
  color: string;
  bg: string;
  activeBg: string;
}[] = [
  {
    key: 'celiac-disease',
    label: 'Celiac\nDisease',
    icon: 'heart-pulse',
    iconLib: 'mc',
    color: '#C8102E',
    bg: 'rgba(200,16,46,0.09)',
    activeBg: 'rgba(200,16,46,0.14)',
  },
  {
    key: 'diet-basics',
    label: 'Diet Basics',
    icon: 'food-fork-drink',
    iconLib: 'mc',
    color: '#6DAE3F',
    bg: 'rgba(109,174,63,0.10)',
    activeBg: 'rgba(109,174,63,0.18)',
  },
  {
    key: 'safe-foods',
    label: 'Safe Foods\n& Risks',
    icon: 'shield-check-outline',
    iconLib: 'mc',
    color: '#444444',
    bg: 'rgba(0,0,0,0.06)',
    activeBg: 'rgba(0,0,0,0.10)',
  },
  {
    key: 'lifestyle-tips',
    label: 'Lifestyle\nTips',
    icon: 'sunny-outline',
    iconLib: 'ion',
    color: '#D4920A',
    bg: 'rgba(212,146,10,0.10)',
    activeBg: 'rgba(212,146,10,0.18)',
  },
];

const CATEGORY_IMAGES: Record<string, string> = {
  'celiac-disease': 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=400&fit=crop',
  'diet-basics': 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&h=400&fit=crop',
  'safe-foods': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop',
  'lifestyle-tips': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop',
};

// ── Per-article icon config (by icon field from backend seed data) ───────────
const ARTICLE_ICON_CONFIG: Record<string, { color: string; bg: string }> = {
  'heart-pulse':           { color: '#C8102E', bg: 'rgba(200,16,46,0.09)' },
  'food-fork-drink':       { color: '#6DAE3F', bg: 'rgba(109,174,63,0.10)' },
  'restaurant-outline':    { color: '#6DAE3F', bg: 'rgba(109,174,63,0.10)' },
  'shield-check-outline':  { color: '#444444', bg: 'rgba(0,0,0,0.06)' },
  'stethoscope':           { color: '#C8102E', bg: 'rgba(200,16,46,0.09)' },
  'sunny-outline':         { color: '#D4920A', bg: 'rgba(212,146,10,0.10)' },
  'information-outline':   { color: '#1E88E5', bg: 'rgba(30,136,229,0.09)' },
};

function getArticleIconConfig(icon: string) {
  return ARTICLE_ICON_CONFIG[icon] ?? { color: '#555555', bg: 'rgba(0,0,0,0.06)' };
}

// ── Icon resolver maps ───────────────────────────────────────────────────────
const ICON_LIB_MAP: Record<string, 'mc' | 'ion' | 'feather'> = {
  'heart-pulse':           'mc',
  'food-fork-drink':       'mc',
  'restaurant-outline':    'ion',
  'shield-check-outline':  'mc',
  'stethoscope':           'mc',
  'sunny-outline':         'ion',
  'information-outline':   'mc',
};

function DynamicIcon({
  name,
  size,
  color,
}: {
  name: string;
  size: number;
  color: string;
}) {
  const lib = ICON_LIB_MAP[name] ?? 'mc';
  if (lib === 'ion') {
    return <Ionicons name={name as any} size={size} color={color} />;
  }
  if (lib === 'feather') {
    return <Feather name={name as any} size={size} color={color} />;
  }
  return <MaterialCommunityIcons name={name as any} size={size} color={color} />;
}

// ── Icon resolver ───────────────────────────────────────────────────────────
function ArticleIcon({
  iconName,
  size = 24,
  color,
  bg,
}: {
  iconName: string;
  size?: number;
  color: string;
  bg: string;
}) {
  return (
    <View
      style={{
        width: size + 20,
        height: size + 20,
        borderRadius: 12,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <DynamicIcon name={iconName} size={size} color={color} />
    </View>
  );
}

export default function PatientResourcesScreen({ navigation }: Props) {
  const { theme: T } = useTheme();
  const { isRTL, t } = useLanguage();

  const [featured, setFeatured] = useState<PatientArticle | null>(null);
  const [articles, setArticles] = useState<PatientArticle[]>([]);
  const [videos, setVideos] = useState<ResourceVideo[]>([]);
  const [activeCategory, setActiveCategory] = useState<ResourceCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<PatientArticle | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await patientResourcesApi.getHomeData();
      if (res.success) {
        setFeatured(res.data.featured);
        setArticles(res.data.articles);
        setVideos(res.data.videos);
      }
    } catch {
      // Fail silently — screen shows empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(true); };

  // Filter articles by selected category (exclude featured from list)
  const displayedArticles = useMemo(() => {
    const nonFeatured = articles.filter((a) => !a.isFeatured);
    if (!activeCategory) return nonFeatured;
    return nonFeatured.filter((a) => a.category === activeCategory);
  }, [articles, activeCategory]);



  // ── styles ──────────────────────────────────────────────────────────────────
  const s = useMemo(
    () =>
      StyleSheet.create({
        page: { flex: 1, backgroundColor: T.bg },
        scroll: { flex: 1 },
        content: { paddingBottom: 120 },

        // ── Section label ──
        sectionRow: {
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginHorizontal: 20,
          marginTop: 24,
          marginBottom: 14,
        },
        sectionLabel: {
          fontSize: 13,
          fontFamily: F.medium,
          color: T.textMuted,
          textTransform: 'lowercase',
          letterSpacing: 0.2,
          textAlign: isRTL ? 'right' : 'left',
        },
        seeAllBtn: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 },
        seeAllText: {
          fontSize: 13,
          fontFamily: F.semibold,
          fontWeight: '600',
          color: T.red,
        },

        // ── Categories strip ──
        categoriesRow: {
          flexDirection: isRTL ? 'row-reverse' : 'row',
          paddingHorizontal: 20,
          gap: 10,
          marginBottom: 4,
        },
        categoryCard: {
          flex: 1,
          backgroundColor: T.surface,
          borderRadius: 14,
          paddingVertical: 12,
          paddingHorizontal: 6,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 112,
          gap: 6,
          borderWidth: 1.5,
          borderColor: 'transparent',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 3,
          elevation: 1,
        },
        categoryCardActive: {
          borderColor: T.red,
          backgroundColor: T.redLight,
        },
        categoryIconBox: {
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: T.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        },
        categoryIconBoxActive: { backgroundColor: T.redLight },
        categoryLabel: {
          fontSize: 10.5,
          fontFamily: F.medium,
          color: T.textSub,
          textAlign: 'center',
          lineHeight: 14,
        },
        categoryLabelActive: { color: T.red, fontFamily: F.bold, fontWeight: '700' },


        // ── Featured card ──
        featuredCard: {
          marginHorizontal: 20,
          backgroundColor: T.surface,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: T.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
          overflow: 'hidden',
        },
        featuredCoverImage: {
          width: '100%',
          height: 160,
        },
        featuredBadge: {
          position: 'absolute',
          top: 12,
          left: isRTL ? undefined : 12,
          right: isRTL ? 12 : undefined,
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 8,
        },
        featuredBadgeText: {
          fontSize: 10,
          fontFamily: F.semibold,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 0.4,
        },
        featuredContent: {
          padding: 16,
        },
        featuredTitle: {
          fontSize: 17,
          fontFamily: F.bold,
          fontWeight: '700',
          color: T.text,
          marginBottom: 6,
          letterSpacing: -0.3,
          textAlign: isRTL ? 'right' : 'left',
        },
        featuredExcerpt: {
          fontSize: 13,
          fontFamily: F.regular,
          color: T.textSub,
          lineHeight: 18,
          marginBottom: 12,
          textAlign: isRTL ? 'right' : 'left',
        },
        featuredFooter: {
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        readTime: {
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          gap: 6,
        },
        readTimeText: {
          fontSize: 12,
          fontFamily: F.regular,
          color: T.textMuted,
        },
        readMoreBtn: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 },
        readMoreText: {
          fontSize: 12.5,
          fontFamily: F.semibold,
          fontWeight: '600',
          color: T.green,
        },

        // ── Article list card ──
        articleCard: {
          marginHorizontal: 20,
          marginBottom: 12,
          backgroundColor: T.surface,
          borderRadius: 16,
          padding: 10,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          gap: 12,
          borderWidth: 1,
          borderColor: T.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 4,
          elevation: 1,
        },
        articleThumbnail: {
          width: 80,
          height: 80,
          borderRadius: 12,
        },
        articleHeaderRow: {
          flexDirection: isRTL ? 'row-reverse' : 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          marginBottom: 4,
        },
        articleCategoryText: {
          fontSize: 10,
          fontFamily: F.semibold,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 0.3,
        },
        articleContent: { flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' },
        articleTitle: {
          fontSize: 14,
          fontFamily: F.bold,
          fontWeight: '700',
          color: T.text,
          marginBottom: 2,
          lineHeight: 18,
          textAlign: isRTL ? 'right' : 'left',
          width: '100%',
        },
        articleExcerpt: {
          fontSize: 12,
          fontFamily: F.regular,
          color: T.textMuted,
          lineHeight: 16,
          textAlign: isRTL ? 'right' : 'left',
          width: '100%',
        },
        articleTime: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 },
        articleTimeText: { fontSize: 10.5, fontFamily: F.regular, color: T.textMuted },

        // ── Videos section ──
        videosRow: {
          flexDirection: isRTL ? 'row-reverse' : 'row',
          paddingHorizontal: 20,
          gap: 12,
        },
        videoCard: {
          flex: 1,
          backgroundColor: T.surface,
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: T.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 2,
        },
        videoThumb: { width: '100%', height: 110 },
        videoDurationBadge: {
          position: 'absolute',
          bottom: 8,
          right: isRTL ? undefined : 8,
          left: isRTL ? 8 : undefined,
          backgroundColor: 'rgba(0,0,0,0.62)',
          borderRadius: 5,
          paddingHorizontal: 6,
          paddingVertical: 2,
        },
        videoDurationText: {
          fontSize: 11,
          fontFamily: F.medium,
          color: '#FFFFFF',
        },
        videoInfo: { padding: 10, alignItems: isRTL ? 'flex-end' : 'flex-start' },
        videoTitle: {
          fontSize: 13,
          fontFamily: F.bold,
          fontWeight: '700',
          color: T.text,
          marginBottom: 3,
          textAlign: isRTL ? 'right' : 'left',
          width: '100%',
        },
        videoPresenter: {
          fontSize: 11.5,
          fontFamily: F.regular,
          color: T.textMuted,
          textAlign: isRTL ? 'right' : 'left',
          width: '100%',
        },

        // ── Disclaimer ──
        disclaimer: {
          marginHorizontal: 20,
          marginTop: 20,
          backgroundColor: T.redLight,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: 'rgba(200,16,46,0.2)',
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'flex-start',
          gap: 10,
          padding: 14,
        },
        disclaimerText: {
          flex: 1,
          fontSize: 12.5,
          fontFamily: F.regular,
          color: T.textSub,
          lineHeight: 18,
          textAlign: isRTL ? 'right' : 'left',
        },

        // ── States ──
        centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
        emptyText: { fontSize: 15, fontFamily: F.regular, color: T.textMuted, marginTop: 12 },

        // ── Modal Styles ──
        modalContainer: {
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          justifyContent: 'flex-end',
          alignItems: 'center',
        },
        modalContent: {
          width: '100%',
          height: '92%',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          backgroundColor: T.surface,
          overflow: 'hidden',
          ...Platform.select({
            web: {
              maxWidth: 600,
              borderBottomLeftRadius: 24,
              borderBottomRightRadius: 24,
              height: '85%',
              marginBottom: '4%',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 16,
              elevation: 10,
            },
          }),
        },
        modalCoverContainer: {
          width: '100%',
          height: 180,
          position: 'relative',
        },
        modalCoverImage: {
          width: '100%',
          height: '100%',
        },
        modalFloatCloseBtn: {
          position: 'absolute',
          top: 14,
          right: isRTL ? undefined : 14,
          left: isRTL ? 14 : undefined,
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: 'rgba(0,0,0,0.48)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        modalHeaderContent: {
          paddingHorizontal: 20,
          paddingTop: 18,
        },
        modalMetaRow: {
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        },
        modalBadge: {
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 8,
        },
        modalBadgeText: {
          fontSize: 10,
          fontFamily: F.semibold,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 0.4,
        },
        modalTimeRow: {
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          gap: 4,
        },
        modalTimeText: {
          fontSize: 12,
          fontFamily: F.regular,
          color: T.textMuted,
        },
        modalScroll: {
          flex: 1,
        },
        modalScrollContent: {
          paddingBottom: 40,
        },
        modalTitleText: {
          fontSize: 20,
          fontFamily: F.bold,
          fontWeight: '700',
          color: T.text,
          marginBottom: 12,
          lineHeight: 26,
          textAlign: isRTL ? 'right' : 'left',
        },
        modalAuthorRow: {
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          gap: 12,
          marginBottom: 12,
        },
        authorIconWrap: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: T.greenLight,
          alignItems: 'center',
          justifyContent: 'center',
        },
        modalAuthorInfoWrap: {
          flex: 1,
          alignItems: isRTL ? 'flex-end' : 'flex-start',
        },
        authorNameText: {
          fontSize: 13,
          fontFamily: F.semibold,
          fontWeight: '600',
          color: T.text,
        },
        authorLabelText: {
          fontSize: 11,
          fontFamily: F.regular,
          color: T.textMuted,
          marginTop: 1,
        },
        modalDivider: {
          height: 1,
          backgroundColor: T.border,
          marginHorizontal: 20,
          marginBottom: 16,
        },
        modalBodyWrap: {
          paddingHorizontal: 20,
        },
        paragraphText: {
          fontSize: 14.5,
          fontFamily: F.regular,
          color: T.textSub,
          lineHeight: 23,
          marginBottom: 14,
          textAlign: isRTL ? 'right' : 'left',
        },
        paragraphHeader: {
          fontSize: 16,
          fontFamily: F.bold,
          fontWeight: '700',
          color: T.text,
          marginTop: 18,
          marginBottom: 10,
          paddingLeft: isRTL ? 0 : 8,
          paddingRight: isRTL ? 8 : 0,
          borderLeftWidth: isRTL ? 0 : 3,
          borderLeftColor: T.green,
          borderRightWidth: isRTL ? 3 : 0,
          borderRightColor: T.green,
          textAlign: isRTL ? 'right' : 'left',
        },
        bulletList: {
          marginBottom: 14,
          paddingLeft: isRTL ? 0 : 8,
          paddingRight: isRTL ? 8 : 0,
        },
        bulletRow: {
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'flex-start',
          marginBottom: 6,
          gap: 6,
        },
        bulletDot: {
          fontSize: 14,
          color: T.green,
          lineHeight: 18,
        },
        bulletText: {
          flex: 1,
          fontSize: 13.5,
          fontFamily: F.regular,
          color: T.textSub,
          lineHeight: 18,
          textAlign: isRTL ? 'right' : 'left',
        },
        numberedList: {
          marginBottom: 14,
          paddingLeft: isRTL ? 0 : 8,
          paddingRight: isRTL ? 8 : 0,
        },
        numberedText: {
          fontSize: 13.5,
          fontFamily: F.regular,
          color: T.textSub,
          lineHeight: 20,
          marginBottom: 6,
          textAlign: isRTL ? 'right' : 'left',
        },
        sourcesCard: {
          backgroundColor: T.surfaceAlt,
          borderRadius: 12,
          padding: 14,
          marginTop: 14,
          marginBottom: 14,
          borderWidth: 1,
          borderColor: T.border,
        },
        sourcesHeaderRow: {
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          gap: 6,
          marginBottom: 8,
        },
        sourcesTitle: {
          fontSize: 13,
          fontFamily: F.semibold,
          fontWeight: '600',
          color: T.text,
        },
        sourcesRefText: {
          fontSize: 11.5,
          fontFamily: F.regular,
          color: T.textMuted,
          lineHeight: 17,
          marginBottom: 4,
          textAlign: isRTL ? 'right' : 'left',
        },
        modalDisclaimer: {
          marginHorizontal: 20,
          marginTop: 20,
          backgroundColor: T.surfaceAlt,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: T.border,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'flex-start',
          gap: 10,
          padding: 14,
        },
        modalDisclaimerText: {
          flex: 1,
          fontSize: 12,
          fontFamily: F.regular,
          color: T.textMuted,
          lineHeight: 17,
          textAlign: isRTL ? 'right' : 'left',
        },
      }),
    [T, isRTL]
  );

  const renderBodyParagraphs = useCallback((bodyText: string) => {
    return bodyText.split('\n\n').map((paragraph, index) => {
      const cleanText = paragraph.replace(/\\n/g, '\n').trim();
      if (cleanText.startsWith('### ')) {
        return (
          <Text key={index} style={s.paragraphHeader}>
            {t(cleanText.replace('### ', ''))}
          </Text>
        );
      }
      if (cleanText.startsWith('- ')) {
        const listItems = cleanText.split('\n');
        return (
          <View key={index} style={s.bulletList}>
            {listItems.map((item, idx) => (
              <View key={idx} style={s.bulletRow}>
                <Text style={s.bulletDot}>•</Text>
                <Text style={s.bulletText}>{t(item.replace('- ', ''))}</Text>
              </View>
            ))}
          </View>
        );
      }
      if (cleanText.startsWith('1. ') || cleanText.startsWith('2. ') || cleanText.startsWith('3. ')) {
        const listItems = cleanText.split('\n');
        return (
          <View key={index} style={s.numberedList}>
            {listItems.map((item, idx) => {
              const cleanItem = item.replace(/^\d+\.\s*/, '');
              const prefix = item.match(/^\d+\.\s*/)?.[0] || '';
              return (
                <Text key={idx} style={s.numberedText}>
                  {prefix}{t(cleanItem)}
                </Text>
              );
            })}
          </View>
        );
      }
      if (cleanText.startsWith('**Sources') || cleanText.startsWith('**Références') || cleanText.startsWith('**مصادر')) {
        const lines = cleanText.split('\n');
        const titleLine = lines[0].replace(/\*\*/g, '');
        const refLines = lines.slice(1);
        return (
          <View key={index} style={s.sourcesCard}>
            <View style={s.sourcesHeaderRow}>
              <Feather name="book-open" size={14} color={T.green} />
              <Text style={s.sourcesTitle}>{t(titleLine)}</Text>
            </View>
            {refLines.map((ref, idx) => (
              <Text key={idx} style={s.sourcesRefText}>
                {t(ref.replace('- ', ''))}
              </Text>
            ))}
          </View>
        );
      }
      return (
        <Text key={index} style={s.paragraphText}>
          {t(cleanText)}
        </Text>
      );
    });
  }, [s, T, t]);

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[s.page, s.centered]}>
        <ActivityIndicator size="large" color={T.green} />
      </View>
    );
  }

  return (
    <AppScaffold
      title={t('Patient Resources')}
      activeTab="home"
    >
      <View style={s.page}>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[T.green]} />
          }
        >
          {/* ── Categories ─────────────────────────────────────── */}
          <View style={s.sectionRow}>
            <Text style={s.sectionLabel}>{t('Categories')}</Text>
          </View>

          <View style={s.categoriesRow}>
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[s.categoryCard, isActive && s.categoryCardActive]}
                  activeOpacity={0.75}
                  onPress={() => setActiveCategory(isActive ? null : cat.key)}
                >
                  <View
                    style={[
                      s.categoryIconBox,
                      { backgroundColor: isActive ? cat.activeBg : cat.bg },
                    ]}
                  >
                    {cat.iconLib === 'ion' ? (
                      <Ionicons name={cat.icon as any} size={22} color={cat.color} />
                    ) : (
                      <MaterialCommunityIcons name={cat.icon as any} size={22} color={cat.color} />
                    )}
                  </View>
                  <Text style={[s.categoryLabel, isActive && { color: cat.color, fontFamily: F.bold, fontWeight: '700' }]}>
                    {t(cat.label)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Featured ───────────────────────────────────────── */}
          {featured && !activeCategory && (
            <>
              <View style={s.sectionRow}>
                <Text style={s.sectionLabel}>{t('Featured')}</Text>
              </View>

              <TouchableOpacity
                style={s.featuredCard}
                activeOpacity={0.85}
                onPress={() => setSelectedArticle(featured)}
              >
                <Image
                  source={{ uri: CATEGORY_IMAGES[featured.category] }}
                  style={s.featuredCoverImage}
                  resizeMode="cover"
                />
                
                <View
                  style={[
                    s.featuredBadge,
                    {
                      backgroundColor:
                        CATEGORIES.find((c) => c.key === featured.category)?.bg || T.surfaceAlt,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.featuredBadgeText,
                      {
                        color:
                          CATEGORIES.find((c) => c.key === featured.category)?.color || T.textSub,
                      },
                    ]}
                  >
                    {t(
                      CATEGORIES.find((c) => c.key === featured.category)?.label || ''
                    ).replace('\n', ' ')}
                  </Text>
                </View>

                <View style={s.featuredContent}>
                  <Text style={s.featuredTitle}>{t(featured.title)}</Text>
                  <Text style={s.featuredExcerpt} numberOfLines={2}>
                    {t(featured.excerpt)}
                  </Text>

                  <View style={s.featuredFooter}>
                    <View style={s.readTime}>
                      <Feather name="clock" size={12} color={T.textMuted} />
                      <Text style={s.readTimeText}>{featured.readMinutes} {t('min read')}</Text>
                    </View>
                    <View style={s.readMoreBtn}>
                      <Text style={s.readMoreText}>{t('Read Article')}</Text>
                      <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={14} color={T.green} />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </>
          )}

          {/* ── All Resources ──────────────────────────────────── */}
          <View style={s.sectionRow}>
            <Text style={s.sectionLabel}>{t('All ressources')}</Text>
          </View>

          {displayedArticles.length === 0 ? (
            <View style={s.centered}>
              <Feather name="file-text" size={40} color={T.textMuted} />
              <Text style={s.emptyText}>{t('No resources found')}</Text>
            </View>
          ) : (
            displayedArticles.map((article) => {
              const iconCfg = getArticleIconConfig(article.icon);
              return (
              <TouchableOpacity
                key={article.id}
                style={s.articleCard}
                activeOpacity={0.82}
                onPress={() => setSelectedArticle(article)}
              >
                <Image
                  source={{ uri: CATEGORY_IMAGES[article.category] }}
                  style={s.articleThumbnail}
                  resizeMode="cover"
                />
                <View style={s.articleContent}>
                  <View style={s.articleHeaderRow}>
                    <Text
                      style={[
                        s.articleCategoryText,
                        {
                          color:
                            CATEGORIES.find((c) => c.key === article.category)?.color || T.textSub,
                        },
                      ]}
                    >
                      {t(
                        CATEGORIES.find((c) => c.key === article.category)?.label || ''
                      ).replace('\n', ' ')}
                    </Text>
                    <View style={s.articleTime}>
                      <Feather name="clock" size={11} color={T.textMuted} />
                      <Text style={s.articleTimeText}>{article.readMinutes} {t('min')}</Text>
                    </View>
                  </View>
                  <Text style={s.articleTitle} numberOfLines={1}>{t(article.title)}</Text>
                  <Text style={s.articleExcerpt} numberOfLines={2}>
                    {t(article.excerpt)}
                  </Text>
                </View>
              </TouchableOpacity>
              );
            })
          )}

          {/* ── Videos & Sessions ─────────────────────────────── */}
          {videos.length > 0 && (
            <>
              <View style={s.sectionRow}>
                <Text style={s.sectionLabel}>{t('Videos & Sessions')}</Text>
                <TouchableOpacity style={s.seeAllBtn} activeOpacity={0.7}>
                  <Text style={s.seeAllText}>{t('See All')}</Text>
                  <Feather name={isRTL ? "arrow-left" : "arrow-right"} size={14} color={T.red} />
                </TouchableOpacity>
              </View>

              <View style={s.videosRow}>
                {videos.slice(0, 2).map((video) => (
                  <TouchableOpacity
                    key={video.id}
                    style={s.videoCard}
                    activeOpacity={0.82}
                    onPress={() =>
                      Alert.alert(t('Video'), `${t(video.title)}\n${t('by')} ${t(video.presenter)}`)
                    }
                  >
                    <View>
                      <Image
                        source={{ uri: video.thumbnailUrl }}
                        style={s.videoThumb}
                        resizeMode="cover"
                      />
                      <View style={s.videoDurationBadge}>
                        <Text style={s.videoDurationText}>{video.durationMinutes} {t('min')}</Text>
                      </View>
                    </View>
                    <View style={s.videoInfo}>
                      <Text style={s.videoTitle} numberOfLines={2}>
                        {t(video.title)}
                      </Text>
                      <Text style={s.videoPresenter}>{t(video.presenter)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* ── Medical Disclaimer ─────────────────────────────── */}
          <View style={s.disclaimer}>
            <Feather name="alert-triangle" size={18} color={T.red} style={{ marginTop: 1 }} />
            <Text style={s.disclaimerText}>{t('This content is for informational purposes only and does not replace professional medical advice. Always consult a healthcare provider.')}</Text>
          </View>
        </ScrollView>

        {/* ── Patient Resource Article Detail Modal ─────────────────── */}
        <Modal
          visible={!!selectedArticle}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedArticle(null)}
        >
          <View style={s.modalContainer}>
            <View style={s.modalContent}>
              {selectedArticle && (
                <View style={s.modalCoverContainer}>
                  <Image
                    source={{ uri: CATEGORY_IMAGES[selectedArticle.category] }}
                    style={s.modalCoverImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={s.modalFloatCloseBtn}
                    activeOpacity={0.8}
                    onPress={() => setSelectedArticle(null)}
                  >
                    <Feather name="x" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}

              {selectedArticle && (
                <ScrollView
                  style={s.modalScroll}
                  contentContainerStyle={s.modalScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={s.modalHeaderContent}>
                    <View style={s.modalMetaRow}>
                      <View
                        style={[
                          s.modalBadge,
                          {
                            backgroundColor:
                              CATEGORIES.find((c) => c.key === selectedArticle.category)?.bg ||
                              T.surfaceAlt,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            s.modalBadgeText,
                            {
                              color:
                                CATEGORIES.find((c) => c.key === selectedArticle.category)?.color ||
                                T.textSub,
                            },
                          ]}
                        >
                          {t(
                            CATEGORIES.find((c) => c.key === selectedArticle.category)?.label || ''
                          ).replace('\n', ' ')}
                        </Text>
                      </View>
                      
                      <View style={s.modalTimeRow}>
                        <Feather name="clock" size={13} color={T.textMuted} />
                        <Text style={s.modalTimeText}>
                          {selectedArticle.readMinutes} {t('min read')}
                        </Text>
                      </View>
                    </View>

                    <Text style={s.modalTitleText}>{t(selectedArticle.title)}</Text>

                    <View style={s.modalAuthorRow}>
                      <View style={s.authorIconWrap}>
                        <MaterialCommunityIcons name="doctor" size={18} color={T.green} />
                      </View>
                      <View style={s.modalAuthorInfoWrap}>
                        <Text style={s.authorNameText}>{selectedArticle.authorName}</Text>
                        <Text style={s.authorLabelText}>
                          {t('GlUnity Medical Reviewer')} •{' '}
                          {new Date(selectedArticle.publishedAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={s.modalDivider} />

                  {/* Body Paragraphs with custom styling */}
                  <View style={s.modalBodyWrap}>
                    {renderBodyParagraphs(selectedArticle.body)}
                  </View>

                  {/* Medical Disclaimer inside modal */}
                  <View style={s.modalDisclaimer}>
                    <Feather name="info" size={16} color={T.red} style={{ marginTop: 1 }} />
                    <Text style={s.modalDisclaimerText}>
                      {t(
                        'Disclaimer: This educational resource is medically reviewed but does not constitute personal medical advice, diagnosis, or treatment. Always coordinate dietary changes with your clinical gastroenterologist or dietitian.'
                      )}
                    </Text>
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </AppScaffold>
  );
}
