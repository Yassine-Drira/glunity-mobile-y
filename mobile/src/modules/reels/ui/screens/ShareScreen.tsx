import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Modal,
	ActivityIndicator,
	Alert,
	Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { ReelsService } from '../../services/reels.service';
import { useReelCreation } from '../../context/ReelCreationContext';
import http from '../../../../core/network/http.client';

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

export default function ShareScreen() {
	const navigation = useNavigation<any>();
	const { reelData, resetReelData } = useReelCreation();

	const [uploading, setUploading] = useState(false);
	const [progress, setProgress] = useState('');
	const [uploadedReelId, setUploadedReelId] = useState<string | null>(null);
	const [showSuccess, setShowSuccess] = useState(false);
	const [successCountdown, setSuccessCountdown] = useState(3);

	useEffect(() => {
		// Auto-start upload when screen loads
		handleUpload();
	}, []);

	// Auto-redirect to feed after success countdown
	useEffect(() => {
		if (showSuccess && successCountdown > 0) {
			const timer = setTimeout(() => {
				setSuccessCountdown((prev) => prev - 1);
			}, 1000);
			return () => clearTimeout(timer);
		} else if (showSuccess && successCountdown <= 0) {
			// Navigate to feed and open the newly uploaded reel
			resetReelData();
			if (uploadedReelId) {
				navigation.navigate('ReelsFeed', {
					refresh: true,
					autoOpenReelId: uploadedReelId,
				});
			} else {
				navigation.navigate('ReelsFeed', { refresh: true });
			}
		}
	}, [showSuccess, successCountdown, uploadedReelId, navigation, resetReelData]);

	const handleUpload = async () => {
		if (!reelData.videoUri) {
			Alert.alert('Error', 'No video selected');
			return;
		}

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
			const filename = reelData.videoUri.split('/').pop() || 'reel_upload.mp4';

			if (Platform.OS === 'web' || (typeof reelData.videoUri === 'string' && reelData.videoUri.startsWith('blob:'))) {
				try {
					const blobResp = await fetch(reelData.videoUri);
					const blob = await blobResp.blob();
					videoFile = typeof File !== 'undefined' ? new File([blob], filename, { type: blob.type || 'video/mp4' }) : blob;
				} catch (e) {
					console.warn('Failed to convert blob', e);
					videoFile = {
						uri: reelData.videoUri,
						type: 'video/mp4',
						name: filename,
					};
				}
			} else {
				videoFile = {
					uri: reelData.videoUri,
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
				// 2b. Direct signed upload to Cloudinary
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
				finalThumbnailUrl = finalVideoUrl.replace(/\.[^.]+$/, '.jpg');
			}

			// 3. Create Reel document in DB
			setProgress('Saving reel metadata...');
			
			let coverToUpload = finalThumbnailUrl;

			if (reelData.selectedCover) {
				setProgress('Uploading custom cover...');
				try {
					const coverForm = new FormData();
					const coverFilename = reelData.selectedCover.split('/').pop() || 'cover.jpg';
					
					if (Platform.OS === 'web' || (typeof reelData.selectedCover === 'string' && reelData.selectedCover.startsWith('blob:'))) {
						const blobResp = await fetch(reelData.selectedCover);
						const blob = await blobResp.blob();
						const fileObj = typeof File !== 'undefined' ? new File([blob], coverFilename, { type: blob.type || 'image/jpeg' }) : blob;
						coverForm.append('file', fileObj);
					} else {
						coverForm.append('file', {
							uri: reelData.selectedCover,
							type: 'image/jpeg',
							name: coverFilename,
						} as any);
					}

					const coverUploadRes = await http.post('/uploads', coverForm, {
						headers: {
							'Content-Type': 'multipart/form-data',
						},
						timeout: 30000,
					});

					const coverData = coverUploadRes.data?.data || coverUploadRes.data;
					if (coverData && coverData.url) {
						coverToUpload = coverData.url;
					} else {
						console.warn('[Upload Cover] Invalid response, using generated thumbnail fallback');
					}
				} catch (coverErr) {
					console.warn('[Upload Cover] Failed, using generated thumbnail fallback:', coverErr);
				}
			}
			
			const createRes = await ReelsService.createReel({
				videoUrl: finalVideoUrl,
				thumbnailUrl: coverToUpload,
				caption: reelData.caption.trim(),
				duration: reelData.duration ? Math.round(reelData.duration / 1000) : 0,
				category: reelData.category,
				taggedUserIds: reelData.taggedUsers.map(u => u.id),
			});

			if (createRes.success && createRes.data?.id) {
				setUploadedReelId(createRes.data.id);
				setProgress('Upload complete!');
				setUploading(false);
				setShowSuccess(true);
			} else {
				throw new Error('Failed to create reel');
			}
		} catch (err: any) {
			console.error('[Upload Error]', err);
			setUploading(false);
			Alert.alert('Upload Failed', err.message || 'An error occurred during video upload', [
				{
					text: 'Try Again',
					onPress: () => handleUpload(),
				},
				{
					text: 'Go Back',
					onPress: () => {
						resetReelData();
						navigation.navigate('ReelEdit');
					},
				},
			]);
		}
	};

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={() => navigation.goBack()}>
				<Ionicons name="close" size={28} color="#1A1A1A" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Share Reel</Text>
				<View style={{ width: 28 }} />
			</View>

			{/* Step Indicator */}
			<StepIndicator currentStep="share" />

			{/* Upload Progress Modal */}
			<Modal visible={uploading || showSuccess} transparent animationType="fade">
				<View style={styles.overlay}>
					{/* Upload Progress */}
					{uploading && (
						<View style={styles.uploadCard}>
							<ActivityIndicator size="large" color="#FF2D55" style={{ marginBottom: 16 }} />
							<Text style={styles.uploadTitle}>Uploading Reel...</Text>
							<Text style={styles.uploadProgress}>{progress}</Text>
							<View style={styles.progressBarContainer}>
								<View style={styles.progressBar} />
							</View>
						</View>
					)}

					{/* Success Card */}
					{showSuccess && !uploading && (
						<View style={styles.successCard}>
							<Ionicons name="checkmark-circle" size={80} color="#FF2D55" style={{ marginBottom: 16 }} />
							<Text style={styles.successTitle}>Reel Posted Successfully! 🎉</Text>
							<Text style={styles.successSubtitle}>Your video is now live on Glunity Reels.</Text>
							<Text style={styles.successRedirect}>Redirecting to Feed in {successCountdown}s...</Text>
							<TouchableOpacity
								style={styles.successBtn}
								onPress={() => {
									setShowSuccess(false);
									resetReelData();
									navigation.navigate('ReelsFeed', { refresh: true });
								}}
							>
								<Text style={styles.successBtnText}>View Now</Text>
							</TouchableOpacity>
						</View>
					)}
				</View>
			</Modal>
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
	headerTitle: {
		color: '#1A1A1A',
		fontSize: 18,
		fontWeight: '700',
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
	stepNumber: {
		fontSize: 14,
		fontWeight: '700',
	},
	stepNumberActive: {
		color: '#FFF',
	},
	stepNumberInactive: {
		color: '#999999',
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
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.85)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 24,
	},
	uploadCard: {
		width: '100%',
		maxWidth: 320,
		backgroundColor: '#FFFFFF',
		borderRadius: 24,
		padding: 32,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.08)',
	},
	uploadTitle: {
		color: '#1A1A1A',
		fontSize: 18,
		fontWeight: '700',
		marginBottom: 8,
	},
	uploadProgress: {
		color: '#666666',
		fontSize: 13,
		marginBottom: 20,
		textAlign: 'center',
	},
	progressBarContainer: {
		width: '100%',
		height: 6,
		backgroundColor: '#EEEEEE',
		borderRadius: 3,
		overflow: 'hidden',
	},
	progressBar: {
		height: '100%',
		backgroundColor: '#FF2D55',
		width: '45%',
		borderRadius: 3,
	},
	// Success Card Styles
	successCard: {
		width: '100%',
		maxWidth: 340,
		backgroundColor: '#FFFFFF',
		borderRadius: 24,
		padding: 32,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.08)',
	},
	successTitle: {
		color: '#1A1A1A',
		fontSize: 20,
		fontWeight: '800',
		textAlign: 'center',
		marginBottom: 8,
	},
	successSubtitle: {
		color: '#666666',
		fontSize: 14,
		textAlign: 'center',
		marginBottom: 20,
	},
	successRedirect: {
		color: '#FF2D55',
		fontSize: 13,
		fontWeight: '600',
		marginBottom: 24,
	},
	successBtn: {
		backgroundColor: '#FF2D55',
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
});
