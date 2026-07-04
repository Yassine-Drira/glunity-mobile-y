import React, { useState, useRef, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	useWindowDimensions,
	ActivityIndicator,
	Alert,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useReelCreation, TaggedUser } from '../../context/ReelCreationContext';
import { TagPeopleModal } from '../components/TagPeopleModal';
import { extractDurationFromVideoStatus, generateVideoThumbnail, formatDuration } from '../../services/videoMetadataService';

// Step Progress Indicator Component
function StepIndicator({ currentStep }: { currentStep: 'capture' | 'edit' | 'share' }) {
	const steps = [
		{ id: 'capture', label: 'Capture' },
		{ id: 'edit', label: 'Edit' },
		{ id: 'share', label: 'Share' },
	];

	return (
		<View style={styles.stepContainer}>
			{steps.map((step, index) => (
				<React.Fragment key={step.id}>
					<View style={{ alignItems: 'center' }}>
						<View
							style={[
								styles.stepCircle,
								currentStep === step.id
									? styles.stepCircleActive
									: styles.stepCircleInactive,
							]}
						>
							<Ionicons
								name={
									step.id === 'capture'
										? 'camera'
										: step.id === 'edit'
											? 'pencil'
											: 'share-social'
								}
								size={24}
								color={
									currentStep === step.id
										? '#FFFFFF'
										: '#666666'
								}
							/>
						</View>
						<Text
							style={[
								styles.stepLabel,
								currentStep === step.id
									? styles.stepLabelActive
									: styles.stepLabelInactive,
							]}
						>
							{step.label}
						</Text>
					</View>
					{index < steps.length - 1 && (
						<View
							style={[
								styles.stepLine,
								currentStep === step.id || currentStep === steps[index + 1].id
									? styles.stepLineActive
									: styles.stepLineInactive,
							]}
						/>
					)}
				</React.Fragment>
			))}
		</View>
	);
}

export default function EditScreen() {
	const navigation = useNavigation<any>();
	const isFocused = useIsFocused();
	const { reelData, updateReelData } = useReelCreation();
	const { width: screenWidth } = useWindowDimensions();

	const [loadingThumbnail, setLoadingThumbnail] = useState(!reelData.videoThumbnail);
	const [videoDuration, setVideoDuration] = useState(
		reelData.duration ? formatDuration(reelData.duration) : '0:00'
	);
	const [tagModalVisible, setTagModalVisible] = useState(false);

	const videoRef = useRef<Video>(null);

	// Sync duration formatting if updated
	useEffect(() => {
		if (reelData.duration) {
			setVideoDuration(formatDuration(reelData.duration));
		}
	}, [reelData.duration]);

	// When video URI is first set, start thumbnail generation
	useEffect(() => {
		if (reelData.videoUri && !reelData.videoThumbnail) {
			console.log('[EditScreen] Video URI set, thumbnail will be generated when video loads');
			setLoadingThumbnail(true);
		}
	}, [reelData.videoUri]);

	// Handle video load - extract duration and generate thumbnail
	const handleVideoLoad = async () => {
		console.log('[EditScreen] Video onLoad fired, extracting duration and generating thumbnail...');

		try {
			if (!videoRef.current) {
				console.warn('[EditScreen] videoRef is null');
				return;
			}

			// Get the actual status from the Video ref
			const videoStatus = await videoRef.current.getStatusAsync();
			console.log('[EditScreen] Got video status from ref:', videoStatus);

			// Extract duration
			const durationResult = extractDurationFromVideoStatus(videoStatus);
			if (durationResult) {
				console.log('[EditScreen] Duration extracted:', durationResult.durationFormatted);
				setVideoDuration(durationResult.durationFormatted);
				updateReelData({ duration: durationResult.durationMs });
			} else {
				console.warn('[EditScreen] Failed to extract duration');
				setVideoDuration('0:00');
			}

			// Generate thumbnail from video first frame
			if (!reelData.videoThumbnail && reelData.videoUri) {
				console.log('[EditScreen] Generating thumbnail from video...');
				const thumbnailUri = await generateVideoThumbnail(reelData.videoUri, 0);

				if (thumbnailUri) {
					console.log('[EditScreen] Thumbnail generated successfully:', thumbnailUri);
					updateReelData({ videoThumbnail: thumbnailUri });
					setLoadingThumbnail(false);
				} else {
					console.error('[EditScreen] Failed to generate thumbnail');
					setLoadingThumbnail(false);
				}
			} else {
				setLoadingThumbnail(false);
			}
		} catch (error) {
			console.error('[EditScreen] Error in handleVideoLoad:', error);
			setLoadingThumbnail(false);
			setVideoDuration('0:00');
		}
	};

	const handleSelectCover = () => {
		navigation.navigate('ReelAddCover');
	};

	const handleTagPeople = () => {
		setTagModalVisible(true);
	};

	if (!reelData.videoUri) {
		return (
			<View style={styles.container}>
				<Text style={{ color: '#1A1A1A', textAlign: 'center', marginTop: 50 }}>
					No video selected
				</Text>
			</View>
		);
	}

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			style={styles.container}
			keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
		>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity
					onPress={() => {
						updateReelData({ 
							videoUri: null, 
							videoDimensions: null,
							videoThumbnail: null,
							selectedCover: null,
						});
						navigation.goBack();
					}}
				>
					<Ionicons name="close" size={28} color="#1A1A1A" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Edit Reel</Text>
				<TouchableOpacity
					onPress={() => navigation.navigate('ReelShare')}
					style={styles.nextButton}
				>
					<Text style={styles.nextButtonText}>Next</Text>
				</TouchableOpacity>
			</View>

			{/* Step Indicator */}
			<StepIndicator currentStep="edit" />

			{/* Scrollable Content */}
			<ScrollView
				contentContainerStyle={styles.scrollContent}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{/* Video Preview & Caption Section - Horizontal Layout */}
				<View style={styles.previewCaptionRow}>
					{/* Video Thumbnail - Left */}
					<View style={styles.thumbnailWrapper}>
						{/* Priority: 1. Selected cover, 2. Generated thumbnail, 3. Loading indicator, 4. Placeholder */}
						{reelData.selectedCover ? (
							// User selected a custom cover
							<Image
								source={{ uri: reelData.selectedCover }}
								style={styles.thumbnail}
								contentFit="cover"
								cachePolicy="memory-disk"
							/>
						) : reelData.videoThumbnail ? (
							// Generated thumbnail from first frame
							<Image
								source={{ uri: reelData.videoThumbnail }}
								style={styles.thumbnail}
								contentFit="cover"
								cachePolicy="memory-disk"
								onError={(error: any) => {
									console.error('[EditScreen] Thumbnail Image error:', error);
								}}
								onLoad={() => {
									console.log('[EditScreen] Thumbnail Image loaded successfully');
									setLoadingThumbnail(false);
								}}
							/>
						) : loadingThumbnail ? (
							// Still loading/generating thumbnail
							<View style={[styles.thumbnail, styles.loadingThumbnail]}>
								<ActivityIndicator size="small" color="#FF2D55" />
							</View>
						) : (
							// Placeholder if no thumbnail available
							<View style={[styles.thumbnail, styles.loadingThumbnail]}>
								<Text style={{ color: '#CCCCCC', fontSize: 12 }}>No thumbnail</Text>
							</View>
						)}
						
						{/* Duration Badge */}
						<View style={styles.durationBadge}>
							<Text style={styles.durationText}>{videoDuration}</Text>
						</View>

						{/* Remove Button */}
						<TouchableOpacity
							style={styles.removeVideoBtn}
							onPress={() => {
								updateReelData({ 
									videoUri: null, 
									videoDimensions: null,
									videoThumbnail: null,
									selectedCover: null,
								});
								navigation.goBack();
							}}
						>
							<Ionicons name="close-circle" size={24} color="#FF2D55" />
						</TouchableOpacity>
					</View>

					{/* Caption Section - Right */}
					<View style={styles.captionSection}>
						<Text style={styles.captionLabel}>Add Caption</Text>
						<TextInput
							value={reelData.caption}
							onChangeText={(text) => updateReelData({ caption: text })}
							placeholder="Write a caption..."
							placeholderTextColor="#CCCCCC"
							multiline
							numberOfLines={4}
							maxLength={220}
							style={styles.captionInput}
						/>
						<Text style={styles.charCount}>
							{reelData.caption.length}/220
						</Text>
					</View>
				</View>

				{/* Add Cover Section */}
				<TouchableOpacity style={styles.sectionItem} onPress={handleSelectCover}>
					<Ionicons name="image-outline" size={20} color="#999999" />
					<View style={styles.sectionItemContent}>
						<Text style={styles.sectionItemTitle}>
							{reelData.selectedCover ? 'Change Cover' : 'Add Cover'}
						</Text>
						<Text style={styles.sectionItemSubtitle}>
							{reelData.selectedCover 
								? 'Tap to select a different cover'
								: 'Choose a cover image for your reel'
							}
						</Text>
					</View>
					<Ionicons name="chevron-forward" size={20} color="#999999" />
				</TouchableOpacity>

				{/* Tag People Section */}
				<TouchableOpacity style={styles.sectionItem} onPress={handleTagPeople}>
					<Ionicons name="people-outline" size={20} color="#999999" />
					<View style={styles.sectionItemContent}>
						<Text style={styles.sectionItemTitle}>Tag People</Text>
						<Text style={styles.sectionItemSubtitle}>
							{reelData.taggedUsers.length > 0 
								? `${reelData.taggedUsers.length} person tagged`
								: 'Add people to your reel'
							}
						</Text>
					</View>
					<Ionicons name="chevron-forward" size={20} color="#999999" />
				</TouchableOpacity>

				{/* Show tagged users */}
				{reelData.taggedUsers.length > 0 && (
					<View style={styles.taggedUsersContainer}>
						<Text style={styles.taggedUsersLabel}>Tagged People:</Text>
						<View style={styles.taggedUsersList}>
							{reelData.taggedUsers.map((user) => (
								<View key={user.id} style={styles.taggedUserChip}>
									<Text style={styles.taggedUserName} numberOfLines={1}>
										{user.fullName}
									</Text>
									<TouchableOpacity
										onPress={() => {
											const updated = reelData.taggedUsers.filter(u => u.id !== user.id);
											updateReelData({ taggedUsers: updated });
										}}
										style={styles.removeTagBtn}
									>
										<Ionicons name="close" size={14} color="#FF2D55" />
									</TouchableOpacity>
								</View>
							))}
						</View>
					</View>
				)}

				{/* Category Selection */}
				<View style={styles.sectionContainer}>
					<View style={styles.categoryHeaderRow}>
						<Text style={styles.categoryTitle}>Category</Text>
						<Text style={styles.selectedCategory}>
							{reelData.category.charAt(0).toUpperCase() + reelData.category.slice(1)}
						</Text>
					</View>

					<Text style={styles.popularCategoriesLabel}>Popular Categories</Text>
					<View style={styles.categoryRow}>
						{((['recipes', 'tips', 'products', 'lifestyle'] as const)).map((cat) => {
							const isActive = reelData.category === cat;
							return (
								<TouchableOpacity
									key={cat}
									style={[
										styles.catButton,
										isActive ? styles.catButtonActive : styles.catButtonInactive,
									]}
									onPress={() => updateReelData({ category: cat })}
								>
									<Text
										style={[
											styles.catText,
											isActive ? styles.catTextActive : styles.catTextInactive,
										]}
									>
										{cat.charAt(0).toUpperCase() + cat.slice(1)}
									</Text>
								</TouchableOpacity>
							);
						})}
					</View>
				</View>

				{/* Spacer for bottom button */}
				<View style={{ height: 24 }} />
			</ScrollView>

			{/* Tag People Modal */}
			<TagPeopleModal
				visible={tagModalVisible}
				selectedUsers={reelData.taggedUsers}
				onClose={() => setTagModalVisible(false)}
				onSubmit={(users) => {
					updateReelData({ taggedUsers: users });
				}}
			/>

			{/* Video component to extract metadata via onLoad callback */}
			{/* This is rendered but positioned off-screen and very small */}
			{reelData.videoUri && (
				<Video
					ref={videoRef}
					source={{ uri: reelData.videoUri }}
					onLoad={() => {
						// Call the async handler - don't await here to avoid blocking
						handleVideoLoad().catch((err) =>
							console.error('[EditScreen] Error in handleVideoLoad:', err)
						);
					}}
					onError={(error: any) => {
						console.error('[EditScreen] Video loading error:', error);
						setLoadingThumbnail(false);
					}}
					style={{
						position: 'absolute',
						width: 1,
						height: 1,
						opacity: 0,
						left: -9999,
					}}
					useNativeControls={false}
					shouldPlay={false}
					isLooping={false}
					progressUpdateIntervalMillis={1000}
				/>
			)}
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#FFFFFF',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingTop: Platform.OS === 'ios' ? 50 : 20,
		paddingBottom: 12,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(0,0,0,0.08)',
	},
	headerTitle: {
		color: '#1A1A1A',
		fontSize: 18,
		fontWeight: '700',
	},
	nextButton: {
		backgroundColor: '#FF2D55',
		paddingHorizontal: 16,
		paddingVertical: 6,
		borderRadius: 16,
	},
	nextButtonText: {
		color: '#FFF',
		fontWeight: '600',
		fontSize: 14,
	},
	// Step Indicator Styles
	stepContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 16,
		paddingHorizontal: 16,
		gap: 12,
	},
	stepCircle: {
		width: 36,
		height: 36,
		borderRadius: 18,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 2,
	},
	stepCircleActive: {
		backgroundColor: '#FF2D55',
		borderColor: '#FF2D55',
	},
	stepCircleInactive: {
		backgroundColor: 'transparent',
		borderColor: '#DDDDDD',
	},
	stepLabel: {
		fontSize: 10,
		fontWeight: '600',
		marginTop: 4,
	},
	stepLabelActive: {
		color: '#FF2D55',
	},
	stepLabelInactive: {
		color: '#999999',
	},
	stepLine: {
		height: 2,
		flex: 1,
		maxWidth: 36,
	},
	stepLineActive: {
		backgroundColor: '#FF2D55',
	},
	stepLineInactive: {
		backgroundColor: '#DDDDDD',
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingVertical: 16,
	},
	// Preview & Caption Row
	previewCaptionRow: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: 20,
		alignItems: 'flex-start',
	},
	thumbnailWrapper: {
		position: 'relative',
	},
	thumbnail: {
		width: 100,
		height: 140,
		borderRadius: 12,
		backgroundColor: '#F5F5F5',
		overflow: 'hidden',
	},
	loadingThumbnail: {
		justifyContent: 'center',
		alignItems: 'center',
	},
	durationBadge: {
		position: 'absolute',
		bottom: 6,
		right: 6,
		backgroundColor: 'rgba(0, 0, 0, 0.7)',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
	},
	durationText: {
		color: '#FFFFFF',
		fontSize: 10,
		fontWeight: '600',
	},
	removeVideoBtn: {
		position: 'absolute',
		top: -8,
		right: -8,
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		padding: 2,
	},
	captionSection: {
		flex: 1,
	},
	captionLabel: {
		color: '#1A1A1A',
		fontSize: 13,
		fontWeight: '600',
		marginBottom: 6,
	},
	captionInput: {
		backgroundColor: '#F9F9F9',
		borderRadius: 12,
		padding: 10,
		color: '#1A1A1A',
		fontSize: 14,
		minHeight: 100,
		textAlignVertical: 'top',
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.1)',
		marginBottom: 4,
	},
	charCount: {
		color: '#999999',
		fontSize: 11,
		textAlign: 'right',
	},
	// Section Items (Add Cover, Tag People)
	sectionItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 14,
		paddingHorizontal: 12,
		marginBottom: 12,
		backgroundColor: 'transparent',
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(0,0,0,0.08)',
	},
	sectionItemContent: {
		flex: 1,
		marginLeft: 12,
	},
	sectionItemTitle: {
		color: '#1A1A1A',
		fontSize: 14,
		fontWeight: '600',
		marginBottom: 2,
	},
	sectionItemSubtitle: {
		color: '#999999',
		fontSize: 12,
	},
	// Tagged Users
	taggedUsersContainer: {
		marginBottom: 16,
		paddingHorizontal: 12,
		paddingVertical: 12,
		backgroundColor: 'rgba(255, 45, 85, 0.05)',
		borderRadius: 12,
	},
	taggedUsersLabel: {
		color: '#1A1A1A',
		fontSize: 13,
		fontWeight: '600',
		marginBottom: 8,
	},
	taggedUsersList: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	taggedUserChip: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FF2D55',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 16,
		gap: 6,
	},
	taggedUserName: {
		color: '#FFFFFF',
		fontSize: 12,
		fontWeight: '600',
		maxWidth: 80,
	},
	removeTagBtn: {
		padding: 2,
	},
	// Section Containers
	sectionContainer: {
		marginBottom: 20,
	},
	// Category Selection
	categoryHeaderRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	categoryTitle: {
		color: '#1A1A1A',
		fontSize: 14,
		fontWeight: '600',
	},
	selectedCategory: {
		color: '#FF2D55',
		fontSize: 14,
		fontWeight: '600',
	},
	popularCategoriesLabel: {
		color: '#999999',
		fontSize: 12,
		fontWeight: '500',
		marginBottom: 10,
	},
	categoryRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	catButton: {
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.15)',
	},
	catButtonActive: {
		backgroundColor: '#FF2D55',
		borderColor: '#FF2D55',
	},
	catButtonInactive: {
		backgroundColor: '#F5F5F5',
	},
	catText: {
		fontSize: 13,
		fontWeight: '600',
	},
	catTextActive: {
		color: '#FFF',
	},
	catTextInactive: {
		color: '#333333',
	},
});
