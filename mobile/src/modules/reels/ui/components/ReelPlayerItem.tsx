import React, { useRef, useState, useEffect, memo, useCallback } from 'react';
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
	Alert,
	Keyboard,
	Clipboard,
	AppState
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Gesture, GestureDetector, ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
	withTiming,
	withDelay,
	runOnJS
} from 'react-native-reanimated';
import { Reel, ReelComment, ReelsService } from '../../services/reels.service';
import { useReelComments } from '../../hooks/useReelComments';
import { useAuth } from '../../../auth/state/auth.context';
import { useTheme } from '@/shared/context/theme.context';

function formatRelativeTime(dateString: string): string {
	const now = new Date();
	const date = new Date(dateString);
	const diffMs = now.getTime() - date.getTime();
	if (isNaN(diffMs) || diffMs < 0) return '1s';
	
	const diffSec = Math.floor(diffMs / 1000);
	const diffMin = Math.floor(diffSec / 60);
	const diffHour = Math.floor(diffMin / 60);
	const diffDay = Math.floor(diffHour / 24);

	if (diffSec < 60) return `${diffSec || 1}s`;
	if (diffMin < 60) return `${diffMin}m`;
	if (diffHour < 24) return `${diffHour}h`;
	return `${diffDay}d`;
}

// Screen aspect ratio used to classify video orientation at runtime.
// Videos wider than the screen ratio are "landscape" and get the blurred
// background treatment; everything else uses ResizeMode.COVER.
const SCREEN_RATIO = Dimensions.get('window').width / Dimensions.get('window').height;

const DEFAULT_AVATAR_URL = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop';

const COOLDOWN_KEY = 'reel_view_cooldowns';
const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
const OFFLINE_QUEUE_KEY = 'offline_reel_analytics';

const viewCooldownCache: Record<string, number> = {};

const queueOfflineAnalytics = async (reelId: string, payload: any) => {
	try {
		const existing = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
		const queue = existing ? JSON.parse(existing) : [];
		queue.push({ reelId, payload, timestamp: Date.now() });
		await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
	} catch (e) {}
};

const syncOfflineAnalytics = async () => {
	try {
		const existing = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
		if (!existing) return;
		const queue = JSON.parse(existing);
		if (queue.length === 0) return;

		const remaining = [];
		for (const item of queue) {
			try {
				const response = await ReelsService.recordAnalytics(item.reelId, item.payload);
				if (!response.success) {
					remaining.push(item);
				}
			} catch (err: any) {
				const status = err?.response?.status;
				if (status !== 404 && status !== 400) {
					remaining.push(item);
				}
			}
		}

		if (remaining.length > 0) {
			await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
		} else {
			await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
		}
	} catch (e) {}
};

const sendAnalytics = async (reelId: string, payload: any) => {
	try {
		const response = await ReelsService.recordAnalytics(reelId, payload);
		if (!response.success) {
			await queueOfflineAnalytics(reelId, payload);
		}
	} catch (error) {
		await queueOfflineAnalytics(reelId, payload);
	}
};

interface ReplyItemProps {
	reply: ReelComment;
	user: any;
	T: any;
	replyIsOwner: boolean;
	replyIsLikedByMe: boolean;
	replyRelativeTime: string;
	highlightedReplyId: string | null;
	replyHighlightStyle: any;
	onCommentPress: (comment: ReelComment) => void;
	onStartEdit: (comment: ReelComment) => void;
	onDeleteComment: (commentId: string) => void;
	onToggleCommentLike: (commentId: string) => void;
	parentComment: ReelComment;
	onReplyPress: (comment: ReelComment) => void;
}

const ReplyItem = memo(({
	reply,
	user,
	T,
	replyIsOwner,
	replyIsLikedByMe,
	replyRelativeTime,
	highlightedReplyId,
	replyHighlightStyle,
	onCommentPress,
	onStartEdit,
	onDeleteComment,
	onToggleCommentLike,
	parentComment,
	onReplyPress,
}: ReplyItemProps) => {
	return (
		<Animated.View
			style={[
				highlightedReplyId === reply.id && styles.highlightedItemBase,
				highlightedReplyId === reply.id ? replyHighlightStyle : null,
			]}
		>
			<TouchableOpacity
				activeOpacity={0.9}
				onPress={() => onCommentPress(reply)}
				style={styles.replyItem}
			>
				<Image
					source={{ uri: reply.authorAvatar || reply.author.avatarUrl || DEFAULT_AVATAR_URL }}
					style={styles.replyAvatar}
				/>
				<View style={styles.commentTextContainer}>
					<View style={styles.commentAuthorHeader}>
						<Text style={[styles.commentAuthor, { color: T.text }]}>
							{reply.authorUsername}
						</Text>
						<Text style={[styles.commentTime, { color: T.textMuted }]}>
							{replyRelativeTime}{reply.edited ? ' • Edited' : ''}
						</Text>
					</View>
					<Text style={[styles.commentText, { color: T.text }]}>{reply.text}</Text>
					
					<View style={styles.commentActionsRow}>
						{!replyIsOwner && (
							<TouchableOpacity style={styles.commentActionButton} onPress={() => onReplyPress(parentComment)}>
								<Text style={[styles.commentActionText, { color: T.textMuted }]}>Reply</Text>
							</TouchableOpacity>
						)}
						{replyIsOwner && (
							<>
								<TouchableOpacity style={styles.commentActionButton} onPress={() => onStartEdit(reply)}>
									<Text style={[styles.commentActionText, { color: T.textMuted }]}>Edit</Text>
								</TouchableOpacity>
								<TouchableOpacity style={styles.commentActionButton} onPress={() => onDeleteComment(reply.id)}>
									<Text style={[styles.commentActionText, { color: T.textMuted }]}>Delete</Text>
								</TouchableOpacity>
							</>
						)}
					</View>
				</View>

				{/* Reply Like */}
				<View style={styles.likeIconContainer}>
					<TouchableOpacity onPress={() => onToggleCommentLike(reply.id)}>
						<Ionicons
							name={replyIsLikedByMe ? "heart" : "heart-outline"}
							size={14}
							color={replyIsLikedByMe ? "#FF2D55" : T.textMuted}
						/>
					</TouchableOpacity>
					{reply.likeCount > 0 && (
						<Text style={[styles.replyLikeCount, { color: T.textMuted }]}>
							{reply.likeCount.toLocaleString()}
						</Text>
					)}
				</View>
			</TouchableOpacity>
		</Animated.View>
	);
});

interface CommentItemProps {
	item: ReelComment;
	user: any;
	T: any;
	isDark: boolean;
	relativeTime: string;
	isLikedByMe: boolean;
	isExpanded: boolean;
	commentReplies: ReelComment[];
	loadingRepliesForComment: boolean;
	highlightedCommentId: string | null;
	highlightedReplyId: string | null;
	commentHighlightStyle: any;
	replyHighlightStyle: any;
	onCommentPress: (comment: ReelComment) => void;
	onToggleReplies: (commentId: string) => void;
	onStartEdit: (comment: ReelComment) => void;
	onDeleteComment: (commentId: string) => void;
	onToggleCommentLike: (commentId: string) => void;
	onReplyPress: (comment: ReelComment) => void;
}

const CommentItem = memo(({
	item,
	user,
	T,
	isDark,
	relativeTime,
	isLikedByMe,
	isExpanded,
	commentReplies,
	loadingRepliesForComment,
	highlightedCommentId,
	highlightedReplyId,
	commentHighlightStyle,
	replyHighlightStyle,
	onCommentPress,
	onToggleReplies,
	onStartEdit,
	onDeleteComment,
	onToggleCommentLike,
	onReplyPress,
}: CommentItemProps) => {
	const isOwner = item.authorId === user?._id;

	return (
		<View style={styles.commentRowContainer}>
			{/* Parent Comment */}
			<Animated.View
				style={[
					highlightedCommentId === item.id && styles.highlightedItemBase,
					highlightedCommentId === item.id ? commentHighlightStyle : null,
				]}
			>
				<TouchableOpacity
					activeOpacity={0.9}
					onPress={() => onCommentPress(item)}
					style={styles.commentItem}
				>
					<Image
						source={{ uri: item.authorAvatar || item.author.avatarUrl || DEFAULT_AVATAR_URL }}
						style={styles.commentAvatar}
					/>
					<View style={styles.commentTextContainer}>
						<View style={styles.commentAuthorHeader}>
							<Text style={[styles.commentAuthor, { color: T.text }]}>
								{item.authorUsername}
							</Text>
							<Text style={[styles.commentTime, { color: T.textMuted }]}>
								{relativeTime}{item.edited ? ' • Edited' : ''}
							</Text>
						</View>
						<Text style={[styles.commentText, { color: T.text }]}>{item.text}</Text>
						
						<View style={styles.commentActionsRow}>
							{!isOwner && (
								<TouchableOpacity style={styles.commentActionButton} onPress={() => onReplyPress(item)}>
									<Text style={[styles.commentActionText, { color: T.textMuted }]}>Reply</Text>
								</TouchableOpacity>
							)}
							{isOwner && (
								<>
									<TouchableOpacity style={styles.commentActionButton} onPress={() => onStartEdit(item)}>
										<Text style={[styles.commentActionText, { color: T.textMuted }]}>Edit</Text>
									</TouchableOpacity>
									<TouchableOpacity style={styles.commentActionButton} onPress={() => onDeleteComment(item.id)}>
										<Text style={[styles.commentActionText, { color: T.textMuted }]}>Delete</Text>
									</TouchableOpacity>
								</>
							)}
						</View>
					</View>

					{/* Heart Like icon & count */}
					<View style={styles.likeIconContainer}>
						<TouchableOpacity onPress={() => onToggleCommentLike(item.id)}>
							<Ionicons
								name={isLikedByMe ? "heart" : "heart-outline"}
								size={16}
								color={isLikedByMe ? "#FF2D55" : T.textMuted}
							/>
						</TouchableOpacity>
						{item.likeCount > 0 && (
							<Text style={[styles.commentLikeCount, { color: T.textMuted }]}>
								{item.likeCount.toLocaleString()}
							</Text>
						)}
					</View>
				</TouchableOpacity>
			</Animated.View>

			{/* Collapsible Nested Replies */}
			{(item.replyCount > 0 || commentReplies.length > 0) && (
				<View style={styles.repliesWrapper}>
					<TouchableOpacity
						style={styles.viewRepliesButton}
						onPress={() => onToggleReplies(item.id)}
					>
						<View style={[styles.viewRepliesLine, { backgroundColor: T.textMuted }]} />
						<Text style={[styles.viewRepliesText, { color: T.textMuted }]}>
							{isExpanded ? 'Hide replies' : `View ${item.replyCount} more repl${item.replyCount > 1 ? 'ies' : 'y'}`}
						</Text>
					</TouchableOpacity>

					{isExpanded && (
						<View style={styles.repliesList}>
							{loadingRepliesForComment && commentReplies.length === 0 ? (
								<ActivityIndicator size="small" color={T.green} style={{ marginVertical: 8, alignSelf: 'flex-start' }} />
							) : (
								commentReplies.map((reply) => {
									const replyIsOwner = reply.authorId === user?._id;
									const replyIsLikedByMe = user?._id ? reply.likedBy.includes(user._id) : false;
									const replyRelativeTime = formatRelativeTime(reply.createdAt);

									return (
										<ReplyItem
											key={reply.id}
											reply={reply}
											user={user}
											T={T}
											replyIsOwner={replyIsOwner}
											replyIsLikedByMe={replyIsLikedByMe}
											replyRelativeTime={replyRelativeTime}
											highlightedReplyId={highlightedReplyId}
											replyHighlightStyle={replyHighlightStyle}
											onCommentPress={onCommentPress}
											onStartEdit={onStartEdit}
											onDeleteComment={onDeleteComment}
											onToggleCommentLike={onToggleCommentLike}
											parentComment={item}
											onReplyPress={onReplyPress}
										/>
									);
								})
							)}
						</View>
					)}
				</View>
			)}
		</View>
	);
});

export interface ReelPlayerItemProps {
	reel: Reel;
	isActive: boolean;
	/** True for the item immediately before or after the active one.
	 *  The Video component stays mounted and buffers in the background
	 *  so the user sees no black gap when they swipe to it. */
	isPreloading?: boolean;
	onToggleLike: (reelId: string) => void;
	onRecordView: (reelId: string) => void;
	onRecordShare: (reelId: string) => void;
	onIncrementCommentsCount: (reelId: string) => void;
	onOpenShareSheet?: (reel: Reel) => void;
	/** Called whenever the comments sheet opens or closes so the parent
	 *  feed FlatList can disable its own scroll and avoid gesture conflicts. */
	onCommentsVisibilityChange?: (visible: boolean) => void;
	containerHeight: number;
	containerWidth: number;
	initialCommentId?: string;
	initialReplyId?: string;
}

/**
 * Custom comparator for React.memo — only re-render when props that
 * affect the visual output actually change.
 */
function arePropsEqual(prev: ReelPlayerItemProps, next: ReelPlayerItemProps): boolean {
	return (
		prev.reel.id === next.reel.id &&
		prev.reel.isLiked === next.reel.isLiked &&
		prev.reel.likesCount === next.reel.likesCount &&
		prev.reel.commentsCount === next.reel.commentsCount &&
		prev.reel.sharesCount === next.reel.sharesCount &&
		prev.reel.viewsCount === next.reel.viewsCount &&
		prev.isActive === next.isActive &&
		prev.isPreloading === next.isPreloading &&
		prev.containerHeight === next.containerHeight &&
		prev.containerWidth === next.containerWidth &&
		prev.initialCommentId === next.initialCommentId &&
		prev.initialReplyId === next.initialReplyId
	);
}

function ReelPlayerItemComponent({
	reel,
	isActive,
	isPreloading = false,
	onToggleLike,
	onRecordView,
	onRecordShare,
	onIncrementCommentsCount,
	onOpenShareSheet,
	onCommentsVisibilityChange,
	containerHeight,
	containerWidth,
	initialCommentId,
	initialReplyId,
}: ReelPlayerItemProps) {
	const videoRef = useRef<Video>(null);
	const isFocused = useIsFocused();
	const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
	const [isMuted, setIsMuted] = useState(false);
	// userPaused: true when the user manually tapped to pause THIS reel.
	// Resets automatically when the reel becomes active (swipe).
	const [userPaused, setUserPaused] = useState(false);
	const lastUpdateRef = useRef<number | null>(null);
	const continuousWatchRef = useRef<number>(0);
	const qualifiedViewSentRef = useRef<boolean>(false);
	const playRecordedRef = useRef<boolean>(false);
	const impressionRecordedRef = useRef<boolean>(false);
	const totalWatchTimeRef = useRef<number>(0);
	const completionsRef = useRef<number>(0);
	const insets = useSafeAreaInsets();

	// Calculate dynamic offsets so layout elements float perfectly above the bottom navigation bar and gesture area.
	const navBarHeight = 60 + Math.max(insets.bottom, 12);
	const bottomInfoBottom = navBarHeight + 12;
	const rightOverlayBottom = navBarHeight + 24;

	// ── Aspect ratio & ResizeMode detection ─────────────────────────────
	// We default to COVER since 95%+ of reels are portrait. If the video
	// is landscape or square, we dynamically switch to CONTAIN when its
	// natural size is loaded to avoid cropping the content.
	const [videoResizeMode, setVideoResizeMode] = useState<ResizeMode>(ResizeMode.COVER);

	// ── First-frame readiness ─────────────────────────────────────────
	// isVideoReady becomes true only when onReadyForDisplay fires, which
	// means the decoder has produced the first pixel — the video is truly
	// visible. We keep a permanent thumbnail overlay with animated opacity
	// underneath the video so there's ALWAYS a visual fallback.
	const [isVideoReady, setIsVideoReady] = useState(false);

	// ── Thumbnail crossfade animation ────────────────────────────────
	// The thumbnail opacity transitions smoothly from 1→0 when the
	// video's first frame is ready, creating a crossfade instead of a
	// hard cut. The thumbnail NEVER unmounts — only becomes transparent.
	const thumbnailOpacity = useSharedValue(1);

	const thumbnailAnimatedStyle = useAnimatedStyle(() => ({
		opacity: thumbnailOpacity.value,
	}));

	// Reset readiness whenever a different video is mounted in this slot.
	useEffect(() => {
		setIsVideoReady(false);
		setVideoResizeMode(ResizeMode.COVER); // default to COVER
		thumbnailOpacity.value = 1;
	}, [reel.id]);

	// When the item becomes active again and the video is already
	// loaded (e.g. scrolling back up to a previously viewed reel),
	// immediately mark it as ready so the thumbnail fades out.
	// Without this, audio plays but the thumbnail stays visible
	// because onReadyForDisplay doesn't re-fire for already-decoded video.
	useEffect(() => {
		if (isActive && status && (status as any).isLoaded) {
			setIsVideoReady(true);
		}
	}, [isActive, status]);

	// Drive crossfade: when video is ready, fade the thumbnail out.
	// When not ready, ensure thumbnail is fully opaque.
	useEffect(() => {
		thumbnailOpacity.value = withTiming(isVideoReady ? 0 : 1, { duration: 200 });
	}, [isVideoReady]);

	// onReadyForDisplay fires when the first frame is decoded.
	const handleReadyForDisplay = useCallback((event: any) => {
		setIsVideoReady(true);
		const ns = event?.naturalSize;
		if (ns && ns.width > 0 && ns.height > 0) {
			const aspectRatio = ns.width / ns.height;
			// Portrait (aspectRatio < 0.85) -> COVER (fill container naturally)
			// Landscape/Square (aspectRatio >= 0.85) -> CONTAIN (avoid cropping)
			const mode = aspectRatio < 0.85 ? ResizeMode.COVER : ResizeMode.CONTAIN;
			setVideoResizeMode(mode);
		}
	}, []);

	// Handle thumbnail loaded dimensions to set resizeMode before video play
	const handleThumbnailLoad = useCallback((event: any) => {
		const source = event?.source;
		if (source && source.width > 0 && source.height > 0) {
			const aspectRatio = source.width / source.height;
			const mode = aspectRatio < 0.85 ? ResizeMode.COVER : ResizeMode.CONTAIN;
			setVideoResizeMode(mode);
		}
	}, []);

	const handlePlaybackStatusUpdate = useCallback((s: AVPlaybackStatus) => {
		setStatus(s);
		
		if (!s.isLoaded) {
			lastUpdateRef.current = null;
			return;
		}

		const now = Date.now();
		const isBuffering = s.isBuffering;
		const isPlaying = s.isPlaying;
		const isFinished = s.didJustFinish;

		// 1. Playback loop completion count
		if (isFinished) {
			completionsRef.current += 1;
		}

		// 2. Play recording (occurs when the video first starts playing)
		if (isPlaying && !playRecordedRef.current && isActive && isFocused) {
			playRecordedRef.current = true;
		}

		// Check if watch time conditions are met
		const watchConditionsMet = 
			isActive &&
			isFocused &&
			isPlaying &&
			!isBuffering &&
			!userPaused;

		if (watchConditionsMet) {
			if (lastUpdateRef.current !== null) {
				const deltaSec = (now - lastUpdateRef.current) / 1000;
				// Avoid double count or crazy jumps (e.g. if tab is suspended)
				if (deltaSec > 0 && deltaSec < 3) {
					continuousWatchRef.current += deltaSec;
					totalWatchTimeRef.current += deltaSec;
				}
			}
			lastUpdateRef.current = now;

			// Check 3 seconds continuous watch gate
			if (continuousWatchRef.current >= 3.0 && !qualifiedViewSentRef.current) {
				const lastViewTime = viewCooldownCache[reel.id] || 0;
				if (Date.now() - lastViewTime >= COOLDOWN_MS) {
					qualifiedViewSentRef.current = true;
				}
			}
		} else {
			// Reset continuous watch timer if conditions are not met
			continuousWatchRef.current = 0;
			lastUpdateRef.current = null;
		}
	}, [isActive, isFocused, userPaused, reel.id]);
	
	// Comments state
	const [commentsVisible, setCommentsVisible] = useState(false);
	const sheetTranslateY = useSharedValue(containerHeight);
	const backdropOpacity = useSharedValue(0);
	const [keyboardHeight, setKeyboardHeight] = useState(0);

	// Notify parent when comments open/close so the feed FlatList
	// can disable its own scroll and avoid gesture conflicts.
	useEffect(() => {
		onCommentsVisibilityChange?.(commentsVisible);
	}, [commentsVisible, onCommentsVisibilityChange]);

	useEffect(() => {
		const showSub = Keyboard.addListener(
			Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
			(e) => {
				setKeyboardHeight(e.endCoordinates.height);
			}
		);
		const hideSub = Keyboard.addListener(
			Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
			() => {
				setKeyboardHeight(0);
			}
		);
		return () => {
			showSub.remove();
			hideSub.remove();
		};
	}, []);

	// ── Sheet animation spring config (TikTok-quality 60fps) ─────────────
	const SHEET_SPRING = { damping: 28, stiffness: 300, mass: 0.8, overshootClamping: false, restDisplacementThreshold: 0.5, restSpeedThreshold: 0.5 };
	// Sheet is 75% of screen height, anchored at bottom.
	// translateY = 0 means fully open (visible), translateY = sheetHeight means fully closed (off-screen below).
	const SHEET_HEIGHT = containerHeight * 0.75;
	const SHEET_OPEN_Y = 0;
	const SHEET_CLOSED_Y = SHEET_HEIGHT;

	const sheetAnimatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: sheetTranslateY.value }],
	}));

	const backdropAnimatedStyle = useAnimatedStyle(() => ({
		opacity: backdropOpacity.value,
	}));

	const openComments = useCallback(() => {
		setCommentsVisible(true);
	}, []);

	const closeComments = useCallback(() => {
		Keyboard.dismiss();
		sheetTranslateY.value = withSpring(SHEET_CLOSED_Y, SHEET_SPRING, (finished) => {
			if (finished) {
				runOnJS(setCommentsVisible)(false);
			}
		});
		backdropOpacity.value = withTiming(0, { duration: 250 });
	}, [containerHeight]);

	// Open animation trigger — starts off-screen, springs up to 0
	useEffect(() => {
		if (commentsVisible) {
			sheetTranslateY.value = SHEET_CLOSED_Y;
			sheetTranslateY.value = withSpring(SHEET_OPEN_Y, SHEET_SPRING);
			backdropOpacity.value = withTiming(1, { duration: 300 });
		}
	}, [commentsVisible, containerHeight]);

	const dragStartY = useSharedValue(0);
	const panGesture = Gesture.Pan()
		.onStart(() => {
			dragStartY.value = sheetTranslateY.value;
		})
		.onUpdate((event) => {
			// Allow dragging down freely but resist dragging above fully-open
			const targetY = dragStartY.value + event.translationY;
			const clamped = Math.max(-20, Math.min(SHEET_CLOSED_Y, targetY));
			sheetTranslateY.value = clamped;
			// Fade backdrop proportionally while dragging
			const progress = 1 - (clamped / SHEET_CLOSED_Y);
			backdropOpacity.value = Math.max(0, Math.min(1, progress));
		})
		.onEnd((event) => {
			const y = sheetTranslateY.value;
			const midpoint = SHEET_CLOSED_Y / 2;

			// Velocity-based dismiss: fast swipe down → close
			if (event.velocityY > 800) {
				sheetTranslateY.value = withSpring(SHEET_CLOSED_Y, SHEET_SPRING, (finished) => {
					if (finished) runOnJS(setCommentsVisible)(false);
				});
				backdropOpacity.value = withTiming(0, { duration: 200 });
				return;
			}

			// Position-based snap: past midpoint → close, else → open
			const snapTo = y > midpoint ? SHEET_CLOSED_Y : SHEET_OPEN_Y;
			sheetTranslateY.value = withSpring(snapTo, SHEET_SPRING, (finished) => {
				if (finished && snapTo === SHEET_CLOSED_Y) {
					runOnJS(setCommentsVisible)(false);
				}
			});
			backdropOpacity.value = withTiming(snapTo === SHEET_CLOSED_Y ? 0 : 1, { duration: 200 });
		});

	const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
	const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
	const [highlightedReplyId, setHighlightedReplyId] = useState<string | null>(null);
	const [actionSheetVisible, setActionSheetVisible] = useState(false);
	const [selectedCommentForActions, setSelectedCommentForActions] = useState<ReelComment | null>(null);
	const [text, setText] = useState('');
	const inputRef = useRef<TextInput>(null);
  const activeDeepLinkKeyRef = useRef<string | null>(null);
  const clearCommentHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearReplyHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const { user } = useAuth();
	const { theme: T, isDark } = useTheme();
	const isOwner = user?._id ? String(reel.author.id) === String(user._id) : false;

	const {
		comments,
		loading: loadingComments,
		loadingMore,
		hasMore,
		replies,
		loadingReplies,
		repliesHasMore,
		replyingTo,
		editingComment,
		toastMessage,
		setReplyingTo,
		setEditingComment,
		loadComments,
		loadReplies,
		postComment,
		updateComment,
		deleteComment,
		toggleCommentLike,
		showToast,
	} = useReelComments(reel.id);

	const commentHighlightOpacity = useSharedValue(0);
	const replyHighlightOpacity = useSharedValue(0);

	const commentHighlightStyle = useAnimatedStyle(() => ({
		backgroundColor: `rgba(109,174,63,${0.22 * commentHighlightOpacity.value})`,
	}));

	const replyHighlightStyle = useAnimatedStyle(() => ({
		backgroundColor: `rgba(109,174,63,${0.22 * replyHighlightOpacity.value})`,
	}));

	useEffect(() => {
		if (commentsVisible) {
			loadComments(true);
		}
	}, [commentsVisible]);

	useEffect(() => {
		return () => {
			if (clearCommentHighlightTimerRef.current) {
				clearTimeout(clearCommentHighlightTimerRef.current);
			}
			if (clearReplyHighlightTimerRef.current) {
				clearTimeout(clearReplyHighlightTimerRef.current);
			}
		};
	}, []);

	const triggerCommentHighlight = useCallback((commentId: string) => {
		if (!commentId) return;
		setHighlightedCommentId(commentId);
		commentHighlightOpacity.value = 1;
		commentHighlightOpacity.value = withDelay(4000, withTiming(0, { duration: 700 }));
		if (clearCommentHighlightTimerRef.current) clearTimeout(clearCommentHighlightTimerRef.current);
		clearCommentHighlightTimerRef.current = setTimeout(() => {
			setHighlightedCommentId((prev) => (prev === commentId ? null : prev));
		}, 4700);
	}, [commentHighlightOpacity]);

	const triggerReplyHighlight = useCallback((replyId: string) => {
		if (!replyId) return;
		setHighlightedReplyId(replyId);
		replyHighlightOpacity.value = 1;
		replyHighlightOpacity.value = withDelay(4000, withTiming(0, { duration: 700 }));
		if (clearReplyHighlightTimerRef.current) clearTimeout(clearReplyHighlightTimerRef.current);
		clearReplyHighlightTimerRef.current = setTimeout(() => {
			setHighlightedReplyId((prev) => (prev === replyId ? null : prev));
		}, 4700);
	}, [replyHighlightOpacity]);

	useEffect(() => {
		const targetKey = `${initialCommentId || ''}:${initialReplyId || ''}`;
		if (!isActive || targetKey === ':' || activeDeepLinkKeyRef.current === targetKey) {
			return;
		}
		if (!commentsVisible) {
			setCommentsVisible(true);
		}
	}, [isActive, commentsVisible, initialCommentId, initialReplyId]);

	useEffect(() => {
		const targetKey = `${initialCommentId || ''}:${initialReplyId || ''}`;
		if (!isActive || !commentsVisible || targetKey === ':' || activeDeepLinkKeyRef.current === targetKey) {
			return;
		}

		let cancelled = false;

		const runDeepLinkFocus = async () => {
			if (initialReplyId) {
				const parentId =
					initialCommentId ||
					Object.keys(replies).find((parent) => (replies[parent] || []).some((r) => r.id === initialReplyId));

				if (!parentId) return;

				const hasLoadedReply = (replies[parentId] || []).some((r) => r.id === initialReplyId);
				if (!expandedComments[parentId]) {
					setExpandedComments((prev) => ({ ...prev, [parentId]: true }));
				}
				if (!hasLoadedReply) {
					await loadReplies(parentId, true);
				}

				if (!cancelled) {
					triggerReplyHighlight(initialReplyId);
					activeDeepLinkKeyRef.current = targetKey;
				}
				return;
			}

			if (initialCommentId) {
				const exists = comments.some((c) => c.id === initialCommentId);
				if (!exists) {
					return;
				}

				if (!cancelled) {
					triggerCommentHighlight(initialCommentId);
					activeDeepLinkKeyRef.current = targetKey;
				}
			}
		};

		runDeepLinkFocus().catch(() => {});

		return () => {
			cancelled = true;
		};
	}, [
		isActive,
		commentsVisible,
		comments,
		replies,
		expandedComments,
		loadReplies,
		initialCommentId,
		initialReplyId,
		triggerCommentHighlight,
		triggerReplyHighlight,
	]);

	// Sync editingComment text into input
	useEffect(() => {
		if (editingComment) {
			setText(editingComment.text);
			setTimeout(() => {
				inputRef.current?.focus();
			}, 100);
		} else {
			setText('');
		}
	}, [editingComment]);
	
	// Double tap / Heart animation
	const lastTapRef = useRef<number | null>(null);
	const heartScale = useSharedValue(0);
	const heartOpacity = useSharedValue(0);

	const heartStyle = useAnimatedStyle(() => ({
		transform: [{ scale: heartScale.value }],
		opacity: heartOpacity.value,
	}));

	// ── Video lifecycle ──────────────────────────────────────────────
	// Hybrid approach: `shouldPlay` prop handles initial mount state,
	// while imperative playAsync/pauseAsync ensures reliable toggling
	// when isActive changes during FlatList recycling.
	const shouldPlay = isActive && isFocused && !userPaused;

	// Imperative play/pause — fires when activation state changes.
	// This is necessary because expo-av's `shouldPlay` prop doesn't
	// always re-evaluate reliably during FlatList cell recycling.
	// • Active + playing: playAsync
	// • Active + user paused: pauseAsync (keeps position, no native overlay)
	// • Not active at all: pauseAsync (gentle stop, avoids native play icon)
	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		if (shouldPlay) {
			video.playAsync().catch(() => {});
		} else {
			video.pauseAsync().catch(() => {});
		}
	}, [shouldPlay]);

	// Consolidated analytics flush function
	const flushAnalytics = useCallback(() => {
		const impressions = impressionRecordedRef.current ? 1 : 0;
		const plays = playRecordedRef.current ? 1 : 0;
		const watchTime = totalWatchTimeRef.current;
		const completions = completionsRef.current;

		const lastViewTime = viewCooldownCache[reel.id] || 0;
		const now = Date.now();
		const isCooldownElapsed = now - lastViewTime >= COOLDOWN_MS;
		const isQualified = qualifiedViewSentRef.current && isCooldownElapsed;

		if (impressions === 0 && plays === 0 && watchTime === 0 && completions === 0) {
			return; // Nothing to report
		}

		const payload = {
			impressions,
			plays,
			watchTime: parseFloat(watchTime.toFixed(2)),
			completions,
			qualifiedView: isQualified,
		};

		if (isQualified) {
			viewCooldownCache[reel.id] = now;
			AsyncStorage.getItem(COOLDOWN_KEY).then((data) => {
				const cache = data ? JSON.parse(data) : {};
				cache[reel.id] = now;
				AsyncStorage.setItem(COOLDOWN_KEY, JSON.stringify(cache));
			}).catch(() => {});

			// Update UI state
			onRecordView(reel.id);
		}

		// Reset flags so they aren't double reported in next segment
		impressionRecordedRef.current = false;
		playRecordedRef.current = false;
		totalWatchTimeRef.current = 0;
		completionsRef.current = 0;

		sendAnalytics(reel.id, payload);
	}, [reel.id, onRecordView]);

	// AppState Listener to pause timer and flush analytics
	const appStateRef = useRef(AppState.currentState);
	useEffect(() => {
		const subscription = AppState.addEventListener('change', (nextAppState) => {
			if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
				// App going to background: pause watch timer and flush
				lastUpdateRef.current = null;
				continuousWatchRef.current = 0;
				flushAnalytics();
			}
			appStateRef.current = nextAppState;
		});
		return () => subscription.remove();
	}, [flushAnalytics]);

	// Cooldown and visibility active transition
	useEffect(() => {
		if (isActive) {
			setUserPaused(false);
			
			// Sync offline queue
			syncOfflineAnalytics();
			
			// Load cooldown cache from storage if empty
			AsyncStorage.getItem(COOLDOWN_KEY).then((data) => {
				if (data) {
					try {
						const parsed = JSON.parse(data);
						Object.assign(viewCooldownCache, parsed);
					} catch (e) {}
				}
			}).catch(() => {});

			// Impression starts!
			impressionRecordedRef.current = true;
			
			// Check cooldown
			const lastViewTime = viewCooldownCache[reel.id] || 0;
			const now = Date.now();
			if (now - lastViewTime < COOLDOWN_MS) {
				qualifiedViewSentRef.current = true; // Already viewed within cooldown
			} else {
				qualifiedViewSentRef.current = false;
			}
			
			// Start tracking watch time
			continuousWatchRef.current = 0;
			lastUpdateRef.current = Date.now();
		} else {
			// User scrolled away! Flush analytics
			flushAnalytics();
			
			// Reset tracking refs
			lastUpdateRef.current = null;
			continuousWatchRef.current = 0;
			playRecordedRef.current = false;
			impressionRecordedRef.current = false;
			qualifiedViewSentRef.current = false;
			totalWatchTimeRef.current = 0;
			completionsRef.current = 0;
		}

		return () => {
			// Flush on unmount
			flushAnalytics();
		};
	}, [isActive, reel.id, flushAnalytics]);

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

	const togglePlayPause = () => {
		setUserPaused(prev => !prev);
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



	const handleSubmitComment = async () => {
		if (!text.trim()) return;
		if (editingComment) {
			await updateComment(editingComment.id, text);
		} else {
			await postComment(text);
			onIncrementCommentsCount(reel.id);
		}
		setText('');
		Keyboard.dismiss();
	};

	const handleEmojiPress = async (emoji: string) => {
		await postComment(emoji);
		onIncrementCommentsCount(reel.id);
	};

	const toggleReplies = async (commentId: string) => {
		const isCurrentlyExpanded = !!expandedComments[commentId];
		if (!isCurrentlyExpanded) {
			setExpandedComments(prev => ({ ...prev, [commentId]: true }));
			await loadReplies(commentId, true);
		} else {
			setExpandedComments(prev => ({ ...prev, [commentId]: false }));
		}
	};

	const handleCommentPress = (comment: ReelComment) => {
		const isOwner = comment.authorId === user?._id;
		if (isOwner) {
			setSelectedCommentForActions(comment);
			setActionSheetVisible(true);
		} else {
			setReplyingTo(comment);
			setTimeout(() => {
				inputRef.current?.focus();
			}, 100);
		}
	};

	const handleCopyText = (comment: ReelComment) => {
		Clipboard.setString(comment.text);
		setActionSheetVisible(false);
	};

	const handleStartEdit = (comment: ReelComment) => {
		setEditingComment(comment);
		setActionSheetVisible(false);
	};

	const handleDelete = async (comment: ReelComment) => {
		setActionSheetVisible(false);
		await deleteComment(comment.id);
	};

	// Get navigation
	const navigation = useNavigation<any>();

	return (
		<View style={[styles.container, { width: containerWidth, height: containerHeight }]}>
			<TouchableWithoutFeedback onPress={handlePress}>
				<View style={StyleSheet.absoluteFill}>
					{/*
					 * ── Cinematic video display ────────────────────────
					 *
					 * All videos (portrait, landscape, square) use the
					 * same layout:
					 *
					 *   Layer 1: Blurred thumbnail filling the entire
					 *            screen — eliminates pure black bars and
					 *            gives a rich, immersive background.
					 *
					 *   Layer 2: Video inside a 90%-height centered
					 *            container with ResizeMode.CONTAIN.
					 *            Full width, vertically centered, with
					 *            ~5% padding at top and bottom.
					 *
					 *   Layer 3: Sharp thumbnail overlay (crossfades
					 *            out when the first video frame renders).
					 */}

					{/* Blurred background — always fills entire screen */}
					<Image
						source={{ uri: reel.thumbnailUrl }}
						style={StyleSheet.absoluteFillObject}
						contentFit="cover"
						blurRadius={30}
					/>
					{/* Darken overlay on blurred bg for cinematic look */}
					<View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />

					{/* Video container — 90% height, centered vertically */}
					<View style={styles.videoContainer}>
						<Video
							ref={videoRef}
							source={{ uri: reel.videoUrl }}
							shouldPlay={shouldPlay}
							resizeMode={videoResizeMode}
							isLooping
							isMuted={isMuted}
							style={styles.videoPlayer}
							onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
							onReadyForDisplay={handleReadyForDisplay}
						/>
					</View>

					{/* PERMANENT thumbnail layer — always rendered on top.
					 *  Uses animated opacity to crossfade out when the video's
					 *  first frame is decoded (onReadyForDisplay). NEVER unmounts,
					 *  so there is always a visual fallback — eliminates black
					 *  frames during swipe transitions completely. */}
					<Animated.View style={[StyleSheet.absoluteFillObject, thumbnailAnimatedStyle]} pointerEvents="none">
						<Image
							source={{ uri: reel.thumbnailUrl }}
							style={StyleSheet.absoluteFillObject}
							contentFit={videoResizeMode === ResizeMode.CONTAIN ? 'contain' : 'cover'}
							onLoad={handleThumbnailLoad}
						/>
					</Animated.View>

					{/* Centered Loading Spinner — shown only when active & not yet frame-ready */}
					{isActive && isFocused && !isVideoReady && (
						<View style={styles.loadingOverlay}>
							<ActivityIndicator size="large" color="#FFFFFF" />
						</View>
					)}

					{/* Top gradient */}
					<LinearGradient
						colors={['rgba(0,0,0,0.6)', 'transparent']}
						style={styles.topGradient}
					/>

					{/* Bottom gradient */}
					<LinearGradient
						colors={['transparent', 'rgba(0,0,0,0.8)']}
						style={styles.bottomGradient}
					/>

					{/* Double-tap heart */}
					<View style={styles.heartOverlay}>
						<Animated.View style={heartStyle}>
							<Ionicons name="heart" size={100} color="#FF2D55" />
						</Animated.View>
					</View>

					{/* Play icon HUD — shown when user manually paused */}
					{isActive && userPaused && (
						<View style={styles.hudOverlay}>
							<Ionicons name="play" size={50} color="rgba(255,255,255,0.7)" />
						</View>
					)}
				</View>
			</TouchableWithoutFeedback>

			{/* Bottom info section */}
			<View style={[styles.bottomInfo, { bottom: bottomInfoBottom }]}>
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
					{isOwner && reel.viewsCount !== undefined && reel.viewsCount !== null && (
						<View style={styles.userTag}>
							<Ionicons name="people" size={12} color="#FFF" style={styles.userIcon} />
							<Text style={styles.userText}>{reel.viewsCount} users</Text>
						</View>
					)}
				</View>
			</View>

			{/* Right-side button overlay */}
			<View style={[styles.rightOverlay, { bottom: rightOverlayBottom }]}>
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
				<TouchableOpacity style={styles.plusButtonCircle} onPress={() => navigation.navigate('ReelCapture')}>
					<Ionicons name="add" size={24} color="#FFF" />
				</TouchableOpacity>
			</View>

			{/* ── TikTok/Instagram-quality Comments Bottom Sheet ─────────────── */}
			{commentsVisible && (
				<View style={[StyleSheet.absoluteFillObject, { zIndex: 1000 }]} pointerEvents="box-none">
					{/* Backdrop — smooth fade */}
					<Animated.View style={[styles.sheetBackdrop, backdropAnimatedStyle]}>
						<TouchableOpacity
							activeOpacity={1}
							style={StyleSheet.absoluteFillObject}
							onPress={closeComments}
						/>
					</Animated.View>

					{/* Sheet — position:absolute, fixed height, flex column children */}
					<Animated.View
						style={[
							styles.sheetContainer,
							sheetAnimatedStyle,
							{
								backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
								height: SHEET_HEIGHT,
							},
						]}
					>
						{/* ── Drag handle + header ───────────────────────── */}
						<GestureDetector gesture={panGesture}>
							<View style={styles.commentsHeader}>
								<View style={[styles.commentsHeaderIndicator, { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }]} />
								<View style={styles.commentsHeaderTitleRow}>
									<Text style={[styles.commentsTitle, { color: T.text }]}>Comments</Text>
									<TouchableOpacity onPress={closeComments} style={styles.commentsCloseBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
										<Ionicons name="close" size={22} color={T.textMuted} />
									</TouchableOpacity>
								</View>
							</View>
						</GestureDetector>

						{/* Toast */}
						{toastMessage && (
							<View style={styles.toastContainer}>
								<Text style={styles.toastText}>{toastMessage}</Text>
							</View>
						)}

						{/* ── Comments list — RNGH ScrollView avoids gesture conflicts ── */}
						<View style={{ flex: 1 }}>
							{loadingComments && comments.length === 0 ? (
								<View style={styles.centerSpinner}>
									<Ionicons name="chatbubble-ellipses-outline" size={40} color={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'} />
									<ActivityIndicator size="small" color={T.green || '#6DAE3F'} style={{ marginTop: 16 }} />
								</View>
							) : comments.length === 0 ? (
								<View style={styles.centerSpinner}>
									<Ionicons name="chatbubble-outline" size={44} color={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'} />
									<Text style={[styles.emptyComments, { color: T.textMuted }]}>No comments yet</Text>
									<Text style={{ color: T.textMuted, fontSize: 13, marginTop: 4, opacity: 0.6 }}>Be the first to comment</Text>
								</View>
							) : (
								<GHScrollView
									style={{ flex: 1 }}
									showsVerticalScrollIndicator={false}
									keyboardShouldPersistTaps="handled"
									contentContainerStyle={{ paddingTop: 4, paddingBottom: 32 }}
									bounces={Platform.OS === 'ios'}
									scrollEventThrottle={16}
									onScroll={(e) => {
										const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
										const nearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
										if (nearBottom && hasMore && !loadingMore) {
											loadComments();
										}
									}}
								>
									{comments.map((item) => {
										const isLikedByMe = user?._id ? item.likedBy.includes(user._id) : false;
										const isExpanded = !!expandedComments[item.id];
										const commentReplies = replies[item.id] || [];
										const loadingRepliesForComment = !!loadingReplies[item.id];
										const relativeTime = formatRelativeTime(item.createdAt);
										return (
											<CommentItem
												key={item.id}
												item={item}
												user={user}
												T={T}
												isDark={isDark}
												relativeTime={relativeTime}
												isLikedByMe={isLikedByMe}
												isExpanded={isExpanded}
												commentReplies={commentReplies}
												loadingRepliesForComment={loadingRepliesForComment}
												highlightedCommentId={highlightedCommentId}
												highlightedReplyId={highlightedReplyId}
												commentHighlightStyle={commentHighlightStyle}
												replyHighlightStyle={replyHighlightStyle}
												onCommentPress={handleCommentPress}
												onToggleReplies={toggleReplies}
												onStartEdit={handleStartEdit}
												onDeleteComment={deleteComment}
												onToggleCommentLike={toggleCommentLike}
												onReplyPress={(parent) => {
													setReplyingTo(parent);
													setTimeout(() => inputRef.current?.focus(), 100);
												}}
											/>
										);
									})}
									{loadingMore && (
										<ActivityIndicator size="small" color={T.green || '#6DAE3F'} style={{ marginVertical: 16 }} />
									)}
								</GHScrollView>
							)}
						</View>

						{/* ── Composer (fixed at bottom, clears nav bar) ── */}
						<View style={[
							styles.composerWrapper,
							{
								backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
								borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
								paddingBottom: keyboardHeight > 0 ? keyboardHeight : navBarHeight,
							},
						]}>
							{replyingTo && (
								<View style={[styles.inputBanner, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
									<Text style={[styles.inputBannerText, { color: T.textMuted }]}>
										Replying to <Text style={{ fontWeight: '700', color: T.text }}>@{replyingTo.authorUsername}</Text>
									</Text>
									<TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
										<Ionicons name="close-circle" size={18} color={T.textMuted} />
									</TouchableOpacity>
								</View>
							)}
							{editingComment && (
								<View style={[styles.inputBanner, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
									<View style={{ flexDirection: 'row', alignItems: 'center' }}>
										<Ionicons name="pencil" size={14} color="#6DAE3F" style={{ marginRight: 6 }} />
										<Text style={[styles.inputBannerText, { color: T.textMuted }]}>Editing comment</Text>
									</View>
									<TouchableOpacity onPress={() => setEditingComment(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
										<Ionicons name="close-circle" size={18} color={T.textMuted} />
									</TouchableOpacity>
								</View>
							)}
							<View style={styles.commentInputRow}>
								<Image
									source={{ uri: user?.avatarUrl || DEFAULT_AVATAR_URL }}
									style={styles.inputAvatar}
								/>
								<View style={[styles.commentInputContainer, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
									<TextInput
										ref={inputRef}
										value={text}
										onChangeText={setText}
										placeholder={replyingTo ? `Reply to @${replyingTo.authorUsername}...` : 'Write a comment...'}
										placeholderTextColor={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'}
										style={[styles.commentInput, { color: T.text }]}
										multiline
										maxLength={500}
									/>
									<TouchableOpacity style={styles.inputIconButton} onPress={() => showToast('Emoji picker coming soon!')}>
										<Ionicons name="happy-outline" size={22} color={isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)'} />
									</TouchableOpacity>
								</View>
								{text.trim() ? (
									<TouchableOpacity onPress={handleSubmitComment} style={styles.postButton} activeOpacity={0.7}>
										<View style={styles.sendButtonCircle}>
											<Ionicons name="arrow-up" size={18} color="#FFF" />
										</View>
									</TouchableOpacity>
								) : null}
							</View>
						</View>
					</Animated.View>
				</View>
			)}

			{/* Custom Owner Action Sheet Modal */}
			<Modal
				visible={actionSheetVisible}
				animationType="fade"
				transparent
				onRequestClose={() => setActionSheetVisible(false)}
			>
				<TouchableOpacity
					style={styles.actionSheetOverlay}
					activeOpacity={1}
					onPress={() => setActionSheetVisible(false)}
				>
					<View style={[styles.actionSheetContainer, { backgroundColor: T.surfaceAlt }]}>
						<View style={[styles.actionSheetHeaderIndicator, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]} />
						<TouchableOpacity
							style={[styles.actionSheetButton, { borderBottomColor: T.divider }]}
							onPress={() => selectedCommentForActions && handleCopyText(selectedCommentForActions)}
						>
							<Text style={[styles.actionSheetButtonText, { color: T.text }]}>Copy Text</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.actionSheetButton, { borderBottomColor: T.divider }]}
							onPress={() => selectedCommentForActions && handleStartEdit(selectedCommentForActions)}
						>
							<Text style={[styles.actionSheetButtonText, { color: T.text }]}>Edit Comment</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.actionSheetButton, styles.actionSheetDeleteButton, { borderBottomColor: T.divider }]}
							onPress={() => selectedCommentForActions && handleDelete(selectedCommentForActions)}
						>
							<Text style={[styles.actionSheetButtonText, styles.actionSheetDeleteText]}>Delete Comment</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.actionSheetButton, styles.actionSheetCancelButton, { backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.divider }]}
							onPress={() => setActionSheetVisible(false)}
						>
							<Text style={[styles.actionSheetCancelText, { color: T.textMuted }]}>Cancel</Text>
						</TouchableOpacity>
					</View>
				</TouchableOpacity>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#000',
		// Clip any overflow from the native Video wrapper so its black
		// background can never bleed outside the item bounds.
		overflow: 'hidden',
	},
	videoContainer: {
		// Centered video area — accounts for overlapping UI:
		// top: category pills + status bar (~8%)
		// bottom: nav bar + safe area (~8%)
		// Equal padding creates a visually centered video.
		position: 'absolute',
		top: '6%',
		left: 0,
		right: 0,
		bottom: '6%',
		justifyContent: 'center',
		alignItems: 'center',
	},
	videoPlayer: {
		width: '100%',
		height: '100%',
		backgroundColor: 'transparent',
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
	loadingOverlay: {
		...StyleSheet.absoluteFillObject,
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 4,
		backgroundColor: 'rgba(0,0,0,0.35)',
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
	// ── Comments Bottom Sheet (TikTok / Instagram quality) ───────────────
	sheetBackdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(0,0,0,0.55)',
		zIndex: 999,
	},
	sheetContainer: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		// height set via inline style using the computed SHEET_HEIGHT number
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		overflow: 'hidden',
		zIndex: 1000,
		flexDirection: 'column', // children stack vertically within the fixed height
		shadowColor: '#000',
		shadowOffset: { width: 0, height: -4 },
		shadowOpacity: 0.15,
		shadowRadius: 12,
		elevation: 20,
	},
	commentsHeader: {
		alignItems: 'center',
		paddingTop: 10,
		paddingBottom: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: 'rgba(128,128,128,0.2)',
	},
	commentsHeaderIndicator: {
		width: 36,
		height: 4,
		borderRadius: 2,
		marginBottom: 10,
	},
	commentsHeaderTitleRow: {
		flexDirection: 'row',
		width: '100%',
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 16,
		position: 'relative',
	},
	commentsTitle: {
		fontSize: 15,
		fontWeight: '700',
		letterSpacing: 0.2,
		textAlign: 'center',
	},
	commentsCloseBtn: {
		position: 'absolute',
		right: 16,
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: 'rgba(128,128,128,0.15)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	centerSpinner: {
		flex: 1,
		minHeight: 200,
		justifyContent: 'center',
		alignItems: 'center',
	},
	commentList: {
		paddingHorizontal: 16,
		paddingTop: 12,
	},
	commentRowContainer: {
		marginBottom: 18,
		paddingHorizontal: 16,
	},
	commentItem: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		borderRadius: 14,
		paddingVertical: 2,
	},
	commentAvatar: {
		width: 36,
		height: 36,
		borderRadius: 18,
		marginRight: 12,
	},
	commentTextContainer: {
		flex: 1,
		paddingRight: 8,
	},
	commentAuthorHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 3,
	},
	commentAuthor: {
		fontSize: 13,
		fontWeight: '700',
		letterSpacing: 0.1,
	},
	commentTime: {
		fontSize: 11,
		marginLeft: 8,
		opacity: 0.6,
	},
	commentText: {
		fontSize: 14,
		lineHeight: 20,
	},
	commentActionsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 6,
		gap: 16,
	},
	commentActionButton: {
		paddingVertical: 2,
	},
	commentActionText: {
		fontSize: 12,
		fontWeight: '600',
		opacity: 0.65,
	},
	likeIconContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		minWidth: 28,
		marginTop: 2,
	},
	commentLikeCount: {
		fontSize: 11,
		marginTop: 2,
		opacity: 0.5,
	},
	repliesWrapper: {
		paddingLeft: 48,
		marginTop: 8,
	},
	viewRepliesButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 6,
	},
	viewRepliesLine: {
		width: 24,
		height: 1,
		marginRight: 10,
		opacity: 0.4,
	},
	viewRepliesText: {
		fontSize: 12,
		fontWeight: '600',
		opacity: 0.55,
	},
	repliesList: {
		marginTop: 8,
	},
	replyItem: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: 14,
		borderRadius: 12,
		paddingVertical: 2,
	},
	highlightedItemBase: {
		borderWidth: 1,
		borderColor: 'rgba(109,174,63,0.4)',
		borderRadius: 12,
	},
	replyAvatar: {
		width: 24,
		height: 24,
		borderRadius: 12,
		marginRight: 10,
	},
	replyLikeCount: {
		fontSize: 9,
		marginTop: 2,
		opacity: 0.5,
	},
	// ── Composer ─────────────────────────────────────────────────────────
	composerWrapper: {
		borderTopWidth: StyleSheet.hairlineWidth,
	},
	inputBanner: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	inputBannerText: {
		fontSize: 13,
	},
	commentInputRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 14,
		paddingTop: 10,
		paddingBottom: Platform.OS === 'ios' ? 6 : 8,
	},
	inputAvatar: {
		width: 32,
		height: 32,
		borderRadius: 16,
		marginRight: 10,
	},
	commentInputContainer: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 22,
		paddingHorizontal: 14,
		minHeight: 40,
		maxHeight: 100,
	},
	commentInput: {
		flex: 1,
		fontSize: 14,
		paddingVertical: 8,
		marginRight: 6,
	},
	inputIconButton: {
		padding: 4,
	},
	gifButton: {
		borderWidth: 1.5,
		borderRadius: 4,
		paddingHorizontal: 4,
		paddingVertical: 1,
		marginRight: 4,
	},
	gifButtonText: {
		fontSize: 9,
		fontWeight: '800',
	},
	postButton: {
		marginLeft: 8,
	},
	sendButtonCircle: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#6DAE3F',
		justifyContent: 'center',
		alignItems: 'center',
	},
	giftButtonIcon: {
		paddingHorizontal: 10,
		paddingVertical: 8,
	},
	emptyComments: {
		textAlign: 'center',
		marginTop: 14,
		fontSize: 15,
		fontWeight: '600',
	},
	toastContainer: {
		position: 'absolute',
		top: 10,
		left: 16,
		right: 16,
		backgroundColor: 'rgba(255, 45, 85, 0.92)',
		borderRadius: 12,
		paddingVertical: 10,
		paddingHorizontal: 16,
		alignItems: 'center',
		zIndex: 9999,
		elevation: 5,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.25,
		shadowRadius: 6,
	},
	toastText: {
		color: '#FFF',
		fontSize: 13,
		fontWeight: '600',
	},
	actionSheetOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.5)',
		justifyContent: 'flex-end',
	},
	actionSheetContainer: {
		backgroundColor: '#2C2C2E',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingTop: 8,
		paddingBottom: Platform.OS === 'ios' ? 24 : 12,
	},
	actionSheetHeaderIndicator: {
		width: 40,
		height: 4,
		backgroundColor: 'rgba(255,255,255,0.15)',
		borderRadius: 2,
		alignSelf: 'center',
		marginBottom: 16,
	},
	actionSheetButton: {
		paddingVertical: 16,
		alignItems: 'center',
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: 'rgba(255,255,255,0.06)',
	},
	actionSheetButtonText: {
		color: '#FFF',
		fontSize: 16,
		fontWeight: '600',
	},
	actionSheetDeleteButton: {
		borderBottomWidth: 0,
	},
	actionSheetDeleteText: {
		color: '#FF2D55',
	},
	actionSheetCancelButton: {
		backgroundColor: '#1C1C1E',
		marginTop: 8,
		borderBottomWidth: 0,
	},
	actionSheetCancelText: {
		color: '#8A8A8E',
		fontSize: 16,
		fontWeight: '600',
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

/**
 * Exported as a memoized component. The custom comparator prevents
 * re-renders triggered by parent state changes (share modal, category
 * filter, etc.) that don't affect this item's output.
 */
export const ReelPlayerItem = memo(ReelPlayerItemComponent, arePropsEqual);
