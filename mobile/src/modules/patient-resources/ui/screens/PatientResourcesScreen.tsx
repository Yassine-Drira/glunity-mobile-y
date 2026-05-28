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
      <MaterialCommunityIcons name={iconName as any} size={size} color={color} />
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
          paddingVertical: 14,
          paddingHorizontal: 8,
          alignItems: 'center',
          gap: 8,
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
          padding: 20,
          borderWidth: 1,
          borderColor: T.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        },
        featuredIconCircle: {
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: T.redLight,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'center',
          marginBottom: 16,
        },
        featuredTitle: {
          fontSize: 19,
          fontFamily: F.bold,
          fontWeight: '700',
          color: T.text,
          marginBottom: 8,
          letterSpacing: -0.3,
          textAlign: isRTL ? 'right' : 'left',
        },
        featuredExcerpt: {
          fontSize: 13.5,
          fontFamily: F.regular,
          color: T.textSub,
          lineHeight: 20,
          marginBottom: 16,
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
          fontSize: 13,
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
          padding: 16,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'flex-start',
          gap: 14,
          borderWidth: 1,
          borderColor: T.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 4,
          elevation: 1,
        },
        articleContent: { flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' },
        articleTitle: {
          fontSize: 14.5,
          fontFamily: F.bold,
          fontWeight: '700',
          color: T.text,
          marginBottom: 4,
          lineHeight: 20,
          textAlign: isRTL ? 'right' : 'left',
          width: '100%',
        },
        articleExcerpt: {
          fontSize: 12.5,
          fontFamily: F.regular,
          color: T.textSub,
          lineHeight: 18,
          marginBottom: 8,
          textAlign: isRTL ? 'right' : 'left',
          width: '100%',
        },
        articleMeta: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 },
        articleTime: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 },
        articleTimeText: { fontSize: 11, fontFamily: F.regular, color: T.textMuted },
        articleReadMore: {
          fontSize: 12,
          fontFamily: F.semibold,
          fontWeight: '600',
          color: T.green,
        },

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
      }),
    [T, isRTL]
  );

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
                activeOpacity={0.82}
                onPress={() =>
                  Alert.alert(t('Article'), t(featured.body))
                }
              >
                {/* Circle icon */}
                <View style={s.featuredIconCircle}>
                  <MaterialCommunityIcons
                    name={featured.icon as any}
                    size={34}
                    color={T.red}
                  />
                </View>

                <Text style={s.featuredTitle}>{t(featured.title)}</Text>
                <Text style={s.featuredExcerpt} numberOfLines={3}>
                  {t(featured.excerpt)}
                </Text>

                <View style={s.featuredFooter}>
                  <View style={s.readTime}>
                    <Feather name="clock" size={13} color={T.textMuted} />
                    <Text style={s.readTimeText}>{featured.readMinutes} {t('min read')}</Text>
                  </View>
                  <TouchableOpacity style={s.readMoreBtn} activeOpacity={0.7}>
                    <Text style={s.readMoreText}>{t('Read more')}</Text>
                    <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={14} color={T.green} />
                  </TouchableOpacity>
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
                activeOpacity={0.8}
                onPress={() => Alert.alert(t(article.title), t(article.body))}
              >
                <ArticleIcon
                  iconName={article.icon}
                  size={22}
                  color={iconCfg.color}
                  bg={iconCfg.bg}
                />
                <View style={s.articleContent}>
                  <Text style={s.articleTitle}>{t(article.title)}</Text>
                  <Text style={s.articleExcerpt} numberOfLines={2}>
                    {t(article.excerpt)}
                  </Text>
                  <View style={s.articleMeta}>
                    <View style={s.articleTime}>
                      <Feather name="clock" size={11} color={T.textMuted} />
                      <Text style={s.articleTimeText}>{article.readMinutes} {t('min')}</Text>
                    </View>
                    <TouchableOpacity activeOpacity={0.7}>
                      <Text style={s.articleReadMore}>{t('Read more →')}</Text>
                    </TouchableOpacity>
                  </View>
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
      </View>
    </AppScaffold>
  );
}
