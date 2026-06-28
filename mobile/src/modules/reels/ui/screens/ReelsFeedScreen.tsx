import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, ScrollView, TouchableOpacity, Text, ViewToken, Modal, TextInput, ActivityIndicator, Alert, Platform, Image, Dimensions, StatusBar } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import { useReelsFeed } from '../../hooks/useReelsFeed';
import { ReelPlayerItem } from '../components/ReelPlayerItem';
import { BottomNavBar } from '@/shared/components/BottomNavBar';
import { useAuth } from '@/modules/auth/state/auth.context';
import http from '../../../../core/network/http.client';

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

export default function ReelsFeedScreen() {
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
	const [layoutHeight, setLayoutHeight] = useState(Dimensions.get('window').height);
	const [layoutWidth, setLayoutWidth] = useState(Dimensions.get('window').width);
	const navigation = useNavigation<any>();
	const route = useRoute<any>();
	const flatListRef = useRef<FlatList>(null);
	const insets = useSafeAreaInsets();
	const { user } = useAuth();

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
			}
		}
	}, [route.params?.reelId, reels]);

	useEffect(() => {
		if (route.params?.refresh) {
			refresh();
			navigation.setParams({ refresh: undefined });
		}
	}, [route.params?.refresh, refresh, navigation]);

	useEffect(() => {
		if (hasMore && reels.length > 0 && activeIndex >= reels.length - 2) {
			loadMore();
		}
	}, [activeIndex, reels.length, hasMore, loadMore]);

	// Share Sheet States
	const [shareModalVisible, setShareModalVisible] = useState(false);
	const [sharingReel, setSharingReel] = useState<any | null>(null);
	const [shareSearchQuery, setShareSearchQuery] = useState('');
	const [channels, setChannels] = useState<any[]>([]);
	const [users, setUsers] = useState<any[]>([]);
	const [loadingShareData, setLoadingShareData] = useState(false);
	const [sendingToId, setSendingToId] = useState<string | null>(null);
	const [sentRecipients, setSentRecipients] = useState<Set<string>>(new Set());

	const openShareSheet = async (reel: any) => {
		setSharingReel(reel);
		setShareModalVisible(true);
		setShareSearchQuery('');
		setSentRecipients(new Set());
		
		setLoadingShareData(true);
		try {
			const [channelsRes, usersRes] = await Promise.all([
				http.get('/channels'),
				http.get('/users')
			]);
			
			const channelsList = channelsRes.data?.data || channelsRes.data || [];
			const usersList = usersRes.data?.data || usersRes.data || [];
			
			setChannels(channelsList);
			setUsers(usersList);
		} catch (err) {
			console.warn('Failed to load share targets:', err);
		} finally {
			setLoadingShareData(false);
		}
	};

	const sendReelToTarget = async (target: any, isChannel: boolean) => {
		if (!sharingReel) return;
		const targetId = target._id || target.id;
		setSendingToId(targetId);
		
		try {
			let destChannelId = targetId;
			
			if (!isChannel) {
				const dmRes = await http.post('/channels/direct', { userId: targetId });
				const dmChannel = dmRes.data?.data || dmRes.data;
				destChannelId = dmChannel._id || dmChannel.id;
			}
			
			await http.post(`/channels/${destChannelId}/messages`, {
				content: `Shared a reel: "${sharingReel.caption || ''}"`,
				type: 'reel',
				reelRef: {
					reelId: sharingReel.id || sharingReel._id,
					thumbnailUrl: sharingReel.thumbnailUrl || '',
					title: sharingReel.caption || 'Shared Reel'
				}
			});
			
			// Increment share counter in database and local UI state
			recordShare(sharingReel.id);
			
			setSentRecipients(prev => {
				const next = new Set(prev);
				next.add(targetId);
				return next;
			});
		} catch (err) {
			console.warn('Failed to share reel:', err);
			Alert.alert('Error', 'Failed to share reel to this recipient.');
		} finally {
			setSendingToId(null);
		}
	};

	const filteredTargets = useMemo(() => {
		const query = shareSearchQuery.toLowerCase().trim();
		
		const formattedChannels = channels.map(c => {
			const name = c.name || c.description || 'Group Chat';
			const avatarUrl = c.icon || c.avatarUrl || null;
			return {
				id: c._id || c.id,
				name,
				avatarUrl,
				isChannel: true,
				subtitle: c.type === 'direct' ? 'Direct Message' : 'Group Chat'
			};
		});
		
		const formattedUsers = users.map(u => ({
			id: u._id || u.id,
			name: u.fullName || u.name || 'User',
			avatarUrl: u.avatarUrl || u.avatar?.url || null,
			isChannel: false,
			subtitle: `@${(u.fullName || '').replace(/\s+/g, '').toLowerCase()}`
		}));
		
		const combined = [...formattedChannels, ...formattedUsers];
		
		if (!query) return combined;
		return combined.filter(item => 
			item.name.toLowerCase().includes(query) || 
			item.subtitle.toLowerCase().includes(query)
		);
	}, [channels, users, shareSearchQuery]);

	const handleScroll = (event: any) => {
		const yOffset = event.nativeEvent.contentOffset.y;
		const index = Math.round(yOffset / layoutHeight);
		if (index !== activeIndex && index >= 0 && index < reels.length) {
			setActiveIndex(index);
		}
	};

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
			
			<Animated.View style={[{ flex: 1 }, animatedFeedStyle]}>
				<FlatList
					key={category}
					ref={flatListRef}
					data={reels}
					keyExtractor={(item) => item.id}
					renderItem={({ item, index }) => (
						<ReelPlayerItem
							reel={item}
							isActive={index === activeIndex}
							onToggleLike={toggleLike}
							onRecordView={recordView}
							onRecordShare={recordShare}
							onIncrementCommentsCount={incrementCommentsCount}
							onOpenShareSheet={openShareSheet}
							containerHeight={layoutHeight}
							containerWidth={layoutWidth}
						/>
					)}
					pagingEnabled
					showsVerticalScrollIndicator={false}
					onScroll={handleScroll}
					onMomentumScrollEnd={handleScroll}
					scrollEventThrottle={16}
					onEndReached={loadMore}
					onEndReachedThreshold={0.5}
					refreshing={refreshing}
					onRefresh={refresh}
					decelerationRate="fast"
					onLayout={(event) => {
						const { height, width } = event.nativeEvent.layout;
						if (height > 0) setLayoutHeight(height);
						if (width > 0) setLayoutWidth(width);
					}}
					windowSize={5}
					initialNumToRender={10}
					maxToRenderPerBatch={10}
					removeClippedSubviews={false}
					getItemLayout={getItemLayout}
					initialScrollIndex={reels.length > 0 && activeIndex < reels.length ? activeIndex : undefined}
				/>

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
						<TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('ReelCamera')}>
							<Text style={styles.createButtonText}>Create a Reel</Text>
						</TouchableOpacity>
					</View>
				)}
			</Animated.View>

			{/* Top Category Filter Bar */}
			<View style={[styles.categoryContainer, { top: Math.max(insets.top, 12) + 12 }]}>
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
					<TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('ReelCamera')}>
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

			{/* Share bottom sheet Modal */}
			<Modal
				visible={shareModalVisible}
				animationType="slide"
				transparent
				onRequestClose={() => setShareModalVisible(false)}
			>
				<View style={styles.shareOverlay}>
					<TouchableOpacity
						style={{ flex: 1 }}
						activeOpacity={1}
						onPress={() => setShareModalVisible(false)}
					/>
					<View style={styles.shareContainer}>
						<View style={styles.shareHeader}>
							<Text style={styles.shareTitle}>Send Reel</Text>
							<TouchableOpacity onPress={() => setShareModalVisible(false)}>
								<Ionicons name="close" size={24} color="#FFF" />
							</TouchableOpacity>
						</View>
						
						<View style={styles.shareSearchContainer}>
							<Ionicons name="search" size={18} color="#8A8A8E" />
							<TextInput
								style={styles.shareSearchInput}
								placeholder="Search friends or groups..."
								placeholderTextColor="#8A8A8E"
								value={shareSearchQuery}
								onChangeText={setShareSearchQuery}
								autoCorrect={false}
							/>
						</View>

						{loadingShareData ? (
							<ActivityIndicator size="large" color="#6DAE3F" style={{ marginVertical: 40 }} />
						) : filteredTargets.length === 0 ? (
							<Text style={styles.emptyShareText}>No matches found</Text>
						) : (
							<FlatList
								data={filteredTargets}
								keyExtractor={(item) => item.id}
								renderItem={({ item }) => {
									const isSent = sentRecipients.has(item.id);
									const isSending = sendingToId === item.id;
									return (
										<View style={styles.shareItem}>
											<View style={styles.shareItemLeft}>
												<Image
													source={{ uri: item.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=8BC34A&color=fff` }}
													style={styles.shareAvatar}
												/>
												<View>
													<Text style={styles.shareItemName} numberOfLines={1}>{item.name}</Text>
													<Text style={styles.shareItemSubtitle}>{item.subtitle}</Text>
												</View>
											</View>
											<TouchableOpacity
												style={[styles.sendBtn, isSent && styles.sendBtnSent]}
												disabled={isSent || isSending}
												onPress={() => sendReelToTarget(item, item.isChannel)}
											>
												{isSending ? (
													<ActivityIndicator size="small" color="#FFF" />
												) : (
													<Text style={[styles.sendBtnText, isSent && styles.sendBtnTextSent]}>
														{isSent ? 'Sent ✓' : 'Send'}
													</Text>
												)}
											</TouchableOpacity>
										</View>
									);
								}}
								style={styles.shareList}
								showsVerticalScrollIndicator={false}
								contentContainerStyle={{ paddingBottom: 24 }}
							/>
						)}
					</View>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#000',
		position: 'relative',
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
		backgroundColor: '#1C1C1E',
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		maxHeight: '75%',
		paddingBottom: Platform.OS === 'ios' ? 34 : 24,
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.08)',
	},
	shareHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingVertical: 18,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(255,255,255,0.08)',
	},
	shareTitle: {
		color: '#FFF',
		fontSize: 18,
		fontWeight: '700',
	},
	shareSearchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#2C2C2E',
		margin: 16,
		paddingHorizontal: 12,
		borderRadius: 10,
		height: 40,
	},
	shareSearchInput: {
		flex: 1,
		color: '#FFF',
		fontSize: 14,
		marginLeft: 8,
		padding: 0,
	},
	shareList: {
		paddingHorizontal: 16,
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
