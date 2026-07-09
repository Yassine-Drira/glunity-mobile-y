import { useState, useCallback, useRef } from 'react';
import { ReelsService, ReelComment } from '../services/reels.service';
import { useAuth } from '../../auth/state/auth.context';

export function useReelComments(reelId: string, onCommentsCountChanged?: (reelId: string, newCount: number) => void) {
	const { user } = useAuth();
	
	const [comments, setComments] = useState<ReelComment[]>([]);
	const [loading, setLoading] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	// Pagination refs instead of state to keep loadComments/loadReplies callbacks stable
	const pageRef = useRef(0);
	const repliesPageRef = useRef<Record<string, number>>({});

	// Nested replies mapping: parentCommentId -> ReelComment[]
	const [replies, setReplies] = useState<Record<string, ReelComment[]>>({});
	const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({});
	const [repliesHasMore, setRepliesHasMore] = useState<Record<string, boolean>>({});

	// Edit & Reply context
	const [replyingTo, setReplyingTo] = useState<ReelComment | null>(null);
	const [editingComment, setEditingComment] = useState<ReelComment | null>(null);

	// Error / Toast state
	const [toastMessage, setToastMessage] = useState<string | null>(null);

	// Network locks
	const likingLocks = useRef<Set<string>>(new Set());
	const loadingRepliesLocks = useRef<Set<string>>(new Set());

	const showToast = useCallback((msg: string) => {
		setToastMessage(msg);
		// Auto hide after 3 seconds
		setTimeout(() => {
			setToastMessage((prev) => (prev === msg ? null : prev));
		}, 3000);
	}, []);

	// Load top-level comments
	const loadComments = useCallback(async (reset = false) => {
		const targetPage = reset ? 0 : pageRef.current;
		if (reset) {
			setLoading(true);
		} else {
			setLoadingMore(true);
		}

		try {
			const res = await ReelsService.getComments(reelId, targetPage, 15);
			if (res.success) {
				const fetched = res.data;
				setComments((prev) => {
					if (reset) return fetched;
					// Filter duplicates
					const existingIds = new Set(prev.map((c) => c.id));
					return [...prev, ...fetched.filter((c) => !existingIds.has(c.id))];
				});
				setHasMore(fetched.length === 15);
				pageRef.current = targetPage + 1;
			} else {
				showToast('Failed to load comments.');
			}
		} catch (err) {
			console.error('getComments error:', err);
			showToast('Failed to load comments. Network error.');
		} finally {
			setLoading(false);
			setLoadingMore(false);
		}
	}, [reelId, showToast]);

	// Load replies of a comment (lazy load)
	const loadReplies = useCallback(async (parentCommentId: string, reset = false) => {
		if (loadingRepliesLocks.current.has(parentCommentId)) return;
		loadingRepliesLocks.current.add(parentCommentId);

		const currentPage = repliesPageRef.current[parentCommentId] || 0;
		const targetPage = reset ? 0 : currentPage;

		setLoadingReplies((prev) => ({ ...prev, [parentCommentId]: true }));

		try {
			const res = await ReelsService.getReplies(reelId, parentCommentId, targetPage, 10);
			if (res.success) {
				const fetched = res.data;
				setReplies((prev) => {
					const existing = prev[parentCommentId] || [];
					if (reset) return { ...prev, [parentCommentId]: fetched };
					const existingIds = new Set(existing.map((r) => r.id));
					return {
						...prev,
						[parentCommentId]: [...existing, ...fetched.filter((r) => !existingIds.has(r.id))],
					};
				});
				setRepliesHasMore((prev) => ({ ...prev, [parentCommentId]: fetched.length === 10 }));
				repliesPageRef.current[parentCommentId] = targetPage + 1;
			} else {
				showToast('Failed to load replies.');
			}
		} catch (err) {
			console.error('getReplies error:', err);
			showToast('Failed to load replies. Network error.');
		} finally {
			setLoadingReplies((prev) => ({ ...prev, [parentCommentId]: false }));
			loadingRepliesLocks.current.delete(parentCommentId);
		}
	}, [reelId, showToast]);

	// Add new comment or reply
	const postComment = useCallback(async (text: string) => {
		if (!text.trim() || !user) return;

		const parentId = replyingTo ? replyingTo.id : null;
		const tempId = `temp-${Date.now()}`;
		const now = new Date().toISOString();

		// Build optimistic comment object
		const optimisticComment: ReelComment = {
			id: tempId,
			reelId,
			authorId: user._id,
			authorUsername: user.fullName ? user.fullName.replace(/\s+/g, '').toLowerCase() : 'anonymous',
			authorAvatar: user.avatarUrl || null,
			author: {
				id: user._id,
				fullName: user.fullName || 'Anonymous',
				avatarUrl: user.avatarUrl || undefined,
			},
			text: text.trim(),
			createdAt: now,
			updatedAt: now,
			edited: false,
			likeCount: 0,
			likedBy: [],
			replyCount: 0,
			parentCommentId: parentId,
		};

		// Snapshot state for rollback
		const prevComments = [...comments];
		const prevReplies = { ...replies };

		// Optimistic UI updates
		if (parentId) {
			setReplies((prev) => ({
				...prev,
				[parentId]: [...(prev[parentId] || []), optimisticComment],
			}));
			// Increment reply count on parent comment in comments list
			setComments((prev) =>
				prev.map((c) => (c.id === parentId ? { ...c, replyCount: c.replyCount + 1 } : c))
			);
		} else {
			setComments((prev) => [optimisticComment, ...prev]);
		}

		setReplyingTo(null);

		try {
			const res = await ReelsService.postComment(reelId, text.trim(), parentId);
			if (res.success) {
				const realComment = res.data;
				// Swap temp comment with real server comment
				if (parentId) {
					setReplies((prev) => ({
						...prev,
						[parentId]: (prev[parentId] || []).map((c) => (c.id === tempId ? realComment : c)),
					}));
				} else {
					setComments((prev) => prev.map((c) => (c.id === tempId ? realComment : c)));
				}
			} else {
				throw new Error('Failed to post comment');
			}
		} catch (err) {
			console.error('postComment error:', err);
			showToast(parentId ? "Couldn't reply." : "Couldn't post comment.");
			// Rollback on error
			setComments(prevComments);
			setReplies(prevReplies);
		}
	}, [reelId, user, replyingTo, comments, replies, showToast]);

	// Edit comment text
	const updateComment = useCallback(async (commentId: string, newText: string) => {
		if (!newText.trim() || !user) return;

		// Snapshot state for rollback
		const prevComments = [...comments];
		const prevReplies = { ...replies };

		let isReply = false;
		let parentId: string | null = null;

		// Find if it's a reply or a parent comment
		const targetComment = comments.find((c) => c.id === commentId);
		if (!targetComment) {
			for (const pId of Object.keys(replies)) {
				const found = replies[pId].find((r) => r.id === commentId);
				if (found) {
					isReply = true;
					parentId = pId;
					break;
				}
			}
		}

		// Optimistic UI updates
		if (isReply && parentId) {
			setReplies((prev) => ({
				...prev,
				[parentId!]: (prev[parentId!] || []).map((r) =>
					r.id === commentId ? { ...r, text: newText.trim(), edited: true } : r
				),
			}));
		} else {
			setComments((prev) =>
				prev.map((c) => (c.id === commentId ? { ...c, text: newText.trim(), edited: true } : c))
			);
		}

		setEditingComment(null);

		try {
			const res = await ReelsService.updateComment(reelId, commentId, newText.trim());
			if (res.success) {
				const realComment = res.data;
				// Sync with server state
				if (isReply && parentId) {
					setReplies((prev) => ({
						...prev,
						[parentId!]: (prev[parentId!] || []).map((r) => (r.id === commentId ? realComment : r)),
					}));
				} else {
					setComments((prev) => prev.map((c) => (c.id === commentId ? realComment : c)));
				}
			} else {
				throw new Error('Failed to update comment');
			}
		} catch (err) {
			console.error('updateComment error:', err);
			showToast("Couldn't edit comment.");
			// Rollback on error
			setComments(prevComments);
			setReplies(prevReplies);
		}
	}, [reelId, user, comments, replies, showToast]);

	// Delete comment
	const deleteComment = useCallback(async (commentId: string) => {
		if (!user) return;

		// Snapshot state for rollback
		const prevComments = [...comments];
		const prevReplies = { ...replies };

		let isReply = false;
		let parentId: string | null = null;

		const targetComment = comments.find((c) => c.id === commentId);
		if (!targetComment) {
			for (const pId of Object.keys(replies)) {
				const found = replies[pId].find((r) => r.id === commentId);
				if (found) {
					isReply = true;
					parentId = pId;
					break;
				}
			}
		}

		// Optimistic UI updates
		if (isReply && parentId) {
			setReplies((prev) => ({
				...prev,
				[parentId!]: (prev[parentId!] || []).filter((r) => r.id !== commentId),
			}));
			// Decrement reply count on parent in main list
			setComments((prev) =>
				prev.map((c) => (c.id === parentId ? { ...c, replyCount: Math.max(0, c.replyCount - 1) } : c))
			);
		} else {
			setComments((prev) => prev.filter((c) => c.id !== commentId));
		}

		try {
			const res = await ReelsService.deleteComment(reelId, commentId);
			if (!res.success) {
				throw new Error('Failed to delete comment');
			}
		} catch (err) {
			console.error('deleteComment error:', err);
			showToast("Couldn't delete comment.");
			// Rollback on error
			setComments(prevComments);
			setReplies(prevReplies);
		}
	}, [reelId, user, comments, replies, showToast]);

	// Toggle comment like
	const toggleCommentLike = useCallback(async (commentId: string) => {
		if (!user) return;
		
		// Prevent rapid duplicate clicks (debounce / request locking)
		if (likingLocks.current.has(commentId)) return;
		likingLocks.current.add(commentId);

		const userIdStr = user._id;

		// Snapshot state for rollback
		const prevComments = [...comments];
		const prevReplies = { ...replies };

		let isReply = false;
		let parentId: string | null = null;

		let commentToUpdate = comments.find((c) => c.id === commentId);
		if (!commentToUpdate) {
			for (const pId of Object.keys(replies)) {
				const found = replies[pId].find((r) => r.id === commentId);
				if (found) {
					commentToUpdate = found;
					isReply = true;
					parentId = pId;
					break;
				}
			}
		}

		if (!commentToUpdate) {
			likingLocks.current.delete(commentId);
			return;
		}

		// Calculate new liked values locally
		const alreadyLiked = commentToUpdate.likedBy.includes(userIdStr);
		const newLikedBy = alreadyLiked
			? commentToUpdate.likedBy.filter((id) => id !== userIdStr)
			: [...commentToUpdate.likedBy, userIdStr];
		const newLikeCount = alreadyLiked ? commentToUpdate.likeCount - 1 : commentToUpdate.likeCount + 1;

		const updatedFields = {
			likedBy: newLikedBy,
			likeCount: Math.max(0, newLikeCount),
		};

		// Optimistic UI updates
		if (isReply && parentId) {
			setReplies((prev) => ({
				...prev,
				[parentId!]: (prev[parentId!] || []).map((r) =>
					r.id === commentId ? { ...r, ...updatedFields } : r
				),
			}));
		} else {
			setComments((prev) =>
				prev.map((c) => (c.id === commentId ? { ...c, ...updatedFields } : c))
			);
		}

		try {
			const res = await ReelsService.toggleCommentLike(reelId, commentId);
			if (res.success) {
				const serverComment = res.data;
				// Sync with server values
				if (isReply && parentId) {
					setReplies((prev) => ({
						...prev,
						[parentId!]: (prev[parentId!] || []).map((r) =>
							r.id === commentId ? { ...r, likedBy: serverComment.likedBy, likeCount: serverComment.likeCount } : r
						),
					}));
				} else {
					setComments((prev) =>
						prev.map((c) =>
							c.id === commentId ? { ...c, likedBy: serverComment.likedBy, likeCount: serverComment.likeCount } : c
						)
					);
				}
			} else {
				throw new Error('Failed to toggle comment like');
			}
		} catch (err) {
			console.error('toggleCommentLike error:', err);
			showToast("Couldn't like comment.");
			// Rollback on error
			setComments(prevComments);
			setReplies(prevReplies);
		} finally {
			// Small timeout to allow debounce effect
			setTimeout(() => {
				likingLocks.current.delete(commentId);
			}, 300);
		}
	}, [reelId, user, comments, replies, showToast]);

	return {
		comments,
		loading,
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
	};
}
