import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
	Alert,
	Platform,
	useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useReelCreation } from '../../context/ReelCreationContext';
import { generateVideoThumbnail } from '../../services/videoMetadataService';

export default function AddCoverScreen() {
	const navigation = useNavigation<any>();
	const { reelData, updateReelData } = useReelCreation();
	const { width: screenWidth } = useWindowDimensions();

	// Use temporary local state so user can cancel
	const [tempCover, setTempCover] = useState<string | null>(
		reelData.selectedCover || reelData.videoThumbnail
	);
	
	const [frames, setFrames] = useState<string[]>([]);
	const [loadingFrames, setLoadingFrames] = useState(false);

	// Generate 6 frames evenly distributed across the video duration
	useEffect(() => {
		let isMounted = true;
		
		const generateFrames = async () => {
			if (!reelData.videoUri) return;
			setLoadingFrames(true);
			
			const durationMs = reelData.duration || 5000; // default 5s if 0
			const frameCount = 6;
			const generatedFrames: string[] = [];

			try {
				// Generate frame at 0ms (first frame) as the baseline if not already generated
				if (reelData.videoThumbnail) {
					generatedFrames.push(reelData.videoThumbnail);
				} else {
					const firstThumb = await generateVideoThumbnail(reelData.videoUri, 0);
					if (firstThumb) {
						generatedFrames.push(firstThumb);
						// Cache it in context as well
						updateReelData({ videoThumbnail: firstThumb });
					}
				}

				// Generate the remaining frames at regular intervals
				for (let i = 1; i < frameCount; i++) {
					if (!isMounted) return;
					// E.g. at 20%, 40%, 60%, 80%, 95% of duration
					const timestamp = Math.floor((i / (frameCount - 1)) * durationMs * 0.95);
					const frameUri = await generateVideoThumbnail(reelData.videoUri, timestamp);
					if (frameUri && isMounted) {
						generatedFrames.push(frameUri);
					}
				}
				
				if (isMounted) {
					setFrames(generatedFrames);
				}
			} catch (err) {
				console.error('[AddCoverScreen] Error generating cover frames:', err);
			} finally {
				if (isMounted) {
					setLoadingFrames(false);
				}
			}
		};

		generateFrames();

		return () => {
			isMounted = false;
		};
	}, [reelData.videoUri, reelData.duration]);

	const handleChooseFromGallery = async () => {
		try {
			const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
			if (!permission.granted) {
				Alert.alert('Permission Denied', 'We need access to your gallery to select a cover.');
				return;
			}

			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ImagePicker.MediaTypeOptions.Images,
				allowsEditing: true,
				quality: 0.8,
			});

			if (!result.canceled && result.assets?.[0]) {
				setTempCover(result.assets[0].uri);
			}
		} catch (err) {
			console.error('Error selecting cover:', err);
			Alert.alert('Error', 'Failed to select cover image');
		}
	};

	const handleSave = () => {
		if (tempCover) {
			// Save selection back to the context
			updateReelData({ selectedCover: tempCover });
		}
		navigation.goBack();
	};

	// Determine cover preview width & height based on aspect ratio
	const previewWidth = screenWidth - 64;
	const previewHeight = Math.round(previewWidth * 1.4);

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
					<Ionicons name="arrow-back" size={24} color="#1A1A1A" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Choose Cover</Text>
				<TouchableOpacity onPress={handleSave} style={styles.saveButton}>
					<Text style={styles.saveButtonText}>Save</Text>
				</TouchableOpacity>
			</View>

			<ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
				{/* Large Preview */}
				<View style={styles.previewContainer}>
					{tempCover ? (
						<Image
							source={{ uri: tempCover }}
							style={[styles.previewImage, { width: previewWidth, height: previewHeight }]}
							contentFit="cover"
							cachePolicy="memory-disk"
						/>
					) : (
						<View style={[styles.placeholderPreview, { width: previewWidth, height: previewHeight }]}>
							<ActivityIndicator size="large" color="#FF2D55" />
							<Text style={styles.placeholderText}>Loading video preview...</Text>
						</View>
					)}
				</View>

				{/* Frame Selector Section */}
				<View style={styles.sectionContainer}>
					<Text style={styles.sectionTitle}>Select a frame from your video</Text>
					{loadingFrames && frames.length === 0 ? (
						<View style={styles.loadingContainer}>
							<ActivityIndicator size="small" color="#FF2D55" />
							<Text style={styles.loadingText}>Generating frames...</Text>
						</View>
					) : (
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={styles.framesScroll}
						>
							{frames.map((frameUri, index) => {
								const isSelected = tempCover === frameUri;
								return (
									<TouchableOpacity
										key={index}
										onPress={() => setTempCover(frameUri)}
										style={[
											styles.frameWrapper,
											isSelected && styles.frameWrapperSelected,
										]}
									>
										<Image
											source={{ uri: frameUri }}
											style={styles.frameImage}
											contentFit="cover"
											cachePolicy="memory-disk"
										/>
									</TouchableOpacity>
								);
							})}
						</ScrollView>
					)}
				</View>

				{/* Select from Gallery Button */}
				<TouchableOpacity style={styles.galleryButton} onPress={handleChooseFromGallery}>
					<Ionicons name="images-outline" size={20} color="#FF2D55" />
					<Text style={styles.galleryButtonText}>Choose from Gallery</Text>
				</TouchableOpacity>
			</ScrollView>
		</View>
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
	headerBtn: {
		padding: 4,
	},
	headerTitle: {
		color: '#1A1A1A',
		fontSize: 18,
		fontWeight: '700',
	},
	saveButton: {
		backgroundColor: '#FF2D55',
		paddingHorizontal: 16,
		paddingVertical: 6,
		borderRadius: 16,
	},
	saveButtonText: {
		color: '#FFF',
		fontWeight: '600',
		fontSize: 14,
	},
	scrollContent: {
		paddingBottom: 40,
	},
	previewContainer: {
		alignItems: 'center',
		marginVertical: 20,
	},
	previewImage: {
		borderRadius: 16,
		backgroundColor: '#F5F5F5',
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 4 },
		elevation: 5,
	},
	placeholderPreview: {
		borderRadius: 16,
		backgroundColor: '#F5F5F5',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 12,
	},
	placeholderText: {
		color: '#999999',
		fontSize: 14,
	},
	sectionContainer: {
		marginTop: 10,
		paddingHorizontal: 16,
	},
	sectionTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1A1A1A',
		marginBottom: 12,
	},
	loadingContainer: {
		height: 84,
		justifyContent: 'center',
		alignItems: 'center',
		gap: 8,
		backgroundColor: '#F9F9F9',
		borderRadius: 12,
	},
	loadingText: {
		color: '#999999',
		fontSize: 12,
	},
	framesScroll: {
		gap: 8,
		paddingVertical: 4,
	},
	frameWrapper: {
		width: 60,
		height: 84,
		borderRadius: 8,
		borderWidth: 2,
		borderColor: 'transparent',
		overflow: 'hidden',
		backgroundColor: '#F5F5F5',
	},
	frameWrapperSelected: {
		borderColor: '#FF2D55',
	},
	frameImage: {
		width: '100%',
		height: '100%',
	},
	galleryButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 24,
		marginHorizontal: 16,
		paddingVertical: 14,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#FF2D55',
		backgroundColor: 'rgba(255, 45, 85, 0.04)',
		gap: 8,
	},
	galleryButtonText: {
		color: '#FF2D55',
		fontSize: 15,
		fontWeight: '600',
	},
});
