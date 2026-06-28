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
import { useTheme } from '@/shared/context/theme.context';
import http from '../../../../core/network/http.client';
import messagingHttp from '../../../../core/network/messaging-http.client';

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

interface ContactAvatarProps {
	item: any;
	selected: boolean;
	onToggle: (id: string) => void;
}

const ContactAvatar = React.memo(({ item, selected, onToggle }: ContactAvatarProps) => {
	const { theme: T } = useTheme();
	const avatarSize = 80;
	const badgeScale = useSharedValue(selected ? 1 : 0);

	useEffect(() => {
		badgeScale.value = withTiming(selected ? 1 : 0, { duration: 220 });
	}, [selected]);

	const animatedBadgeStyle = useAnimatedStyle(() => ({
		transform: [{ scale: badgeScale.value }],
		opacity: badgeScale.value,
	}));

	return (
		<TouchableOpacity
			style={{ flex: 1 / 3, padding: 12, alignItems: 'center' }}
			activeOpacity={0.8}
			onPress={() => onToggle(item.id)}
		>
			<View style={{ width: avatarSize, height: avatarSize }}>
				<Image
					source={{ uri: item.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=fff&color=8A8A8E` }}
					style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' }}
					resizeMode="cover"
				/>
				<Animated.View style={[styles.checkBadge, animatedBadgeStyle]} pointerEvents="none">
					<View style={styles.checkBadgeInner}>
						<Ionicons name="checkmark" size={14} color="#fff" />
					</View>
				</Animated.View>
			</View>
			<Text numberOfLines={1} style={[styles.contactName, { color: T.text }]}>{item.name}</Text>
		</TouchableOpacity>
	);
});

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
	const [userPage, setUserPage] = useState(0);
	const [hasMoreUsers, setHasMoreUsers] = useState(true);
	const [loadingShareData, setLoadingShareData] = useState(false);
	const [loadingUsersPage, setLoadingUsersPage] = useState(false);
	const [sendingToId, setSendingToId] = useState<string | null>(null);
	const [sentRecipients, setSentRecipients] = useState<Set<string>>(new Set());
	const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
	const [messageText, setMessageText] = useState<string>('');

	// Composer slide animation (starts hidden)
	const composerY = useSharedValue(200);

	useEffect(() => {
		composerY.value = withTiming(selectedRecipients.size > 0 ? 0 : 200, { duration: 240 });
	}, [selectedRecipients]);

	const composerAnimatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: composerY.value }],
	}));

	const openShareSheet = async (reel: any) => {
		setSharingReel(reel);
		setShareModalVisible(true);
		setShareSearchQuery('');
		setSentRecipients(new Set());
		setSelectedRecipients(new Set());
		setMessageText('');
		setUserPage(0);
		setHasMoreUsers(true);
        
		setLoadingShareData(true);
		try {
			const channelsPromise = messagingHttp.get('/channels').catch(() => http.get('/channels'));
			const usersPromise = http.get('/users', { params: { limit: 30, skip: 0 } });

			const results = await Promise.allSettled([channelsPromise, usersPromise]);

			const channelsRes = results[0].status === 'fulfilled' ? results[0].value : null;
			const usersRes = results[1].status === 'fulfilled' ? results[1].value : null;
			const channelsError = results[0].status === 'rejected' ? (results[0] as PromiseRejectedResult).reason : null;
			const usersError = results[1].status === 'rejected' ? (results[1] as PromiseRejectedResult).reason : null;

			if (channelsRes) {
				const channelsList = channelsRes.data?.data || channelsRes.data || [];
				setChannels(channelsList);
			} else {
				console.warn('Failed to load channels for share sheet:', channelsError);
			}

			if (usersRes) {
				const usersList = usersRes.data?.data || usersRes.data || [];
				setUsers(usersList);
				setHasMoreUsers((usersList || []).length === 30);
				setUserPage(1);
			} else {
				console.warn('Failed to load users for share sheet:', usersError);
			}
		} catch (err) {
			console.warn('Failed to load share targets:', err);
		} finally {
			setLoadingShareData(false);
		}
	};

	const loadMoreShareUsers = async () => {
		if (!hasMoreUsers || loadingUsersPage) return;
		setLoadingUsersPage(true);
		try {
			const res = await http.get('/users', { params: { limit: 30, skip: userPage * 30 } });
			const usersList = res.data?.data || res.data || [];
			if (usersList.length > 0) {
				setUsers((prev) => [...prev, ...usersList]);
				setUserPage((page) => page + 1);
			}
			if (usersList.length < 30) {
				setHasMoreUsers(false);
			}
		} catch (err) {
			console.warn('Failed to load more share users:', err);
			setHasMoreUsers(false);
		} finally {
			setLoadingUsersPage(false);
		}
	};

	const sendReelToTarget = async (target: any, isChannel: boolean, message?: string) => {
		if (!sharingReel) return;
		const targetId = target._id || target.id;
		setSendingToId(targetId);
		
		try {
			let destChannelId = targetId;
			
			if (!isChannel) {
				let dmRes;
				try {
					dmRes = await messagingHttp.post('/channels/dm', { targetUserId: targetId });
				} catch (e) {
					dmRes = await http.post('/channels/direct', { userId: targetId });
				}
				const dmChannel = dmRes.data?.data || dmRes.data;
				destChannelId = dmChannel._id || dmChannel.id;
			}
			const trimmedMessage = message && message.trim() ? message.trim() : '';
			const reelId = sharingReel.id || sharingReel._id;
			const thumbUrl = sharingReel.thumbnailUrl || sharingReel.thumbnail || (sharingReel.videoUrl ? sharingReel.videoUrl.replace(/\.[a-z0-9]+$/i, '.jpg') : '');

			try {
				await messagingHttp.post(`/channels/${destChannelId}/reels`, {
					reelId,
					caption: trimmedMessage || undefined,
				});
			} catch (e) {
				await http.post(`/channels/${destChannelId}/messages`, {
					content: trimmedMessage || undefined,
					text: trimmedMessage || undefined,
					type: 'reel',
					reelRef: {
						reelId,
						thumbnailUrl: thumbUrl,
						title: sharingReel.caption || 'Shared Reel',
					},
				});
			}

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

	// Batch send to all selected recipients using existing sendReelToTarget logic
	const sendToSelected = async () => {
		if (!sharingReel) return;
		const ids = Array.from(selectedRecipients);
		for (const id of ids) {
			const target = filteredTargets.find(t => t.id === id);
			if (!target) continue;
			// await each send to preserve order and reuse existing API handling
			// pass optional messageText if provided
			// eslint-disable-next-line no-await-in-loop
			await sendReelToTarget(target, !!target.isChannel, messageText || undefined);
		}
		// Clear selections after sending
		setSelectedRecipients(new Set());
		setMessageText('');
		setShareModalVisible(false);
	};

	// Small helper to toggle selection
	const toggleSelection = useCallback((id: string) => {
		setSelectedRecipients(prev => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	const renderContactAvatar = useCallback(({ item }: { item: any }) => (
		<ContactAvatar
			item={item}
			selected={selectedRecipients.has(item.id)}
			onToggle={toggleSelection}
		/>
	), [selectedRecipients, toggleSelection]);

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
					snapToInterval={layoutHeight}
					snapToAlignment="start"
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

			<Modal
				visible={shareModalVisible}
				transparent
				animationType="slide"
				onRequestClose={() => setShareModalVisible(false)}
			>
				<View style={styles.shareOverlay}>
					<View style={[styles.shareContainer, { backgroundColor: T.surface, borderColor: T.border }]}>
						<View style={[styles.shareHeader, { borderBottomColor: T.divider }]}>
							<Text style={[styles.shareTitle, { color: T.text }]}>Share Reel</Text>
							<TouchableOpacity onPress={() => setShareModalVisible(false)}>
								<Ionicons name="close" size={22} color={T.text} />
							</TouchableOpacity>
						</View>
							<View style={styles.searchRow}>
							<View style={[styles.shareSearchContainer, { backgroundColor: T.inputBg }]}>
								<Ionicons name="search" size={18} color={T.textMuted} />
								<TextInput
									style={[styles.shareSearchInput, { color: T.text }]}
									placeholder="Search"
									placeholderTextColor={T.textMuted}
									value={shareSearchQuery}
									onChangeText={setShareSearchQuery}
									returnKeyType="search"
								/>
							</View>
						</View>
						{loadingShareData ? (
							<ActivityIndicator size="large" color="#6DAE3F" style={{ marginTop: 24 }} />
						) : filteredTargets.length === 0 ? (
							<Text style={[styles.emptyShareText, { color: T.textMuted }]}>No recipients found</Text>
						) : (
							<FlatList
								data={filteredTargets}
								keyExtractor={(i) => i.id}
								renderItem={renderContactAvatar}
								numColumns={3}
								contentContainerStyle={styles.gridList}
						onEndReached={loadMoreShareUsers}
						onEndReachedThreshold={0.5}
						ListFooterComponent={loadingUsersPage ? <ActivityIndicator size="small" color="#6DAE3F" style={{ marginTop: 16 }} /> : null}
							/>
						)}
						<Animated.View style={[styles.composerContainer, composerAnimatedStyle, { backgroundColor: T.surface, shadowColor: T.shadow }]}>
							<TextInput
								style={[styles.composerInput, { backgroundColor: T.inputBg, color: T.text }]}
								placeholder="Add a message (optional)"
								placeholderTextColor={T.textMuted}
								value={messageText}
								onChangeText={setMessageText}
							/>
							<TouchableOpacity
								style={[styles.sendButton, selectedRecipients.size === 0 && styles.sendButtonDisabled]}
								disabled={selectedRecipients.size === 0}
								onPress={sendToSelected}
							>
								<Text style={styles.sendButtonText}>{sendingToId ? 'Sending...' : 'Send'}</Text>
							</TouchableOpacity>
						</Animated.View>
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
