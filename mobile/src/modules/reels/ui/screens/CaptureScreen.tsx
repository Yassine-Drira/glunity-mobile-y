import React from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Alert,
	Platform,
	useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { useReelCreation } from '../../context/ReelCreationContext';

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

export default function CaptureScreen() {
	const navigation = useNavigation<any>();
	const { updateReelData } = useReelCreation();
	const { height: screenHeight } = useWindowDimensions();

	const pickVideo = async () => {
		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (!permission.granted) {
			Alert.alert('Permission Denied', 'We need access to your gallery to pick a video.');
			return;
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Videos,
			allowsEditing: true,
			quality: 0.8,
			videoMaxDuration: 60,
			videoExportPreset: ImagePicker.VideoExportPreset.MediumQuality,
		});

		if (!result.canceled && result.assets?.[0]) {
			const asset = result.assets[0];
			updateReelData({
				videoUri: asset.uri,
				videoDimensions:
					asset.width && asset.height
						? { width: asset.width, height: asset.height }
						: null,
				videoThumbnail: null,
				selectedCover: null,
				duration: 0,
			});
			// Auto-navigate to Edit screen
			navigation.navigate('ReelEdit');
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
			quality: 0.8,
			videoMaxDuration: 60,
			videoExportPreset: ImagePicker.VideoExportPreset.MediumQuality,
		});

		if (!result.canceled && result.assets?.[0]) {
			const asset = result.assets[0];
			updateReelData({
				videoUri: asset.uri,
				videoDimensions:
					asset.width && asset.height
						? { width: asset.width, height: asset.height }
						: null,
				videoThumbnail: null,
				selectedCover: null,
				duration: 0,
			});
			// Auto-navigate to Edit screen
			navigation.navigate('ReelEdit');
		}
	};

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={() => navigation.goBack()}>
				<Ionicons name="close" size={28} color="#1A1A1A" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Create Reel</Text>
				<View style={{ width: 28 }} />
			</View>

			{/* Step Indicator */}
			<StepIndicator currentStep="capture" />

			{/* Main Content - Centered */}
			<View style={[styles.contentContainer, { minHeight: screenHeight - 280 }]}>
				<View style={styles.iconWrapper}>
					<Ionicons name="film-outline" size={80} color="#FF2D55" />
				</View>

				<Text style={styles.title}>Capture or Select Video</Text>
				<Text style={styles.subtitle}>Share your gluten-free journey in short video reels!</Text>

				<View style={styles.buttonContainer}>
					<TouchableOpacity style={styles.galleryBtn} onPress={pickVideo}>
						<Ionicons name="images-outline" size={20} color="#FFF" />
						<Text style={styles.galleryBtnText}>Choose from Gallery</Text>
					</TouchableOpacity>

					<TouchableOpacity style={styles.cameraBtn} onPress={recordVideo}>
						<Ionicons name="videocam-outline" size={20} color="#FFF" />
						<Text style={styles.cameraBtnText}>Record with Camera</Text>
					</TouchableOpacity>
				</View>
			</View>
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
		paddingVertical: 20,
		paddingHorizontal: 16,
		gap: 12,
	},
	stepCircle: {
		width: 40,
		height: 40,
		borderRadius: 20,
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
		fontSize: 16,
		fontWeight: '700',
	},
	stepNumberActive: {
		color: '#FFF',
	},
	stepNumberInactive: {
		color: '#999999',
	},
	stepLabel: {
		fontSize: 11,
		fontWeight: '600',
		marginTop: 6,
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
		maxWidth: 40,
	},
	stepLineActive: {
		backgroundColor: '#FF2D55',
	},
	stepLineInactive: {
		backgroundColor: '#DDDDDD',
	},
	// Content Styles
	contentContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 24,
	},
	iconWrapper: {
		marginBottom: 24,
	},
	title: {
		color: '#1A1A1A',
		fontSize: 22,
		fontWeight: '700',
		marginBottom: 8,
		textAlign: 'center',
	},
	subtitle: {
		color: '#666666',
		fontSize: 14,
		textAlign: 'center',
		marginBottom: 32,
		lineHeight: 20,
	},
	buttonContainer: {
		width: '100%',
		gap: 12,
	},
	galleryBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FF2D55',
		paddingVertical: 14,
		paddingHorizontal: 20,
		borderRadius: 12,
		justifyContent: 'center',
		gap: 10,
	},
	galleryBtnText: {
		color: '#FFF',
		fontSize: 16,
		fontWeight: '600',
	},
	cameraBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FF2D55',
		paddingVertical: 14,
		paddingHorizontal: 20,
		borderRadius: 12,
		justifyContent: 'center',
		gap: 10,
	},
	cameraBtnText: {
		color: '#FFF',
		fontSize: 16,
		fontWeight: '600',
	},
});
