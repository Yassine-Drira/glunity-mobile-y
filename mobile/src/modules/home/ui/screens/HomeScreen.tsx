import React from "react";
import {
  Animated,
  Easing,
  FlatList,
  Image,
  InteractionManager,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { homeScreenText } from "../../state/homeData";
import type { HomeScreenProps } from "../../domain/home.types";
import { BottomNavBar } from "@/shared/components/BottomNavBar";

const ICON_RED = "#C8102E";
const SCREEN_BG = "#F6F5F3";

const optimizeUnsplashImage = (url: string, width: number, height: number) => {
  if (!url.includes("images.unsplash.com")) {
    return url;
  }

  const hasQuery = url.includes("?");
  const separator = hasQuery ? "&" : "?";
  return `${url}${separator}auto=format&fit=crop&q=75&w=${width}&h=${height}`;
};

export function HomeScreen({
  user,
  hasNotification = false,
  onPressScan,
  onPressSearch,
  onPressNotification,
  quickAccessItems,
  recipes,
  onPressRecipesSeeAll,
  events,
  onPressEventsSeeAll,
  onPressProfilePhoto,
  onPressNavHome,
  onPressNavEvents,
  onPressNavFab,
  onPressNavReels,
  onPressNavProfile,
}: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const searchAnim = React.useRef(new Animated.Value(0)).current;
  const qrFloat = React.useRef(new Animated.Value(0)).current;
  const inputRef = React.useRef<TextInput>(null);

  const avatarUrl = React.useMemo(() => optimizeUnsplashImage(user.avatarUrl, 96, 96), [user.avatarUrl]);

  const optimizedRecipes = React.useMemo(
    () => recipes.map((item) => ({ ...item, imageUrl: optimizeUnsplashImage(item.imageUrl, 400, 320) })),
    [recipes],
  );

  const optimizedEvents = React.useMemo(
    () => events.map((item) => ({ ...item, imageUrl: optimizeUnsplashImage(item.imageUrl, 420, 320) })),
    [events],
  );

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(qrFloat, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(qrFloat, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    ).start();
  }, [qrFloat]);

  React.useEffect(() => {
    const urls = [
      avatarUrl,
      ...optimizedRecipes.slice(0, 3).map((item) => item.imageUrl),
      ...optimizedEvents.slice(0, 2).map((item) => item.imageUrl),
    ];

    urls.forEach((url) => {
      Image.prefetch(url).catch(() => {
        // Ignore prefetch failures; rendering falls back to normal loading.
      });
    });
  }, [avatarUrl, optimizedEvents, optimizedRecipes]);

  const qrTranslateY = qrFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [2, -8],
  });

  const qrScale = qrFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0.99, 1.03],
  });

  const toggleSearch = React.useCallback(() => {
    const next = !searchOpen;
    setSearchOpen(next);

    if (next) {
      requestAnimationFrame(() => inputRef.current?.focus());
      InteractionManager.runAfterInteractions(() => onPressSearch());
    } else {
      inputRef.current?.blur();
      setQuery("");
    }

    Animated.timing(searchAnim, {
      toValue: next ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [onPressSearch, searchAnim, searchOpen]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredQuickAccess = React.useMemo(() => {
    if (!normalizedQuery) return quickAccessItems;
    return quickAccessItems.filter((item) => item.label.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery, quickAccessItems]);

  const filteredRecipes = React.useMemo(() => {
    if (!normalizedQuery) return optimizedRecipes;
    return optimizedRecipes.filter((item) => item.title.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery, optimizedRecipes]);

  const filteredEvents = React.useMemo(() => {
    if (!normalizedQuery) return optimizedEvents;
    return optimizedEvents.filter((item) => {
      const blob = `${item.title} ${item.location} ${item.date}`.toLowerCase();
      return blob.includes(normalizedQuery);
    });
  }, [normalizedQuery, optimizedEvents]);

  const searchHeight = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 48],
  });

  const searchOpacity = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 8, 22) }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.userInfo} activeOpacity={0.8} onPress={onPressProfilePhoto}>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            <Text style={styles.greeting}>{user.name}</Text>
            <View style={styles.avatarBadge}>
              <Feather name="award" size={10} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <View style={styles.headerActions}>
            <TouchableOpacity onPress={toggleSearch} activeOpacity={0.8} style={styles.iconButton}>
              <Feather name="search" size={18} color="#393C40" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onPressNotification} activeOpacity={0.8} style={styles.iconButton}>
              <Ionicons name="notifications-outline" size={18} color="#393C40" />
              {hasNotification ? <View style={styles.notificationDot} /> : null}
            </TouchableOpacity>
          </View>
        </View>

        <Animated.View style={[styles.searchWrap, { height: searchHeight, opacity: searchOpacity }]}>
          <View style={styles.searchInner}>
            <Feather name="search" size={16} color="#6B7280" />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder="Search products, recipes, events"
              placeholderTextColor="#9CA3AF"
              underlineColorAndroid="transparent"
              style={styles.searchInput}
            />
            {!!query && (
              <TouchableOpacity activeOpacity={0.8} onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        <View style={styles.heroCard}>
          <Animated.View
            style={{
              transform: [{ translateY: qrTranslateY }, { scale: qrScale }],
            }}
          >
            <Ionicons name="qr-code" size={84} color="#FFFFFF" />
          </Animated.View>
          <Text style={styles.heroSubtitle}>{homeScreenText.qrSubtitle}</Text>
          <TouchableOpacity activeOpacity={0.85} onPress={onPressScan} style={styles.scanCta}>
            <Text style={styles.scanCtaText}>Tap to Scan</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitlePrimary}>{homeScreenText.quickAccessTitle}</Text>

        <View style={styles.quickGrid}>
          {filteredQuickAccess.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.85}
              onPress={item.onPress}
              style={styles.quickCard}
            >
              <View style={styles.quickIconWrap}>
                <Ionicons name={item.icon} size={22} color={ICON_RED} />
              </View>
              <Text style={styles.quickCardLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionRow}>
          <View style={styles.sectionRowLeft}>
            <Text style={styles.sectionTitleSecondary}>{homeScreenText.checkRecipesTitle}</Text>
            <View style={styles.gfPill}>
              <Ionicons name="sparkles" size={10} color="#FFFFFF" />
              <Text style={styles.gfPillText}>GF</Text>
            </View>
          </View>
          <TouchableOpacity activeOpacity={0.8} onPress={onPressRecipesSeeAll}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          horizontal
          data={filteredRecipes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.recipesList}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={0.85} onPress={item.onPress} style={styles.recipeCard}>
              <Image source={{ uri: item.imageUrl }} resizeMode="cover" style={styles.recipeImage} />
              <Text style={styles.recipeName} numberOfLines={2}>
                {item.title}
              </Text>
            </TouchableOpacity>
          )}
        />

        <View style={[styles.sectionRow, styles.eventsHeader]}>
          <Text style={styles.sectionTitleSecondary}>{homeScreenText.checkEventsTitle}</Text>
          <TouchableOpacity activeOpacity={0.8} onPress={onPressEventsSeeAll}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.eventsRow}>
          {filteredEvents.map((item) => (
            <TouchableOpacity key={item.id} activeOpacity={0.85} onPress={item.onPress} style={styles.eventCard}>
              <Image source={{ uri: item.imageUrl }} style={styles.eventImage} />
              <View style={styles.eventBody}>
                <Text style={styles.eventTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={10} color={ICON_RED} />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {item.location}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={10} color={ICON_RED} />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {item.date}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 116 + insets.bottom }} />
      </ScrollView>

      <BottomNavBar
        activeTab="home"
        idPrefix="home-nav"
        onPressHome={onPressNavHome}
        onPressEvents={onPressNavEvents}
        onPressCenter={onPressNavFab}
        onPressReels={onPressNavReels}
        onPressProfile={onPressNavProfile}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  screen: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  content: {
    paddingHorizontal: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
    paddingHorizontal: 6,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
  },
  avatarBadge: {
    position: "absolute",
    left: 27,
    top: 24,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#F9FAFB",
    backgroundColor: colors.primaryGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: {
    marginLeft: 8,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "500",
    color: "#343831",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchWrap: {
    overflow: "hidden",
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: SCREEN_BG,
  },
  searchInner: {
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#111827",
    paddingVertical: 0,
    backgroundColor: "transparent",
    includeFontPadding: false,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6F5F3",
  },
  notificationDot: {
    position: "absolute",
    right: 8,
    top: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ICON_RED,
  },
  heroCard: {
    height: 238,
    borderRadius: 24,
    backgroundColor: "rgba(139, 195, 74, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 6,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 10,
    lineHeight: 24,
    color: "#DCFCE7",
    textTransform: "capitalize",
    fontWeight: "400",
  },
  scanCta: {
    marginTop: 12,
    height: 40,
    minWidth: 86,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  scanCtaText: {
    fontSize: 11,
    lineHeight: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sectionTitlePrimary: {
    marginTop: 22,
    marginLeft: 0,
    fontSize: 15,
    lineHeight: 28,
    fontWeight: "700",
    color: "#111827",
  },
  quickGrid: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  quickCard: {
    width: "48.2%",
    backgroundColor: "#F6F5F3",
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 24,
    marginBottom: 14,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  quickIconWrap: {
    width: 55,
    height: 55,
    borderRadius: 16,
    backgroundColor: "rgba(139, 195, 74, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  quickCardLabel: {
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.2,
    fontWeight: "600",
    color: "#2E2E2E",
  },
  sectionRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitleSecondary: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
    letterSpacing: 0.2,
    color: "#363636",
  },
  gfPill: {
    height: 24,
    borderRadius: 999,
    paddingHorizontal: 8,
    backgroundColor: "#8BC34A",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  gfPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  seeAll: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    color: ICON_RED,
  },
  recipesList: {
    marginTop: 12,
    paddingBottom: 6,
    gap: 12,
  },
  recipeCard: {
    width: 138,
    height: 190,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
    overflow: "hidden",
  },
  recipeImage: {
    width: "100%",
    height: 140,
  },
  recipeName: {
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 8,
    fontSize: 15,
    lineHeight: 17,
    fontWeight: "700",
    color: "#000000",
  },
  eventsHeader: {
    marginTop: 18,
  },
  eventsRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  eventCard: {
    width: "48.3%",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  eventImage: {
    width: "100%",
    height: 128,
    backgroundColor: "#F3F4F6",
  },
  eventBody: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
  },
  eventTitle: {
    fontSize: 9,
    lineHeight: 14,
    fontWeight: "700",
    color: "#111827",
  },
  metaRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    flex: 1,
    fontSize: 9,
    lineHeight: 14,
    fontWeight: "400",
    color: "#2E2E2E",
  },
});

export default HomeScreen;