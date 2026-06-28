import { useState, useEffect, useCallback, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import axios from 'axios';
import { ReelsService, Reel } from '../services/reels.service';

export interface CategoryFeedState {
	reels: Reel[];
	page: number;
	hasMore: boolean;
	activeIndex: number;
	lastFetched: number;
	loading: boolean;
	error: string | null;
}

const INITIAL_CATEGORY_FEED: CategoryFeedState = {
	reels: [],
	page: 0,
	hasMore: true,
	activeIndex: 0,
	lastFetched: 0,
	loading: false,
	error: null,
};

const INITIAL_FEEDS: Record<string, CategoryFeedState> = {
	all: { ...INITIAL_CATEGORY_FEED },
	recipes: { ...INITIAL_CATEGORY_FEED },
	tips: { ...INITIAL_CATEGORY_FEED },
	products: { ...INITIAL_CATEGORY_FEED },
	lifestyle: { ...INITIAL_CATEGORY_FEED },
};

const CACHE_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes

export function useReelsFeed(initialCategory = 'all') {
	const [feeds, setFeeds] = useState<Record<string, CategoryFeedState>>(INITIAL_FEEDS);
	const [category, setCategory] = useState<string>(initialCategory);
	const [refreshing, setRefreshing] = useState<boolean>(false);
	const viewedReelsRef = useRef<Set<string>>(new Set());
	const abortControllersRef = useRef<Record<string, AbortController>>({});
	const feedsRef = useRef<Record<string, CategoryFeedState>>(INITIAL_FEEDS);

	// Sync feedsRef with state
	useEffect(() => {
		feedsRef.current = feeds;
	}, [feeds]);

	// Listen to reelDeleted events to instantly clean up feeds in real-time
	useEffect(() => {
		const sub = DeviceEventEmitter.addListener('reelDeleted', ({ reelId }) => {
			setFeeds(prev => {
				const updated = { ...prev };
				let changed = false;
				for (const cat of Object.keys(updated)) {
					const feed = updated[cat];
					if (feed.reels.some(r => r.id === reelId)) {
						changed = true;
						const filtered = feed.reels.filter(r => r.id !== reelId);
						updated[cat] = {
							...feed,
							reels: filtered,
							activeIndex: Math.max(0, Math.min(feed.activeIndex, filtered.length - 1))
						};
					}
				}
				return changed ? updated : prev;
			});
		});
		return () => sub.remove();
	}, []);

	const loadFeed = useCallback(async (cat: string, isRefresh = false, forceFetch = false) => {
		const currentFeed = feedsRef.current[cat] || INITIAL_CATEGORY_FEED;
		
		// If we are already loading this category and it's not a refresh, return
		if (currentFeed.loading && !isRefresh) return;

		// Determine the page to fetch
		const targetPage = isRefresh ? 0 : currentFeed.page;

		// Check cache validity (only for page 0)
		const isCacheValid = targetPage === 0 && currentFeed.reels.length > 0 && (Date.now() - currentFeed.lastFetched < CACHE_EXPIRATION_MS);
		if (isCacheValid && !isRefresh && !forceFetch) {
			// Cache is valid, no need to fetch
			return;
		}

		// Cancel any existing request for this category
		if (abortControllersRef.current[cat]) {
			abortControllersRef.current[cat].abort();
		}
		const controller = new AbortController();
		abortControllersRef.current[cat] = controller;

		// Set loading status
		if (isRefresh) {
			setRefreshing(true);
		}
		
		setFeeds(prev => ({
			...prev,
			[cat]: {
				...prev[cat],
				loading: !isRefresh,
				error: null,
				reels: isRefresh || targetPage === 0 ? [] : prev[cat].reels,
				activeIndex: isRefresh || targetPage === 0 ? 0 : prev[cat].activeIndex,
			}
		}));

		try {
			const response = await ReelsService.getFeed(targetPage, 10, cat, { signal: controller.signal });
			
			if (controller.signal.aborted) {
				return;
			}

			if (response.success) {
				const newReels = response.data;
				setFeeds(prev => {
					const existingFeed = prev[cat];
					let updatedReels = [];
					if (isRefresh || targetPage === 0) {
						updatedReels = newReels;
					} else {
						const existingIds = new Set(existingFeed.reels.map(r => r.id));
						const filteredNew = newReels.filter(r => !existingIds.has(r.id));
						updatedReels = [...existingFeed.reels, ...filteredNew];
					}
					
					return {
						...prev,
						[cat]: {
							reels: updatedReels,
							page: targetPage + 1,
							hasMore: newReels.length > 0,
							activeIndex: isRefresh || targetPage === 0 ? 0 : existingFeed.activeIndex,
							lastFetched: Date.now(),
							loading: false,
							error: null,
						}
					};
				});
			} else {
				setFeeds(prev => ({
					...prev,
					[cat]: {
						...prev[cat],
						loading: false,
						error: 'Failed to fetch reels feed',
					}
				}));
			}
		} catch (err: any) {
			if (err.name === 'CanceledError' || axios.isCancel?.(err) || controller.signal.aborted) {
				// Request was cancelled, ignore
				return;
			}
			setFeeds(prev => ({
				...prev,
				[cat]: {
					...prev[cat],
					loading: false,
					error: err.message || 'An error occurred while loading feed',
				}
			}));
		} finally {
			if (abortControllersRef.current[cat] === controller) {
				delete abortControllersRef.current[cat];
			}
			if (isRefresh) {
				setRefreshing(false);
			}
		}
	}, []);

	const refresh = useCallback(() => {
		loadFeed(category, true);
	}, [category, loadFeed]);

	const loadMore = useCallback(() => {
		const currentFeed = feedsRef.current[category];
		if (currentFeed && !currentFeed.loading && currentFeed.hasMore) {
			loadFeed(category);
		}
	}, [category, loadFeed]);

	const changeCategory = useCallback((newCat: string) => {
		setCategory(newCat);
		loadFeed(newCat);
	}, [loadFeed]);

	const setActiveIndex = useCallback((index: number) => {
		setFeeds(prev => ({
			...prev,
			[category]: {
				...prev[category],
				activeIndex: index,
			}
		}));
	}, [category]);

	const toggleLike = useCallback(async (reelId: string) => {
		const cat = category;
		const currentFeed = feedsRef.current[cat];
		let originalReel: Reel | undefined;
		
		setFeeds(prev => {
			const feed = prev[cat];
			const updatedReels = feed.reels.map(r => {
				if (r.id === reelId) {
					originalReel = { ...r };
					const isLiked = !r.isLiked;
					const likesCount = isLiked ? r.likesCount + 1 : Math.max(0, r.likesCount - 1);
					return { ...r, isLiked, likesCount };
				}
				return r;
			});
			return {
				...prev,
				[cat]: {
					...feed,
					reels: updatedReels
				}
			};
		});

		try {
			const res = await ReelsService.toggleLike(reelId);
			if (!res.success) {
				if (originalReel) {
					setFeeds(prev => ({
						...prev,
						[cat]: {
							...prev[cat],
							reels: prev[cat].reels.map(r => r.id === reelId ? originalReel! : r)
						}
					}));
				}
			} else {
				setFeeds(prev => ({
					...prev,
					[cat]: {
						...prev[cat],
						reels: prev[cat].reels.map(r => r.id === reelId ? {
							...r,
							isLiked: res.data.liked,
							likesCount: res.data.likesCount
						} : r)
					}
				}));
			}
		} catch (err) {
			if (originalReel) {
				setFeeds(prev => ({
					...prev,
					[cat]: {
						...prev[cat],
						reels: prev[cat].reels.map(r => r.id === reelId ? originalReel! : r)
					}
				}));
			}
		}
	}, [category]);

	const recordView = useCallback(async (reelId: string) => {
		if (viewedReelsRef.current.has(reelId)) {
			return;
		}
		const cat = category;
		try {
			await ReelsService.recordView(reelId);
			viewedReelsRef.current.add(reelId);
			setFeeds(prev => ({
				...prev,
				[cat]: {
					...prev[cat],
					reels: prev[cat].reels.map(r => r.id === reelId ? { ...r, viewsCount: r.viewsCount + 1 } : r)
				}
			}));
		} catch (err) {
			console.warn('Failed to record view for reel:', reelId, err);
		}
	}, [category]);

	const recordShare = useCallback(async (reelId: string) => {
		const cat = category;
		try {
			const res = await ReelsService.recordShare(reelId);
			if (res.success) {
				setFeeds(prev => ({
					...prev,
					[cat]: {
						...prev[cat],
						reels: prev[cat].reels.map(r => r.id === reelId ? { ...r, sharesCount: res.data.sharesCount } : r)
					}
				}));
			}
		} catch (err) {
			console.warn('Failed to record share for reel:', reelId, err);
		}
	}, [category]);

	const incrementCommentsCount = useCallback((reelId: string) => {
		const cat = category;
		setFeeds(prev => ({
			...prev,
			[cat]: {
				...prev[cat],
				reels: prev[cat].reels.map(r => r.id === reelId ? { ...r, commentsCount: r.commentsCount + 1 } : r)
			}
		}));
	}, [category]);

	useEffect(() => {
		loadFeed(initialCategory);
		
		return () => {
			Object.values(abortControllersRef.current).forEach(c => c.abort());
		};
	}, []);

	const currentFeedState = feeds[category] || INITIAL_CATEGORY_FEED;

	return {
		reels: currentFeedState.reels,
		category,
		loading: currentFeedState.loading,
		refreshing,
		error: currentFeedState.error,
		hasMore: currentFeedState.hasMore,
		activeIndex: currentFeedState.activeIndex,
		refresh,
		loadMore,
		changeCategory,
		setActiveIndex,
		toggleLike,
		recordView,
		recordShare,
		incrementCommentsCount,
	};
}
