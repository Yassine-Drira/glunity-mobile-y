import React, { useRef, useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	Dimensions,
	TouchableOpacity,
	TouchableWithoutFeedback,
	Modal,
	TextInput,
	FlatList,
	KeyboardAvoidingView,
	Platform,
	ActivityIndicator,
	Alert
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withSpring,
	withSequence,
	withTiming
} from 'react-native-reanimated';
import { Reel, ReelComment, ReelsService } from '../../services/reels.service';

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');

const DEFAULT_AVATAR_URL = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop';

interface ReelPlayerItemProps {
	reel: Reel;
	isActive: boolean;
	onToggleLike: (reelId: string) => void;
	onRecordView: (reelId: string) => void;
	onRecordShare: (reelId: string) => void;
	onIncrementCommentsCount: (reelId: string) => void;
	onOpenShareSheet?: (reel: Reel) => void;
	containerHeight: number;
	containerWidth: number;
}

export function ReelPlayerItem({
	reel,
	isActive,
	onToggleLike,
	onRecordView,
	onRecordShare,
	onIncrementCommentsCount,
	onOpenShareSheet,
	containerHeight,
	containerWidth
}: ReelPlayerItemProps) {
	const videoRef = useRef<Video>(null);
	const isFocused = useIsFocused();
	const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
	const [isMuted, setIsMuted] = useState(false);
	const [isPlaying, setIsPlaying] = useState(true);
	const hasRecordedView = useRef(false);
	
	// Comments state
	const [commentsVisible, setCommentsVisible] = useState(false);
	const [comments, setComments] = useState<ReelComment[]>([]);
	const [loadingComments, setLoadingComments] = useState(false);
	const [newCommentText, setNewCommentText] = useState('');
	const [postingComment, setPostingComment] = useState(false);
	
	// Double tap / Heart animation
	const lastTapRef = useRef<number | null>(null);
	const heartScale = useSharedValue(0);
	const heartOpacity = useSharedValue(0);

	const heartStyle = useAnimatedStyle(() => ({
		transform: [{ scale: heartScale.value }],
		opacity: heartOpacity.value,
	}));

	useEffect(() => {
		if (isActive && isFocused) {
			videoRef.current?.playAsync().catch(() => {});
			if (!hasRecordedView.current) {
				onRecordView(reel.id);
				hasRecordedView.current = true;
			}
		} else {
			videoRef.current?.stopAsync().catch(() => {});
		}
	}, [isActive, isFocused, onRecordView, reel.id]);

	// Handle single/double tap on the screen
	const handlePress = () => {
		const now = Date.now();
		const DOUBLE_PRESS_DELAY = 300;
		if (lastTapRef.current && now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
			handleDoubleTap();
		} else {
			lastTapRef.current = now;
			// Single tap: toggle play/pause
			setTimeout(() => {
				if (lastTapRef.current === now) {
					togglePlayPause();
				}
			}, DOUBLE_PRESS_DELAY);
		}
	};

	const togglePlayPause = async () => {
		if (!videoRef.current) return;
		if (isPlaying) {
			await videoRef.current.pauseAsync();
			setIsPlaying(false);
		} else {
			await videoRef.current.playAsync();
			setIsPlaying(true);
		}
	};

	const handleDoubleTap = () => {
		if (!reel.isLiked) {
			onToggleLike(reel.id);
			try {
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			} catch (err) {}
		}
		
		// Animate pop heart
		heartScale.value = 0;
		heartOpacity.value = 1;
		heartScale.value = withSequence(
			withSpring(1.2, { damping: 4, stiffness: 150 }),
			withTiming(0, { duration: 400 })
		);
		heartOpacity.value = withTiming(0, { duration: 700 });
	};

	const openComments = async () => {
		setCommentsVisible(true);
		setLoadingComments(true);
		try {
			const res = await ReelsService.getComments(reel.id);
			if (res.success) {
				setComments(res.data);
			}
		} catch (err) {
			console.warn('Failed to load comments:', err);
		} finally {
			setLoadingComments(false);
		}
	};

	const handlePostComment = async () => {
		if (!newCommentText.trim() || postingComment) return;
		setPostingComment(true);
		try {
			const res = await ReelsService.postComment(reel.id, newCommentText.trim());
			if (res.success) {
				setComments(prev => [res.data, ...prev]);
				setNewCommentText('');
				// Increment local comments count for UI responsiveness
				onIncrementCommentsCount(reel.id);
			}
		} catch (err) {
			console.warn('Failed to post comment:', err);
		} finally {
			setPostingComment(false);
		}
	};

	// Get navigation
	const navigation = useNavigation<any>();

	return (
		<View style={[styles.container, { width: containerWidth, height: containerHeight }]}>
			<TouchableWithoutFeedback onPress={handlePress}>
				<View style={StyleSheet.absoluteFill}>
					<Video
						ref={videoRef}
					source={{ uri: reel.videoUrl }}
						isLooping
						isMuted={isMuted}
						style={StyleSheet.absoluteFillObject}
						onPlaybackStatusUpdate={(statusObj) => setStatus(statusObj)}
					/>

					{(!(isActive && isFocused) || !status || !status.isLoaded) && (
						<Image
							source={{ uri: reel.thumbnailUrl }}
							style={StyleSheet.absoluteFillObject}
							contentFit="cover"
						/>
					)}

					{/* Top Gradient Overlay */}
					<LinearGradient
						colors={['rgba(0,0,0,0.6)', 'transparent']}
						style={styles.topGradient}
					/>

					{/* Bottom Gradient Overlay */}
					<LinearGradient
						colors={['transparent', 'rgba(0,0,0,0.8)']}
						style={styles.bottomGradient}
					/>

					{/* Double Tap Heart Indicator Overlay */}
					<View style={styles.heartOverlay}>
						<Animated.View style={heartStyle}>
							<Ionicons name="heart" size={100} color="#FF2D55" />
						</Animated.View>
					</View>

					{/* Play/Pause state HUD indicator */}
					{!isPlaying && (
						<View style={styles.hudOverlay}>
							<Ionicons name="play" size={50} color="rgba(255,255,255,0.7)" />
						</View>
					)}
				</View>
			</TouchableWithoutFeedback>

			{/* Bottom info section */}
			<View style={styles.bottomInfo}>
				<View style={styles.authorRow}>
					<Image
						source={{ uri: reel.author.avatarUrl || DEFAULT_AVATAR_URL }}
						style={styles.authorAvatar}
					/>
					<Text style={styles.authorName}>@{reel.author.fullName.replace(/\s+/g, '').toLowerCase()}</Text>
				</View>
				<Text style={styles.caption} numberOfLines={2}>{reel.caption}</Text>
				
				<View style={styles.metaRow}>
					<View style={styles.musicTag}>
						<Ionicons name="musical-notes" size={12} color="#FFF" style={styles.musicIcon} />
						<Text style={styles.musicText} numberOfLines={1}>Original Audio</Text>
					</View>
					<View style={styles.userTag}>
						<Ionicons name="people" size={12} color="#FFF" style={styles.userIcon} />
						<Text style={styles.userText}>{reel.viewsCount} users</Text>
					</View>
				</View>
			</View>

			{/* Right-side button overlay */}
			<View style={styles.rightOverlay}>
				{/* Avatar */}
				<View style={styles.avatarContainer}>
					<Image
						source={{ uri: reel.author.avatarUrl || DEFAULT_AVATAR_URL }}
						style={styles.avatar}
					/>
					<TouchableOpacity style={styles.followButton}>
						<Ionicons name="add-circle" size={18} color="#FF2D55" />
					</TouchableOpacity>
				</View>

				{/* Like Button */}
				<TouchableOpacity style={styles.actionButton} onPress={() => {
					onToggleLike(reel.id);
					try {
						Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
					} catch (err) {}
				}}>
					<Ionicons
						name={reel.isLiked ? "heart" : "heart-outline"}
						size={34}
						color={reel.isLiked ? "#FF2D55" : "#FFF"}
					/>
					<Text style={styles.actionText}>{reel.likesCount}</Text>
				</TouchableOpacity>

				{/* Comment Button */}
				<TouchableOpacity style={styles.actionButton} onPress={openComments}>
					<Ionicons name="chatbubble-outline" size={30} color="#FFF" />
					<Text style={styles.actionText}>{reel.commentsCount}</Text>
				</TouchableOpacity>

				{/* Share/Send Button */}
				<TouchableOpacity style={styles.actionButton} onPress={() => {
					if (onOpenShareSheet) {
						onOpenShareSheet(reel);
					} else {
						onRecordShare(reel.id);
						Alert.alert('Share', 'Link copied to clipboard!');
					}
				}}>
					<Ionicons name="paper-plane-outline" size={30} color="#FFF" />
					<Text style={styles.actionText}>{reel.sharesCount || 0}</Text>
				</TouchableOpacity>

				{/* Plus Camera button */}
				<TouchableOpacity style={styles.plusButtonCircle} onPress={() => navigation.navigate('ReelCamera')}>
					<Ionicons name="add" size={24} color="#FFF" />
				</TouchableOpacity>
			</View>

			{/* Comments Modal Bottom Sheet */}
			<Modal
				visible={commentsVisible}
				animationType="slide"
				transparent
				onRequestClose={() => setCommentsVisible(false)}
			>
				<View style={styles.commentsOverlay}>
					<TouchableOpacity
						style={styles.commentsCloseArea}
						onPress={() => setCommentsVisible(false)}
					/>
					<KeyboardAvoidingView
						behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
						style={styles.commentsContainer}
					>
						<View style={styles.commentsHeader}>
							<Text style={styles.commentsTitle}>Comments ({reel.commentsCount})</Text>
							<TouchableOpacity onPress={() => setCommentsVisible(false)}>
								<Ionicons name="close" size={24} color="#333" />
							</TouchableOpacity>
						</View>

						{loadingComments ? (
							<View style={styles.centerSpinner}>
								<ActivityIndicator size="large" color="#6DAE3F" />
							</View>
						) : (
							<FlatList
								data={comments}
								keyExtractor={(item) => item.id}
								renderItem={({ item }) => (
									<View style={styles.commentItem}>
										<Image
											source={{ uri: item.author.avatarUrl || DEFAULT_AVATAR_URL }}
											style={styles.commentAvatar}
										/>
										<View style={styles.commentTextContainer}>
											<Text style={styles.commentAuthor}>@{item.author.fullName.replace(/\s+/g, '').toLowerCase()}</Text>
											<Text style={styles.commentText}>{item.text}</Text>
										</View>
									</View>
								)}
								ListEmptyComponent={
									<Text style={styles.emptyComments}>No comments yet. Start the conversation!</Text>
								}
								contentContainerStyle={styles.commentList}
							/>
						)}

						{/* Comment input area */}
						<View style={styles.commentInputRow}>
							<TextInput
								value={newCommentText}
								onChangeText={setNewCommentText}
								placeholder="Add a comment..."
								placeholderTextColor="#999"
								style={styles.commentInput}
							/>
							<TouchableOpacity
								onPress={handlePostComment}
								disabled={!newCommentText.trim() || postingComment}
							>
								{postingComment ? (
									<ActivityIndicator size="small" color="#6DAE3F" />
								) : (
									<Ionicons name="send" size={24} color={newCommentText.trim() ? "#6DAE3F" : "#CCC"} />
								)}
							</TouchableOpacity>
						</View>
					</KeyboardAvoidingView>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#000',
	},
	topGradient: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		height: 120,
		zIndex: 1,
	},
	bottomGradient: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		height: 220,
		zIndex: 1,
	},
	heartOverlay: {
		...StyleSheet.absoluteFillObject,
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 10,
	},
	hudOverlay: {
		...StyleSheet.absoluteFillObject,
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 5,
		backgroundColor: 'rgba(0,0,0,0.1)',
	},
	rightOverlay: {
		position: 'absolute',
		right: 12,
		bottom: 100,
		alignItems: 'center',
		zIndex: 2,
	},
	avatarContainer: {
		position: 'relative',
		marginBottom: 20,
	},
	avatar: {
		width: 46,
		height: 46,
		borderRadius: 23,
		borderWidth: 2,
		borderColor: '#FFF',
	},
	followButton: {
		position: 'absolute',
		bottom: -6,
		right: -4,
		backgroundColor: '#FFF',
		borderRadius: 9,
		width: 18,
		height: 18,
		justifyContent: 'center',
		alignItems: 'center',
	},
	actionButton: {
		alignItems: 'center',
		marginBottom: 18,
	},
	actionText: {
		color: '#FFF',
		fontSize: 12,
		marginTop: 4,
		fontWeight: '600',
		textShadowColor: 'rgba(0, 0, 0, 0.75)',
		textShadowOffset: { width: -1, height: 1 },
		textShadowRadius: 10,
	},
	bottomInfo: {
		position: 'absolute',
		left: 16,
		right: 76,
		bottom: 90,
		zIndex: 2,
	},
	authorName: {
		color: '#FFF',
		fontSize: 16,
		fontWeight: '700',
		textShadowColor: 'rgba(0, 0, 0, 0.75)',
		textShadowOffset: { width: -1, height: 1 },
		textShadowRadius: 10,
		marginBottom: 6,
	},
	caption: {
		color: '#FFF',
		fontSize: 14,
		textShadowColor: 'rgba(0, 0, 0, 0.75)',
		textShadowOffset: { width: -1, height: 1 },
		textShadowRadius: 10,
		lineHeight: 18,
		marginBottom: 10,
	},
	musicTag: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'rgba(0,0,0,0.4)',
		alignSelf: 'flex-start',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
	},
	musicIcon: {
		marginRight: 6,
	},
	musicText: {
		color: '#FFF',
		fontSize: 12,
	},
	commentsOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.5)',
		justifyContent: 'flex-end',
	},
	commentsCloseArea: {
		flex: 1,
	},
	commentsContainer: {
		backgroundColor: '#FFF',
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
		maxHeight: '65%',
		paddingBottom: Platform.OS === 'ios' ? 24 : 12,
	},
	commentsHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderBottomColor: '#EBEBEB',
	},
	commentsTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1C1C1E',
	},
	centerSpinner: {
		height: 250,
		justifyContent: 'center',
		alignItems: 'center',
	},
	commentList: {
		paddingHorizontal: 16,
		paddingTop: 12,
	},
	commentItem: {
		flexDirection: 'row',
		marginBottom: 16,
	},
	commentAvatar: {
		width: 36,
		height: 36,
		borderRadius: 18,
		marginRight: 10,
	},
	commentTextContainer: {
		flex: 1,
	},
	commentAuthor: {
		fontSize: 13,
		fontWeight: '600',
		color: '#555',
		marginBottom: 2,
	},
	commentText: {
		fontSize: 14,
		color: '#1C1C1E',
		lineHeight: 18,
	},
	emptyComments: {
		textAlign: 'center',
		color: '#8A8A8E',
		marginTop: 40,
		fontSize: 14,
	},
	commentInputRow: {
		flexDirection: 'row',
		alignItems: 'center',
		borderTopWidth: 1,
		borderTopColor: '#EBEBEB',
		paddingHorizontal: 16,
		paddingTop: 10,
		backgroundColor: '#FFF',
	},
	commentInput: {
		flex: 1,
		height: 40,
		backgroundColor: '#F2F2F7',
		borderRadius: 20,
		paddingHorizontal: 16,
		marginRight: 12,
		color: '#1C1C1E',
	},
	authorRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	authorAvatar: {
		width: 32,
		height: 32,
		borderRadius: 16,
		marginRight: 8,
		borderWidth: 1.5,
		borderColor: '#FFF',
	},
	metaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 6,
	},
	userTag: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'rgba(0,0,0,0.5)',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		marginLeft: 8,
	},
	userIcon: {
		marginRight: 4,
	},
	userText: {
		color: '#FFF',
		fontSize: 12,
		fontWeight: '600',
	},
	plusButtonCircle: {
		width: 44,
		height: 44,
		borderRadius: 22,
		borderWidth: 1.5,
		borderColor: '#FFF',
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 12,
		backgroundColor: 'rgba(0,0,0,0.4)',
	},
});
