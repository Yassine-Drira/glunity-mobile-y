import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, ScrollView, TouchableOpacity, Text, ViewToken, Modal, TextInput, ActivityIndicator, Alert, Platform, Image, StatusBar, useWindowDimensions, Dimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import { useReelsFeed } from '../../hooks/useReelsFeed';
import { ReelPlayerItem } from '../components/ReelPlayerItem';
import { BottomNavBar } from '@/shared/components/BottomNavBar';
import { useAuth } from '@/modules/auth/state/auth.context';
import { useTheme } from '@/shared/context/theme.context';
import http from '../../../../core/network/http.client';
import messagingHttp from '../../../../core/network/messaging-http.client';
import { ShareCacheService } from '../../services/share-cache.service';
import { ShareBottomSheet } from '../components/share/ShareBottomSheet';


const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedText = Animated.createAnimatedComponent(Text);

interface CategoryPillProps {
	cat: string;
	isActive: boolean;
	onPress: () => void;
}

function CategoryPill({ cat, isActive, onPress }: CategoryPillProps) {
	const animatedStyle = useAnimatedStyle(() => {
		return {
			backgroundColor: withTiming(isActive ? '#FFFFFF' : '#6DAE3F', { duration: 200 }),
			transform: [{ scale: withSpring(isActive ? 1.05 : 1.0, { damping: 15, stiffness: 150 }) }],
		};
	}, [isActive]);

	const animatedTextStyle = useAnimatedStyle(() => {
		return {
			color: withTiming(isActive ? '#000000' : '#FFFFFF', { duration: 200 }),
		};
	}, [isActive]);

	return (
		<AnimatedTouchableOpacity
			style={[styles.categoryPill, animatedStyle]}
			onPress={onPress}
			activeOpacity={0.8}
		>
			<AnimatedText style={[styles.categoryText, animatedTextStyle]}>
				{cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
			</AnimatedText>
		</AnimatedTouchableOpacity>
	);
}

// ContactAvatar removed, logic moved to ShareItem.tsx

export default function ReelsFeedScreen() {
	const { theme: T, isDark } = useTheme();
	const { 
		reels, 
		category, 
		changeCategory, 
		refreshing, 
		refresh, 
		loadMore, 
		hasMore,
		toggleLike, 
		recordView,
		recordShare,
		incrementCommentsCount,
		loading,
		error,
		activeIndex,
		setActiveIndex
	} = useReelsFeed();
	const { height: layoutHeight, width: layoutWidth } = useWindowDimensions();
	const navigation = useNavigation<any>();
	const route = useRoute<any>();
	const flatListRef = useRef<FlatList>(null);
	const insets = useSafeAreaInsets();
	const { user } = useAuth();
	// When the comments sheet is open in any item, we disable the feed
	// FlatList scroll so vertical swipes go to the comments list, not the video.
	const [commentsOpen, setCommentsOpen] = useState(false);

	// Transition Opacity
	const feedOpacity = useSharedValue(1);


	const animatedFeedStyle = useAnimatedStyle(() => ({
		opacity: feedOpacity.value,
	}));

	const handleCategoryChange = useCallback(async (newCat: string) => {
		if (newCat === category) return;

		// Subtle haptic tick for filter tap
		try {
			await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		} catch (err) {}

		// Fade out current content
		feedOpacity.value = withTiming(0, { duration: 150 });

		// Perform category change after fade-out completes
		setTimeout(() => {
			changeCategory(newCat);
			// Fade in new content
			feedOpacity.value = withTiming(1, { duration: 250 });
		}, 150);
	}, [category, changeCategory, feedOpacity]);

	// Optimized layout lookup to prevent blank screens/jumping in FlatList
	const getItemLayout = useCallback((data: any, index: number) => ({
		length: layoutHeight,
		offset: layoutHeight * index,
		index,
	}), [layoutHeight]);

	useEffect(() => {
		if (route.params?.reelId && reels.length > 0) {
			const targetId = route.params.reelId;
			const index = reels.findIndex(r => r.id === targetId);
			if (index !== -1) {
				setActiveIndex(index);
				setTimeout(() => {
					flatListRef.current?.scrollToIndex({ index, animated: true });
				}, 100);
				// Clear parameters to prevent re-triggering on layout changes
				navigation.setParams({ reelId: undefined, commentId: undefined, replyId: undefined });
			}
		}
	}, [route.params?.reelId, reels, navigation]);

	useEffect(() => {
		if (route.params?.refresh) {
			refresh();
			navigation.setParams({ refresh: undefined });
		}
	}, [route.params?.refresh, refresh, navigation]);

	// Auto-open newly uploaded reel
	useEffect(() => {
		if (route.params?.autoOpenReelId && reels.length > 0) {
			const reelIndex = reels.findIndex(r => r.id === route.params?.autoOpenReelId);
			if (reelIndex !== -1) {
				// Scroll to the reel
				setActiveIndex(reelIndex);
				flatListRef.current?.scrollToIndex({ index: reelIndex, animated: true });
				// Clear the param so it doesn't auto-open again
				navigation.setParams({ autoOpenReelId: undefined });
			}
		}
	}, [route.params?.autoOpenReelId, reels, navigation]);

	useEffect(() => {
		if (hasMore && reels.length > 0 && activeIndex >= reels.length - 2) {
			loadMore();
		}
	}, [activeIndex, reels.length, hasMore, loadMore]);

	// Share Sheet States
	const [shareModalVisible, setShareModalVisible] = useState(false);
	const [sharingReel, setSharingReel] = useState<any | null>(null);

	// Prefetch sharing targets on screen mount
	useEffect(() => {
		ShareCacheService.prefetch();
	}, []);

	const openShareSheet = useCallback((reel: any) => {
		setSharingReel(reel);
		setShareModalVisible(true);
	}, []);

	const closeShareSheet = useCallback(() => {
		setShareModalVisible(false);
	}, []);

	// Sync refs during render (NOT in useEffect!) so that renderItem
	// always reads the latest value. useEffect runs AFTER render, which
	// causes a 1-frame delay where the previous video still thinks it's active.
	const activeIndexRef = useRef(activeIndex);
	activeIndexRef.current = activeIndex;

	const setActiveIndexRef = useRef(setActiveIndex);
	setActiveIndexRef.current = setActiveIndex;

	const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
		const visible = viewableItems.find(item => item.isViewable && item.index !== null);
		if (visible && visible.index !== null) {
			if (visible.index !== activeIndexRef.current) {
				setActiveIndexRef.current(visible.index);
			}
		}
	}).current;

	const viewabilityConfig = useRef({
		itemVisiblePercentThreshold: 80,
	}).current;

	// renderItem wrapped in useCallback — MUST NOT depend on activeIndex.
	// Including activeIndex in deps causes the FlatList to receive a new
	// renderItem reference on every swipe, which invalidates all cells and
	// re-renders only initialNumToRender items (= 3).
	// Instead, we pass the index and activeIndex separately so FlatList
	// keeps all mounted cells alive across swipes.
	const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
		<ReelPlayerItem
			reel={item}
			isActive={index === activeIndexRef.current}
			isPreloading={
				Math.abs(index - activeIndexRef.current) <= 3 && index !== activeIndexRef.current
			}
			onToggleLike={toggleLike}
			onRecordView={recordView}
			onRecordShare={recordShare}
			onIncrementCommentsCount={incrementCommentsCount}
			onOpenShareSheet={openShareSheet}
			onCommentsVisibilityChange={setCommentsOpen}
			containerHeight={layoutHeight}
			containerWidth={layoutWidth}
			initialCommentId={index === activeIndexRef.current ? route.params?.commentId : undefined}
			initialReplyId={index === activeIndexRef.current ? route.params?.replyId : undefined}
		/>
	), [toggleLike, recordView, recordShare, incrementCommentsCount, openShareSheet, layoutHeight, layoutWidth, route.params?.commentId, route.params?.replyId]);

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
			
			<Animated.View style={[styles.feedContainer, animatedFeedStyle]}>
				{/* Only mount FlatList when data is available.
				 *  Mounting it with data=[] then transitioning to data=[items]
				 *  causes FlatList to apply initialNumToRender limits and
				 *  break scrolling. By mounting only with data, the FlatList
				 *  always starts with the full dataset. */}
				{reels.length > 0 && (
					<FlatList
						key={category}
						ref={flatListRef}
						data={reels}
						extraData={activeIndex}
						keyExtractor={(item) => item.id}
						renderItem={renderItem}
						pagingEnabled
						decelerationRate="fast"
						bounces={false}
						overScrollMode="never"
						showsVerticalScrollIndicator={false}
						scrollEnabled={!commentsOpen}
						onViewableItemsChanged={onViewableItemsChanged}
						viewabilityConfig={viewabilityConfig}
						scrollEventThrottle={16}
						getItemLayout={getItemLayout}
						windowSize={15}
						initialNumToRender={3}
						maxToRenderPerBatch={5}
						updateCellsBatchingPeriod={50}
						removeClippedSubviews={false}
						onEndReached={loadMore}
						onEndReachedThreshold={0.5}
						refreshing={refreshing}
						onRefresh={refresh}
						initialScrollIndex={
							reels.length > 0 && activeIndex > 0 && activeIndex < reels.length
								? activeIndex
								: undefined
						}
					/>
				)}

			</Animated.View>

			{/* Top Category Filter Bar */}
			<View style={[styles.categoryContainer, { top: Math.max(insets.top, 12) + 12 }]} pointerEvents="box-none">
				<ScrollView 
					horizontal 
					showsHorizontalScrollIndicator={false} 
					contentContainerStyle={styles.categoryContent}
				>
					{['all', 'recipes', 'tips', 'products', 'lifestyle'].map((cat) => (
						<CategoryPill
							key={cat}
							cat={cat}
							isActive={category === cat}
							onPress={() => handleCategoryChange(cat)}
						/>
					))}
				</ScrollView>
			</View>

			{/* Loading State */}
			{loading && reels.length === 0 && (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#6DAE3F" />
				</View>
			)}

			{/* Error State */}
			{error && reels.length === 0 && !refreshing && (
				<View style={styles.emptyContainer}>
					<Ionicons name="alert-circle-outline" size={60} color="#FF2D55" />
					<Text style={[styles.emptyText, { color: '#FF2D55', textAlign: 'center' }]}>{error}</Text>
					<TouchableOpacity style={styles.createButton} onPress={refresh}>
						<Text style={styles.createButtonText}>Retry</Text>
					</TouchableOpacity>
				</View>
			)}

			{/* Empty Feed Placeholder */}
			{!loading && !error && reels.length === 0 && !refreshing && (
				<View style={styles.emptyContainer}>
					<Ionicons name="film-outline" size={60} color="#8A8A8E" />
					<Text style={styles.emptyText}>No reels available yet</Text>
					<TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('ReelCapture')}>
						<Text style={styles.createButtonText}>Create a Reel</Text>
					</TouchableOpacity>
				</View>
			)}

			{/* Floating Bottom Navigation Bar */}
			<BottomNavBar
				activeTab="reels"
				onPressHome={() => navigation.navigate('Home')}
				onPressEvents={() => navigation.navigate('Events')}
				onPressCenter={() => navigation.navigate('Map')}
				onPressReels={() => navigation.navigate('ReelsFeed')}
				onPressProfile={() => {
					if (user?.profileType === 'pro_commerce') {
						navigation.navigate('SellerProProfile');
					} else {
						navigation.navigate('Profile');
					}
				}}
			/>

			<ShareBottomSheet
				isVisible={shareModalVisible}
				onClose={closeShareSheet}
				reel={sharingReel}
				onShareSuccess={recordShare}
			/>
			</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#000',
		position: 'relative',
	},
	feedContainer: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
	},
	loadingContainer: {
		position: 'absolute',
		top: '45%',
		left: 0,
		right: 0,
		alignItems: 'center',
		justifyContent: 'center',
	},
	floatingButton: {
		position: 'absolute',
		backgroundColor: 'rgba(0,0,0,0.5)',
		width: 44,
		height: 44,
		borderRadius: 22,
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 100,
	},
	emptyContainer: {
		position: 'absolute',
		top: '40%',
		left: 0,
		right: 0,
		alignItems: 'center',
		paddingHorizontal: 20,
	},
	emptyText: {
		color: '#8A8A8E',
		fontSize: 16,
		marginTop: 12,
		marginBottom: 20,
	},
	createButton: {
		backgroundColor: '#6DAE3F',
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 24,
	},
	createButtonText: {
		color: '#FFF',
		fontWeight: '600',
		fontSize: 15,
	},
	categoryContainer: {
		position: 'absolute',
		left: 0,
		right: 0,
		height: 44,
		zIndex: 100,
	},
	categoryContent: {
		paddingHorizontal: 16,
		alignItems: 'center',
		gap: 8,
	},
	categoryPill: {
		paddingHorizontal: 18,
		paddingVertical: 8,
		borderRadius: 20,
		justifyContent: 'center',
		alignItems: 'center',
	},
	categoryPillActive: {
		backgroundColor: '#FFF',
	},
	categoryPillInactive: {
		backgroundColor: '#6DAE3F',
	},
	categoryText: {
		fontSize: 14,
		fontWeight: '700',
	},
	categoryTextActive: {
		color: '#000',
	},
	categoryTextInactive: {
		color: '#FFF',
	},
	shareOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.6)',
		justifyContent: 'flex-end',
	},
			shareContainer: {
				backgroundColor: '#FFFFFF',
				borderTopLeftRadius: 24,
				borderTopRightRadius: 24,
				maxHeight: '75%',
				paddingBottom: Platform.OS === 'ios' ? 34 : 24,
				borderWidth: 1,
				borderColor: 'rgba(0,0,0,0.06)',
				shadowColor: '#000',
				shadowOpacity: 0.06,
				shadowRadius: 12,
				shadowOffset: { width: 0, height: -6 },
			},
		shareHeader: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			paddingHorizontal: 20,
			paddingVertical: 18,
			borderBottomWidth: 1,
			borderBottomColor: 'rgba(0,0,0,0.06)',
		},
		shareTitle: {
			color: '#1C1C1E',
			fontSize: 18,
			fontWeight: '700',
		},
	shareSearchContainer: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F2F2F4',
		paddingHorizontal: 12,
		borderRadius: 12,
		height: 44,
		shadowColor: '#000',
		shadowOpacity: 0.06,
		shadowRadius: 6,
		shadowOffset: { width: 0, height: 2 },
	},
	shareSearchInput: {
		flex: 1,
		color: '#1C1C1E',
		fontSize: 14,
		marginLeft: 8,
		padding: 0,
	},
	shareList: {
		paddingHorizontal: 16,
	},

		// New grid styles
		gridList: {
			paddingHorizontal: 6,
		},
		searchRow: {
			flexDirection: 'row',
			alignItems: 'center',
			paddingHorizontal: 12,
			paddingTop: 12,
			paddingBottom: 8,
		},
		searchBar: {
			flex: 1,
			flexDirection: 'row',
			alignItems: 'center',
			backgroundColor: '#F2F2F4',
			paddingHorizontal: 12,
			borderRadius: 24,
			height: 44,
			marginRight: 8,
		},
		searchInput: {
			flex: 1,
			marginLeft: 8,
			color: '#1C1C1E',
			fontSize: 14,
		},
		groupButton: {
			width: 44,
			height: 44,
			borderRadius: 22,
			backgroundColor: '#fff',
			alignItems: 'center',
			justifyContent: 'center',
			shadowColor: '#000',
			shadowOpacity: 0.06,
			shadowRadius: 6,
			shadowOffset: { width: 0, height: 2 },
		},
		contactName: {
			marginTop: 8,
			fontSize: 13,
			color: '#1C1C1E',
			textAlign: 'center',
			maxWidth: 84,
		},
		checkBadge: {
			position: 'absolute',
			right: -6,
			bottom: -6,
		},
		checkBadgeInner: {
			width: 26,
			height: 26,
			borderRadius: 13,
			backgroundColor: '#2E74FF',
			alignItems: 'center',
			justifyContent: 'center',
			shadowColor: '#2E74FF',
			shadowOpacity: 0.16,
			shadowRadius: 6,
			shadowOffset: { width: 0, height: 2 },
		},

		// Composer styles
		composerContainer: {
			position: 'absolute',
			left: 12,
			right: 12,
			bottom: Platform.OS === 'ios' ? 12 : 12,
			backgroundColor: '#FFFFFF',
			borderRadius: 14,
			padding: 12,
			alignItems: 'center',
			justifyContent: 'center',
			shadowColor: '#000',
			shadowOpacity: 0.08,
			shadowRadius: 12,
			shadowOffset: { width: 0, height: 6 },
		},
		composerInput: {
			width: '100%',
			height: 44,
			borderRadius: 10,
			backgroundColor: '#F6F7FB',
			paddingHorizontal: 12,
			marginBottom: 10,
			color: '#1C1C1E',
		},
		sendButton: {
			width: '100%',
			height: 44,
			borderRadius: 12,
			backgroundColor: '#2E74FF',
			alignItems: 'center',
			justifyContent: 'center',
		},
		sendButtonDisabled: {
			backgroundColor: '#A3C1FF',
		},
		sendButtonText: {
			color: '#FFF',
			fontWeight: '700',
			fontSize: 15,
		},
	shareItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: 'rgba(255,255,255,0.05)',
	},
	shareItemLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		marginRight: 12,
	},
	shareAvatar: {
		width: 44,
		height: 44,
		borderRadius: 22,
		marginRight: 12,
		backgroundColor: '#3A3A3C',
	},
	shareItemName: {
		color: '#FFF',
		fontSize: 15,
		fontWeight: '600',
		maxWidth: 160,
	},
	shareItemSubtitle: {
		color: '#8A8A8E',
		fontSize: 12,
		marginTop: 2,
	},
	sendBtn: {
		backgroundColor: '#6DAE3F',
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 18,
		minWidth: 78,
		alignItems: 'center',
		justifyContent: 'center',
	},
	sendBtnSent: {
		backgroundColor: '#2C2C2E',
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.1)',
	},
	sendBtnText: {
		color: '#FFF',
		fontSize: 13,
		fontWeight: '700',
	},
	sendBtnTextSent: {
		color: '#8A8A8E',
	},
	emptyShareText: {
		color: '#8A8A8E',
		textAlign: 'center',
		marginVertical: 40,
		fontSize: 14,
	},
});
