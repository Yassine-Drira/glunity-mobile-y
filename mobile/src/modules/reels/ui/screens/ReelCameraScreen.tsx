import React, { useState, useRef } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	Alert,
	Modal
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode, Audio } from 'expo-av';
import axios from 'axios';
import { ReelsService } from '../../services/reels.service';
import { useTheme } from '../../../../shared/context/theme.context';

const MOCK_MUSIC_LIBRARY = [
	{ id: '1', title: 'Gluten-Free Grooves', artist: 'DJ Celic', duration: '2:30', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
	{ id: '2', title: 'Kitchen Chill Beats', artist: 'Lofi Baker', duration: '3:15', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
	{ id: '3', title: 'Energetic Cooking', artist: 'Chef Pop', duration: '2:45', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
	{ id: '4', title: 'Healthy Vibes Only', artist: 'Acoustic Soul', duration: '3:02', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
];

export default function ReelCameraScreen() {
	const navigation = useNavigation<any>();
	const { theme: T } = useTheme();
	
	const [videoUri, setVideoUri] = useState<string | null>(null);
	const [caption, setCaption] = useState('');
	const [category, setCategory] = useState<'recipes' | 'tips' | 'products' | 'lifestyle'>('recipes');
	const [uploading, setUploading] = useState(false);
	const [progress, setProgress] = useState('');

	// Audio & Music States
	const [musicModalVisible, setMusicModalVisible] = useState(false);
	const [selectedMusic, setSelectedMusic] = useState<any | null>(null);
	const [videoVolume, setVideoVolume] = useState(1.0);
	const [musicVolume, setMusicVolume] = useState(0.5);
	const [isMuted, setIsMuted] = useState(false);

	// Success Overlay States
	const [showSuccessModal, setShowSuccessModal] = useState(false);
	const [successCountdown, setSuccessCountdown] = useState(3);

	const soundRef = useRef<Audio.Sound | null>(null);

	// Load & play background music during preview
	React.useEffect(() => {
		let isMounted = true;
		const loadAndPlayMusic = async () => {
			if (videoUri && selectedMusic?.url) {
				try {
					if (soundRef.current) {
						await soundRef.current.unloadAsync();
					}
					const { sound } = await Audio.Sound.createAsync(
						{ uri: selectedMusic.url },
						{ shouldPlay: true, isLooping: true, volume: musicVolume }
					);
					if (isMounted) {
						soundRef.current = sound;
					} else {
						await sound.unloadAsync();
					}
				} catch (err) {
					console.warn('Failed to load preview music:', err);
				}
			}
		};

		if (videoUri && selectedMusic?.url) {
			loadAndPlayMusic();
		} else {
			if (soundRef.current) {
				soundRef.current.stopAsync().catch(() => {});
			}
		}

		return () => {
			isMounted = false;
			if (soundRef.current) {
				soundRef.current.unloadAsync().catch(() => {});
				soundRef.current = null;
			}
		};
	}, [videoUri, selectedMusic, musicVolume]);

	const pickVideo = async () => {
		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (!permission.granted) {
			Alert.alert('Permission Denied', 'We need access to your gallery to pick a video.');
			return;
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Videos,
			allowsEditing: true,
			quality: 1,
		});

		if (!result.canceled && result.assets?.[0]) {
			setVideoUri(result.assets[0].uri);
		}
	};

	const recordVideo = async () => {
		const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
		const audioPermission = await Audio.requestPermissionsAsync();
		
		if (!cameraPermission.granted || !audioPermission.granted) {
			Alert.alert('Permission Denied', 'We need camera and audio permissions to record a video.');
			return;
		}

		const result = await ImagePicker.launchCameraAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Videos,
			allowsEditing: true,
			quality: 1,
		});

		if (!result.canceled && result.assets?.[0]) {
			setVideoUri(result.assets[0].uri);
		}
	};

	const handlePost = async () => {
		if (!videoUri || uploading) return;
		setUploading(true);
		setProgress('Preparing video...');

		try {
			// 1. Get signed signature from backend
			setProgress('Requesting upload credentials...');
			const sigRes = await ReelsService.getUploadSignature();
			
			if (!sigRes.success) {
				throw new Error('Failed to fetch signature');
			}

			const sigData = sigRes.data;
			let finalVideoUrl = '';
			let finalThumbnailUrl = '';

			let videoFile: any;
			const filename = videoUri.split('/').pop() || 'reel_upload.mp4';

			if (Platform.OS === 'web' || (typeof videoUri === 'string' && videoUri.startsWith('blob:'))) {
				try {
					const blobResp = await fetch(videoUri);
					const blob = await blobResp.blob();
					videoFile = typeof File !== 'undefined' ? new File([blob], filename, { type: blob.type || 'video/mp4' }) : blob;
				} catch (e) {
					console.warn('Failed to convert blob', e);
					videoFile = {
						uri: videoUri,
						type: 'video/mp4',
						name: filename,
					};
				}
			} else {
				videoFile = {
					uri: videoUri,
					type: 'video/mp4',
					name: filename,
				};
			}

			if (sigData.isLocalFallback) {
				// 2a. Fallback to local upload
				setProgress('Uploading video to backend server...');
				const localFormData = new FormData();
				localFormData.append('video', videoFile);
				
				const uploadRes = await ReelsService.uploadVideoLocal(localFormData);
				if (uploadRes.success) {
					finalVideoUrl = uploadRes.data.videoUrl;
					finalThumbnailUrl = uploadRes.data.thumbnailUrl;
				} else {
					throw new Error('Local upload failed');
				}
			} else {
				// 2b. Direct signed upload to Cloudinary (Option B)
				setProgress('Uploading video to CDN...');
				const cloudFormData = new FormData();
				cloudFormData.append('file', videoFile);
				cloudFormData.append('signature', sigData.signature!);
				cloudFormData.append('timestamp', String(sigData.timestamp!));
				cloudFormData.append('api_key', sigData.apiKey!);
				cloudFormData.append('folder', sigData.folder!);
				cloudFormData.append('eager', sigData.eager!);

				const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${sigData.cloudName}/video/upload`;
				const cloudRes = await axios.post(cloudinaryUrl, cloudFormData, {
					headers: {
						'Content-Type': 'multipart/form-data',
					},
				});

				const result = cloudRes.data;
				finalVideoUrl = result.secure_url || result.url;
				
				// Cloudinary auto-generates thumbnails. If eager transformation succeeded, use it, else replace extension
				if (result.eager && result.eager.length > 0) {
					// Use a smaller poster image from eager transformations if available
					finalThumbnailUrl = result.eager[0].secure_url || result.eager[0].url;
				} else {
					finalThumbnailUrl = finalVideoUrl.replace(/\.[^.]+$/, '.jpg');
				}
			}

			// 3. Create Reel document in Mongoose DB
			setProgress('Saving Reel metadata...');
			const createRes = await ReelsService.createReel({
				videoUrl: finalVideoUrl,
				thumbnailUrl: finalThumbnailUrl,
				caption: caption.trim(),
				duration: 0,
				category,
				audioTitle: selectedMusic?.title,
				audioArtist: selectedMusic?.artist,
				audioUrl: selectedMusic?.url,
			});

			if (createRes.success) {
				setShowSuccessModal(true);
				let countdown = 3;
				setSuccessCountdown(countdown);
				const interval = setInterval(() => {
					countdown -= 1;
					setSuccessCountdown(countdown);
					if (countdown <= 0) {
						clearInterval(interval);
						setShowSuccessModal(false);
						navigation.navigate('ReelsFeed');
					}
				}, 1000);
			}
		} catch (err: any) {
			console.error('[Upload Error]', err);
			Alert.alert('Upload Failed', err.message || 'An error occurred during video upload');
		} finally {
			setUploading(false);
			setProgress('');
		}
	};

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			style={styles.container}
		>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => navigation.goBack()}>
					<Ionicons name="close" size={28} color="#FFF" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Create Reel</Text>
				<TouchableOpacity 
					onPress={handlePost} 
					disabled={!videoUri || uploading}
					style={[styles.postButton, (!videoUri || uploading) && { opacity: 0.5 }]}
				>
					<Text style={styles.postButtonText}>Post</Text>
				</TouchableOpacity>
			</View>

			<ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
				{videoUri ? (
					<View style={styles.previewContainer}>
						<Video
							source={{ uri: videoUri }}
							resizeMode={ResizeMode.CONTAIN}
							shouldPlay
							isLooping
							isMuted={isMuted}
							volume={videoVolume}
							style={styles.previewVideo}
						/>
						<TouchableOpacity style={styles.changeBtn} onPress={() => setVideoUri(null)}>
							<Ionicons name="trash-outline" size={20} color="#FFF" />
							<Text style={styles.changeBtnText}>Remove Video</Text>
						</TouchableOpacity>
					</View>
				) : (
					<View style={styles.selectorContainer}>
						<Ionicons name="film-outline" size={80} color="#555" />
						<Text style={styles.selectorTitle}>Capture or Select Video</Text>
						<Text style={styles.selectorSubtitle}>Share your gluten-free journey in short video reels!</Text>
						
						<TouchableOpacity style={styles.selectBtn} onPress={pickVideo}>
							<Ionicons name="images-outline" size={22} color="#FFF" style={styles.btnIcon} />
							<Text style={styles.selectBtnText}>Choose from Gallery</Text>
						</TouchableOpacity>

						<TouchableOpacity style={[styles.selectBtn, { backgroundColor: '#FF2D55', marginTop: 12 }]} onPress={recordVideo}>
							<Ionicons name="videocam-outline" size={22} color="#FFF" style={styles.btnIcon} />
							<Text style={styles.selectBtnText}>Record with Camera</Text>
						</TouchableOpacity>
					</View>
				)}

				{videoUri && (
					<View style={styles.inputContainer}>
						<Text style={styles.inputLabel}>Category</Text>
						<View style={styles.categoryRow}>
							{((['recipes', 'tips', 'products', 'lifestyle'] as const)).map((cat) => {
								const isActive = category === cat;
								return (
									<TouchableOpacity
										key={cat}
										style={[
											styles.catButton,
											isActive ? styles.catButtonActive : styles.catButtonInactive
										]}
										onPress={() => setCategory(cat)}
									>
										<Text style={[
											styles.catText,
											isActive ? styles.catTextActive : styles.catTextInactive
										]}>
											{cat.charAt(0).toUpperCase() + cat.slice(1)}
										</Text>
									</TouchableOpacity>
								);
							})}
						</View>

						{/* Audio & Music controls */}
						<View style={styles.audioSection}>
							<Text style={styles.audioTitle}>Audio & Music</Text>
							
							<View style={styles.musicSelectorRow}>
								{selectedMusic ? (
									<View style={styles.selectedMusicContainer}>
										<Ionicons name="musical-notes" size={18} color="#6DAE3F" style={{ marginRight: 8 }} />
										<View style={{ flex: 1 }}>
											<Text style={styles.musicTitleText} numberOfLines={1}>
												{selectedMusic.title}
											</Text>
											<Text style={styles.musicSubtitleText} numberOfLines={1}>
												{selectedMusic.artist}
											</Text>
										</View>
										<TouchableOpacity onPress={() => setSelectedMusic(null)} style={styles.musicRemoveBtn}>
											<Ionicons name="close-circle" size={20} color="#FF2D55" />
										</TouchableOpacity>
									</View>
								) : (
									<TouchableOpacity style={styles.addMusicBtn} onPress={() => setMusicModalVisible(true)}>
										<Ionicons name="musical-notes-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
										<Text style={styles.addMusicBtnText}>Add Background Music</Text>
									</TouchableOpacity>
								)}
							</View>

							{/* Original Audio Volume Control */}
							<View style={styles.volumeControlRow}>
								<View style={styles.volumeLabelRow}>
									<Ionicons name={isMuted ? "volume-mute-outline" : "volume-medium-outline"} size={16} color="#FFF" style={{ marginRight: 6 }} />
									<Text style={styles.volumeLabel}>Original Video Audio</Text>
								</View>
								<View style={styles.volumeSliderContainer}>
									<TouchableOpacity onPress={() => setIsMuted(!isMuted)} style={styles.muteBtn}>
										<Text style={[styles.muteBtnText, isMuted && styles.muteBtnTextActive]}>
											{isMuted ? "Muted" : "Mute"}
										</Text>
									</TouchableOpacity>
									
									<View style={styles.segmentContainer}>
										{[0.0, 0.2, 0.4, 0.6, 0.8, 1.0].map((step, idx) => {
											const isFilled = !isMuted && videoVolume >= step - 0.05;
											return (
												<TouchableOpacity 
													key={idx}
													onPress={() => {
														setIsMuted(false);
														setVideoVolume(step);
													}}
													style={[
														styles.volumeSegment,
														isFilled ? styles.volumeSegmentActive : styles.volumeSegmentInactive
													]}
												/>
											);
										})}
									</View>
									<Text style={styles.volumeValueText}>{isMuted ? "0" : Math.round(videoVolume * 100)}%</Text>
								</View>
							</View>

							{/* Background Music Volume Control (only if music selected) */}
							{selectedMusic && (
								<View style={styles.volumeControlRow}>
									<View style={styles.volumeLabelRow}>
										<Ionicons name="musical-note-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
										<Text style={styles.volumeLabel}>Music Volume</Text>
									</View>
									<View style={styles.volumeSliderContainer}>
										<View style={{ width: 50 }} /> 
										<View style={styles.segmentContainer}>
											{[0.0, 0.2, 0.4, 0.6, 0.8, 1.0].map((step, idx) => {
												const isFilled = musicVolume >= step - 0.05;
												return (
													<TouchableOpacity 
														key={idx}
														onPress={() => setMusicVolume(step)}
														style={[
															styles.volumeSegment,
															isFilled ? styles.volumeSegmentActive : styles.volumeSegmentInactive
														]}
													/>
												);
											})}
										</View>
										<Text style={styles.volumeValueText}>{Math.round(musicVolume * 100)}%</Text>
									</View>
								</View>
							)}
						</View>

						<Text style={[styles.inputLabel, { marginTop: 20 }]}>Caption</Text>
						<TextInput
							value={caption}
							onChangeText={setCaption}
							placeholder="Write a caption... #glutenfree #celiac"
							placeholderTextColor="#8A8A8E"
							multiline
							numberOfLines={3}
							style={styles.captionInput}
						/>
					</View>
				)}
			</ScrollView>

			{uploading && (
				<View style={styles.loadingOverlay}>
					<ActivityIndicator size="large" color="#6DAE3F" />
					<Text style={styles.loadingText}>{progress}</Text>
				</View>
			)}

			{/* Success Popup Modal */}
			<Modal
				visible={showSuccessModal}
				transparent
				animationType="fade"
			>
				<View style={styles.successOverlay}>
					<View style={styles.successCard}>
						<Ionicons name="checkmark-circle" size={80} color="#6DAE3F" style={{ marginBottom: 16 }} />
						<Text style={styles.successTitle}>Reel Posted Successfully! 🎉</Text>
						<Text style={styles.successSubtitle}>Your video is now live on Glunity Reels.</Text>
						<Text style={styles.successRedirect}>Redirecting to Feed in {successCountdown}s...</Text>
						<TouchableOpacity 
							style={styles.successBtn}
							onPress={() => {
								setShowSuccessModal(false);
								navigation.navigate('ReelsFeed');
							}}
						>
							<Text style={styles.successBtnText}>Go Now</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

			{/* Music Library Selection Modal */}
			<Modal
				visible={musicModalVisible}
				transparent
				animationType="slide"
				onRequestClose={() => setMusicModalVisible(false)}
			>
				<View style={styles.musicModalOverlay}>
					<View style={styles.musicModalContainer}>
						<View style={styles.musicModalHeader}>
							<Text style={styles.musicModalTitle}>Add Music</Text>
							<TouchableOpacity onPress={() => setMusicModalVisible(false)}>
								<Ionicons name="close" size={24} color="#FFF" />
							</TouchableOpacity>
						</View>

						<ScrollView contentContainerStyle={styles.musicList}>
							{MOCK_MUSIC_LIBRARY.map((track) => {
								const isSelected = selectedMusic?.id === track.id;
								return (
									<TouchableOpacity
										key={track.id}
										style={[
											styles.musicTrackItem,
											isSelected && styles.musicTrackItemSelected
										]}
										onPress={() => {
											setSelectedMusic(track);
											setMusicModalVisible(false);
										}}
									>
										<View style={styles.musicIconCircle}>
											<Ionicons name="musical-notes" size={20} color="#6DAE3F" />
										</View>
										<View style={{ flex: 1 }}>
											<Text style={styles.musicTrackTitle}>{track.title}</Text>
											<Text style={styles.musicTrackArtist}>{track.artist} • {track.duration}</Text>
										</View>
										{isSelected && (
											<Ionicons name="checkmark" size={22} color="#6DAE3F" />
										)}
									</TouchableOpacity>
								);
							})}
						</ScrollView>
					</View>
				</View>
			</Modal>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#0D0D0F',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingTop: Platform.OS === 'ios' ? 50 : 20,
		paddingBottom: 12,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(255,255,255,0.1)',
	},
	headerTitle: {
		color: '#FFF',
		fontSize: 18,
		fontWeight: '700',
	},
	postButton: {
		backgroundColor: '#6DAE3F',
		paddingHorizontal: 16,
		paddingVertical: 6,
		borderRadius: 16,
	},
	postButtonText: {
		color: '#FFF',
		fontWeight: '600',
		fontSize: 14,
	},
	scrollContainer: {
		padding: 16,
		flexGrow: 1,
	},
	selectorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 40,
	},
	selectorTitle: {
		color: '#FFF',
		fontSize: 20,
		fontWeight: '700',
		marginTop: 20,
	},
	selectorSubtitle: {
		color: '#8A8A8E',
		fontSize: 14,
		textAlign: 'center',
		marginTop: 8,
		marginBottom: 30,
		paddingHorizontal: 30,
	},
	selectBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#6DAE3F',
		paddingVertical: 14,
		paddingHorizontal: 24,
		borderRadius: 12,
		width: '80%',
		justifyContent: 'center',
	},
	btnIcon: {
		marginRight: 10,
	},
	selectBtnText: {
		color: '#FFF',
		fontSize: 16,
		fontWeight: '600',
	},
	previewContainer: {
		height: 380,
		backgroundColor: '#000',
		borderRadius: 12,
		overflow: 'hidden',
		position: 'relative',
		marginBottom: 20,
	},
	previewVideo: {
		flex: 1,
	},
	changeBtn: {
		position: 'absolute',
		bottom: 12,
		right: 12,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'rgba(0,0,0,0.6)',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
	},
	changeBtnText: {
		color: '#FFF',
		fontSize: 12,
		marginLeft: 4,
	},
	inputContainer: {
		marginTop: 10,
	},
	inputLabel: {
		color: '#FFF',
		fontSize: 14,
		fontWeight: '600',
		marginBottom: 8,
	},
	captionInput: {
		backgroundColor: '#1A1A1D',
		borderRadius: 12,
		padding: 12,
		color: '#FFF',
		fontSize: 15,
		minHeight: 80,
		textAlignVertical: 'top',
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.1)',
	},
	categoryRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 10,
	},
	catButton: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.2)',
	},
	catButtonActive: {
		backgroundColor: '#6DAE3F',
		borderColor: '#6DAE3F',
	},
	catButtonInactive: {
		backgroundColor: '#1A1A1D',
	},
	catText: {
		fontSize: 13,
		fontWeight: '600',
	},
	catTextActive: {
		color: '#FFF',
	},
	catTextInactive: {
		color: '#8A8A8E',
	},
	loadingOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(0,0,0,0.8)',
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 1000,
	},
	loadingText: {
		color: '#FFF',
		marginTop: 16,
		fontSize: 14,
		fontWeight: '600',
	},
	// Success Modal Styles
	successOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.85)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 24,
	},
	successCard: {
		width: '100%',
		maxWidth: 340,
		backgroundColor: '#1C1C1E',
		borderRadius: 24,
		padding: 32,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.1)',
	},
	successTitle: {
		color: '#FFF',
		fontSize: 20,
		fontWeight: '800',
		textAlign: 'center',
		marginBottom: 8,
	},
	successSubtitle: {
		color: '#8A8A8E',
		fontSize: 14,
		textAlign: 'center',
		marginBottom: 20,
	},
	successRedirect: {
		color: '#6DAE3F',
		fontSize: 13,
		fontWeight: '600',
		marginBottom: 24,
	},
	successBtn: {
		backgroundColor: '#6DAE3F',
		paddingVertical: 12,
		paddingHorizontal: 32,
		borderRadius: 20,
		width: '100%',
		alignItems: 'center',
	},
	successBtnText: {
		color: '#FFF',
		fontWeight: '700',
		fontSize: 15,
	},
	// Music Modal Styles
	musicModalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.6)',
		justifyContent: 'flex-end',
	},
	musicModalContainer: {
		backgroundColor: '#1C1C1E',
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		maxHeight: '75%',
		paddingBottom: Platform.OS === 'ios' ? 34 : 20,
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.08)',
	},
	musicModalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingVertical: 18,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(255,255,255,0.08)',
	},
	musicModalTitle: {
		color: '#FFF',
		fontSize: 18,
		fontWeight: '700',
	},
	musicList: {
		padding: 16,
	},
	musicTrackItem: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#2C2C2E',
		padding: 14,
		borderRadius: 16,
		marginBottom: 10,
		borderWidth: 1,
		borderColor: 'transparent',
	},
	musicTrackItemSelected: {
		borderColor: '#6DAE3F',
		backgroundColor: 'rgba(109, 174, 63, 0.08)',
	},
	musicIconCircle: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: 'rgba(109, 174, 63, 0.15)',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	musicTrackTitle: {
		color: '#FFF',
		fontSize: 15,
		fontWeight: '600',
	},
	musicTrackArtist: {
		color: '#8A8A8E',
		fontSize: 12,
		marginTop: 2,
	},
	// Audio Section Styles
	audioSection: {
		backgroundColor: '#1A1A1D',
		borderRadius: 16,
		padding: 16,
		marginTop: 20,
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.08)',
	},
	audioTitle: {
		color: '#FFF',
		fontSize: 15,
		fontWeight: '700',
		marginBottom: 14,
	},
	musicSelectorRow: {
		marginBottom: 16,
	},
	addMusicBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#2C2C2E',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.08)',
	},
	addMusicBtnText: {
		color: '#FFF',
		fontSize: 14,
		fontWeight: '600',
	},
	selectedMusicContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'rgba(109, 174, 63, 0.08)',
		paddingVertical: 10,
		paddingHorizontal: 14,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#6DAE3F',
	},
	musicTitleText: {
		color: '#FFF',
		fontSize: 14,
		fontWeight: '600',
	},
	musicSubtitleText: {
		color: '#8A8A8E',
		fontSize: 11,
		marginTop: 1,
	},
	musicRemoveBtn: {
		padding: 4,
	},
	volumeControlRow: {
		marginBottom: 14,
	},
	volumeLabelRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	volumeLabel: {
		color: '#8A8A8E',
		fontSize: 13,
		fontWeight: '500',
	},
	volumeSliderContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	muteBtn: {
		backgroundColor: '#2C2C2E',
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: 8,
		width: 60,
		alignItems: 'center',
	},
	muteBtnText: {
		color: '#FFF',
		fontSize: 11,
		fontWeight: '600',
	},
	muteBtnTextActive: {
		color: '#FF2D55',
	},
	segmentContainer: {
		flex: 1,
		flexDirection: 'row',
		gap: 6,
		marginHorizontal: 12,
	},
	volumeSegment: {
		flex: 1,
		height: 8,
		borderRadius: 4,
	},
	volumeSegmentActive: {
		backgroundColor: '#6DAE3F',
	},
	volumeSegmentInactive: {
		backgroundColor: '#2C2C2E',
	},
	volumeValueText: {
		color: '#FFF',
		fontSize: 12,
		fontWeight: '600',
		width: 36,
		textAlign: 'right',
	},
});
