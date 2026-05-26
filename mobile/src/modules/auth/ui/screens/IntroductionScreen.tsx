import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  useWindowDimensions,
  Animated,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/types';
import { Feather } from '@expo/vector-icons';

type Props = NativeStackScreenProps<AuthStackParamList, 'Intro'>;

// ── Illustrations ─────────────────────────────────────────────────────────────

function ScanIllustration() {
  return (
    <View style={il.wrap}>
      <View style={il.productCard}>
        <View style={il.redBand} />
        <View style={il.barcodeRow}>
          {[8, 4, 6, 5, 7, 4, 6].map((h, i) => (
            <View key={i} style={[il.barcodeLine, { height: h * 2, marginHorizontal: 1.5 }]} />
          ))}
        </View>
        <View style={il.textLine1} />
        <View style={il.textLine2} />
      </View>
      <View style={il.checkCircle}>
        <Feather name="check" size={20} color="#fff" />
      </View>
    </View>
  );
}

function MapIllustration() {
  return (
    <View style={il.wrap}>
      <View style={il.mapCard}>
        <View style={[il.mapLine, { top: '30%', left: 0, right: 0, height: 1 }]} />
        <View style={[il.mapLine, { top: '55%', left: 0, right: 0, height: 1 }]} />
        <View style={[il.mapLine, { left: '30%', top: 0, bottom: 0, width: 1 }]} />
        <View style={[il.mapLine, { left: '60%', top: 0, bottom: 0, width: 1 }]} />
        <View style={il.routeLine} />
      </View>
      <View style={il.pin}>
        <View style={il.pinHead}>
          <Text style={il.pinDot}>●</Text>
        </View>
        <View style={il.pinTail} />
      </View>
    </View>
  );
}

function CommunityIllustration() {
  return (
    <View style={il.wrap}>
      <View style={[il.bubble, il.bubbleRight]}>
        <View style={il.bubbleLine} />
        <View style={[il.bubbleLine, { width: '60%' }]} />
      </View>
      <View style={[il.bubble, il.bubbleLeft, il.bubbleGreen]}>
        <View style={[il.bubbleLine, il.bubbleLineLight]} />
        <View style={[il.bubbleLine, il.bubbleLineLight, { width: '55%' }]} />
      </View>
      <View style={il.connectDot1} />
      <View style={il.connectDot2} />
    </View>
  );
}

const il = StyleSheet.create({
  wrap: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },

  // Scan
  productCard: {
    width: 110, height: 130, backgroundColor: '#FFFFFF',
    borderRadius: 8, borderWidth: 1, borderColor: '#2E2E2E',
    overflow: 'hidden', alignItems: 'center', justifyContent: 'space-evenly',
    paddingVertical: 8,
    boxShadow: '0px 2px 6px rgba(0,0,0,0.08)', elevation: 3,
  },
  redBand: { width: '70%', height: 22, backgroundColor: '#C8102E', borderRadius: 3 },
  barcodeRow: { flexDirection: 'row', alignItems: 'flex-end', height: 30 },
  barcodeLine: { width: 2.5, backgroundColor: '#2E2E2E', borderRadius: 1 },
  textLine1: { width: '75%', height: 4, backgroundColor: 'rgba(46,46,46,0.25)', borderRadius: 2 },
  textLine2: { width: '55%', height: 4, backgroundColor: 'rgba(46,46,46,0.15)', borderRadius: 2 },
  checkCircle: {
    position: 'absolute', right: 16, bottom: 16,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#8BC34A', alignItems: 'center', justifyContent: 'center',
  },
  checkText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Map
  mapCard: {
    width: 140, height: 130, backgroundColor: '#FFFFFF',
    borderRadius: 10, borderWidth: 1, borderColor: '#2E2E2E', overflow: 'hidden',
    boxShadow: '0px 2px 6px rgba(0,0,0,0.08)', elevation: 3,
  },
  mapLine: { position: 'absolute', backgroundColor: 'rgba(46,46,46,0.15)' },
  routeLine: {
    position: 'absolute', left: '20%', top: '40%',
    width: '50%', height: 2, backgroundColor: '#8BC34A', borderRadius: 1,
  },
  pin: { position: 'absolute', top: 20, right: 28, alignItems: 'center' },
  pinHead: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#C8102E',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff',
  },
  pinDot: { color: '#fff', fontSize: 10 },
  pinTail: {
    width: 0, height: 0,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#C8102E',
  },

  // Community
  bubble: {
    width: 120, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16,
    boxShadow: '0px 2px 6px rgba(0,0,0,0.07)', elevation: 2,
  },
  bubbleRight: {
    backgroundColor: '#FFFFFF', borderBottomRightRadius: 4,
    alignSelf: 'flex-end', marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(46,46,46,0.12)',
  },
  bubbleLeft: { borderBottomLeftRadius: 4, alignSelf: 'flex-start' },
  bubbleGreen: { backgroundColor: '#8BC34A' },
  bubbleLine: {
    height: 5, backgroundColor: 'rgba(46,46,46,0.2)',
    borderRadius: 3, marginBottom: 5, width: '80%',
  },
  bubbleLineLight: { backgroundColor: 'rgba(255,255,255,0.6)' },
  connectDot1: {
    position: 'absolute', bottom: 10, right: 10,
    width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(139,195,74,0.5)',
  },
  connectDot2: {
    position: 'absolute', top: 10, left: 10,
    width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(200,16,46,0.4)',
  },
});

// ── Slide data ────────────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: '1',
    title: 'Scannez Vos',
    titleAccent: 'Aliments',
    description: "Scannez rapidement les produits pour vérifier s'ils sont sans gluten et sûrs.",
    IllustrationComponent: ScanIllustration,
  },
  {
    id: '2',
    title: 'Trouvez Des',
    titleAccent: 'Lieux Sûrs',
    description: 'Découvrez les restaurants, boulangeries et magasins proposant des options sans gluten près de chez vous.',
    IllustrationComponent: MapIllustration,
  },
  {
    id: '3',
    title: 'Rejoignez La',
    titleAccent: 'Communauté',
    description: "Partagez des recettes, des conseils et des expériences avec d'autres personnes vivant sans gluten.",
    IllustrationComponent: CommunityIllustration,
  },
];

// ── Dots Indicator ────────────────────────────────────────────────────────────
function DotsIndicator({ count, scrollX, screenWidth }: { count: number; scrollX: Animated.Value; screenWidth: number }) {
  return (
    <View style={dot.row}>
      {Array.from({ length: count }).map((_, i) => (
        <Animated.View
          key={i}
          style={[
            dot.base,
            {
              width: scrollX.interpolate({
                inputRange: [(i - 1) * screenWidth, i * screenWidth, (i + 1) * screenWidth],
                outputRange: [7, 13, 7],
                extrapolate: 'clamp',
              }),
              height: scrollX.interpolate({
                inputRange: [(i - 1) * screenWidth, i * screenWidth, (i + 1) * screenWidth],
                outputRange: [7, 13, 7],
                extrapolate: 'clamp',
              }),
              borderWidth: scrollX.interpolate({
                inputRange: [(i - 1) * screenWidth, i * screenWidth, (i + 1) * screenWidth],
                outputRange: [0, 1.5, 0],
                extrapolate: 'clamp',
              }),
              borderColor: '#C8102E',
              backgroundColor: '#C8102E',
              opacity: scrollX.interpolate({
                inputRange: [(i - 1) * screenWidth, i * screenWidth, (i + 1) * screenWidth],
                outputRange: [0.6, 1, 0.6],
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

const dot = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  base: { borderRadius: 99, marginHorizontal: 4 },
});

// ── Single Slide ──────────────────────────────────────────────────────────────
function SlideView({ slide, screenWidth }: { slide: (typeof SLIDES)[0]; screenWidth: number }) {
  const { IllustrationComponent } = slide;
  return (
    <View style={[slideStyles.slide, { width: screenWidth }]}>
      <View style={slideStyles.illustrationArea}>
        <View style={slideStyles.greenCircle} />
        <IllustrationComponent />
      </View>
      <Text style={slideStyles.title}>
        {slide.title}{' '}
        <Text style={slideStyles.titleAccent}>{slide.titleAccent}</Text>
      </Text>
      <Text style={slideStyles.description}>{slide.description}</Text>
    </View>
  );
}

const slideStyles = StyleSheet.create({
  slide: {
    flex: 1, backgroundColor: '#F6F5F3',
    alignItems: 'center', paddingTop: 95,
    paddingHorizontal: 26, paddingBottom: 100,
  },
  illustrationArea: {
    width: 316, height: 314,
    alignItems: 'center', justifyContent: 'center', marginBottom: 32,
  },
  greenCircle: {
    position: 'absolute', width: 316, height: 314,
    borderRadius: 158, backgroundColor: 'rgba(139, 195, 74, 0.1)',
  },
  title: {
    fontWeight: '700', fontSize: 22, lineHeight: 33,
    textAlign: 'center', letterSpacing: 0.11,
    color: '#2E2E2E', textTransform: 'capitalize', marginBottom: 14,
  },
  titleAccent: { color: '#8BC34A' },
  description: {
    fontWeight: '500', fontSize: 16, lineHeight: 24,
    textAlign: 'center', letterSpacing: 0.08, color: '#707070', width: 340,
  },
});

// ── Main Component ────────────────────────────────────────────────────────────
export default function IntroductionScreen({ navigation }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<(typeof SLIDES)[number]>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const scrollToIndex = (index: number) => {
    const safeIndex = Math.max(0, Math.min(index, SLIDES.length - 1));
    const offset = safeIndex * screenWidth;
    flatListRef.current?.scrollToOffset({ offset, animated: true });
    setActiveIndex(safeIndex);
  };

  const goNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      scrollToIndex(activeIndex + 1);
    } else {
      navigation.replace('Welcome');
    }
  };

  const goBack = () => {
    if (activeIndex > 0) {
      scrollToIndex(activeIndex - 1);
    }
  };

  const onMomentumScrollEnd = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
    setActiveIndex(idx);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F5F3" />

      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
          index,
        })}
        onScrollToIndexFailed={({ index }) => scrollToIndex(index)}
        renderItem={({ item }) => <SlideView slide={item} screenWidth={screenWidth} />}
      />

      {/* Bottom navigation bar */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.8}>
          <Feather name="arrow-left" size={24} color="#2E2E2E" />
        </TouchableOpacity>

        <DotsIndicator count={SLIDES.length} scrollX={scrollX} screenWidth={screenWidth} />

        <TouchableOpacity style={styles.nextBtn} onPress={goNext} activeOpacity={0.8}>
          {activeIndex === SLIDES.length - 1 ? (
            <Feather name="check" size={32} color="#FFFFFF" />
          ) : (
            <Feather name="arrow-right" size={32} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F5F3' },
  navBar: {
    position: 'absolute', bottom: 40, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 9,
    zIndex: 5,
  },
  backBtn: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    boxShadow: '0px 2px 14px rgba(0,0,0,0.11)', elevation: 6,
  },
  arrowText: { fontSize: 20, color: '#2E2E2E', fontWeight: '600' },
  nextBtn: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: '#8BC34A',
    alignItems: 'center', justifyContent: 'center',
    boxShadow: '0px 4px 12px rgba(139,195,74,0.35)', elevation: 8,
  },
  arrowTextWhite: { fontSize: 26, color: '#FFFFFF', fontWeight: '700' },
});
