import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	FlatList,
	Modal,
	Platform,
	SafeAreaView,
	ActivityIndicator,
	Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { TaggedUser } from '../../context/ReelCreationContext';
import { useAuth } from '../../../auth/state/auth.context';
import http from '../../../../core/network/http.client';

interface TagPeopleModalProps {
	visible: boolean;
	selectedUsers: TaggedUser[];
	onClose: () => void;
	onSubmit: (users: TaggedUser[]) => void;
}

export function TagPeopleModal({
	visible,
	selectedUsers,
	onClose,
	onSubmit,
}: TagPeopleModalProps) {
	const { user: currentUser } = useAuth();
	const [searchQuery, setSearchQuery] = useState('');
	const [debouncedQuery, setDebouncedQuery] = useState('');
	const [selected, setSelected] = useState<TaggedUser[]>(selectedUsers);
	const [usersList, setUsersList] = useState<TaggedUser[]>([]);
	const [isSearching, setIsSearching] = useState(false);

	// Sync selected users when modal opens
	useEffect(() => {
		setSelected(selectedUsers);
	}, [selectedUsers, visible]);

	// Debounce search query
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedQuery(searchQuery);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	// Fetch users from backend on debounced query changes
	useEffect(() => {
		let isMounted = true;
		
		const fetchUsers = async () => {
			if (!visible) return;
			setIsSearching(true);
			try {
				const response = await http.get('/users', {
					params: {
						q: debouncedQuery.trim() || undefined,
						limit: 30,
					},
				});
				
				if (isMounted && response.data?.success) {
					const backendUsers = response.data.data || [];
					const mappedUsers: TaggedUser[] = backendUsers.map((u: any) => ({
						id: u._id || u.id,
						fullName: u.fullName || 'Anonymous User',
						username: u.username || u.fullName?.replace(/\s+/g, '').toLowerCase() || 'anonymous',
						avatarUrl: u.avatarUrl || u.avatar?.url || null,
					}));

					// Prevent self-tagging and filter out blocked/deleted (isActive checked by backend)
					const filtered = mappedUsers.filter(
						(u) => u.id !== currentUser?._id
					);

					setUsersList(filtered);
				}
			} catch (err) {
				console.error('[TagPeopleModal] Error searching users:', err);
			} finally {
				if (isMounted) {
					setIsSearching(false);
				}
			}
		};

		fetchUsers();

		return () => {
			isMounted = false;
		};
	}, [debouncedQuery, visible, currentUser]);

	const toggleUserSelection = (user: TaggedUser) => {
		setSelected((prev) => {
			const isAlreadySelected = prev.some((u) => u.id === user.id);
			if (isAlreadySelected) {
				return prev.filter((u) => u.id !== user.id);
			} else {
				if (prev.length >= 10) {
					Alert.alert('Limit Reached', 'You can tag up to 10 people per reel.');
					return prev;
				}
				return [...prev, user];
			}
		});
	};

	const handleSubmit = () => {
		onSubmit(selected);
		onClose();
	};

	const handleClose = () => {
		setSearchQuery('');
		setSelected(selectedUsers);
		onClose();
	};

	return (
		<Modal visible={visible} animationType="slide" transparent>
			<SafeAreaView style={styles.container}>
				{/* Header */}
				<View style={styles.header}>
					<TouchableOpacity onPress={handleClose} style={styles.headerBtn}>
						<Ionicons name="close" size={28} color="#1A1A1A" />
					</TouchableOpacity>
					<Text style={styles.headerTitle}>Tag People</Text>
					<TouchableOpacity onPress={handleSubmit}>
						<Text style={styles.doneButton}>Done</Text>
					</TouchableOpacity>
				</View>

				{/* Search Bar */}
				<View style={styles.searchContainer}>
					<Ionicons name="search" size={20} color="#999999" />
					<TextInput
						style={styles.searchInput}
						placeholder="Search users..."
						placeholderTextColor="#CCCCCC"
						value={searchQuery}
						onChangeText={setSearchQuery}
						autoCapitalize="none"
						autoCorrect={false}
					/>
					{searchQuery.length > 0 && (
						<TouchableOpacity onPress={() => setSearchQuery('')}>
							<Ionicons name="close-circle" size={20} color="#CCCCCC" />
						</TouchableOpacity>
					)}
				</View>

				{/* Selected Users Preview */}
				{selected.length > 0 && (
					<View style={styles.selectedPreview}>
						<Text style={styles.selectedLabel}>
							{selected.length} person{selected.length !== 1 ? 's' : ''} selected (max 10)
						</Text>
						<View style={styles.selectedChips}>
							{selected.map((user) => (
								<View key={user.id} style={styles.selectedChip}>
									<Text style={styles.selectedChipText} numberOfLines={1}>
										{user.fullName}
									</Text>
									<TouchableOpacity
										onPress={() => toggleUserSelection(user)}
										style={styles.selectedChipRemove}
									>
										<Ionicons name="close" size={14} color="#FFFFFF" />
									</TouchableOpacity>
								</View>
							))}
						</View>
					</View>
				)}

				{/* User List */}
				{isSearching ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="large" color="#FF2D55" />
					</View>
				) : usersList.length > 0 ? (
					<FlatList
						data={usersList}
						keyExtractor={(item) => item.id}
						contentContainerStyle={styles.listContent}
						keyboardShouldPersistTaps="handled"
						renderItem={({ item }) => {
							const isSelected = selected.some((u) => u.id === item.id);
							return (
								<TouchableOpacity
									style={[
										styles.userItem,
										isSelected && styles.userItemSelected,
									]}
									onPress={() => toggleUserSelection(item)}
									activeOpacity={0.7}
								>
									<View style={styles.userInfo}>
										{item.avatarUrl ? (
											<Image
												source={{ uri: item.avatarUrl }}
												style={styles.avatar}
												contentFit="cover"
												cachePolicy="memory-disk"
											/>
										) : (
											<View style={[styles.avatar, styles.initialsAvatar]}>
												<Text style={styles.avatarInitials}>
													{item.fullName.charAt(0).toUpperCase()}
												</Text>
											</View>
										)}
										<View style={styles.userDetails}>
											<Text style={styles.userName} numberOfLines={1}>
												{item.fullName}
											</Text>
											<Text style={styles.userUsername} numberOfLines={1}>
												@{item.username}
											</Text>
										</View>
									</View>
									<View
										style={[
											styles.checkbox,
											isSelected && styles.checkboxChecked,
										]}
									>
										{isSelected && (
											<Ionicons
												name="checkmark"
												size={16}
												color="#FFFFFF"
											/>
										)}
									</View>
								</TouchableOpacity>
							);
						}}
					/>
				) : (
					<View style={styles.emptyContainer}>
						<Ionicons name="search" size={64} color="#DDDDDD" />
						<Text style={styles.emptyText}>No users found</Text>
						<Text style={styles.emptySubtext}>Try a different search term</Text>
					</View>
				)}

				{/* Footer Info */}
				<View style={styles.footer}>
					<Text style={styles.footerText}>
						You can tag up to 10 people per reel
					</Text>
				</View>
			</SafeAreaView>
		</Modal>
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
		paddingVertical: 12,
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
	doneButton: {
		color: '#FF2D55',
		fontSize: 16,
		fontWeight: '600',
		padding: 4,
	},
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginHorizontal: 16,
		marginVertical: 12,
		paddingHorizontal: 12,
		backgroundColor: '#F5F5F5',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.05)',
		gap: 8,
	},
	searchInput: {
		flex: 1,
		paddingVertical: 10,
		color: '#1A1A1A',
		fontSize: 14,
	},
	selectedPreview: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: 'rgba(255, 45, 85, 0.05)',
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(255, 45, 85, 0.2)',
	},
	selectedLabel: {
		color: '#1A1A1A',
		fontSize: 13,
		fontWeight: '600',
		marginBottom: 8,
	},
	selectedChips: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	selectedChip: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FF2D55',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 16,
		gap: 6,
	},
	selectedChipText: {
		color: '#FFFFFF',
		fontSize: 12,
		fontWeight: '600',
		maxWidth: 100,
	},
	selectedChipRemove: {
		padding: 2,
	},
	listContent: {
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	userItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 12,
		paddingHorizontal: 12,
		marginBottom: 8,
		backgroundColor: '#F9F9F9',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.05)',
	},
	userItemSelected: {
		backgroundColor: 'rgba(255, 45, 85, 0.03)',
		borderColor: '#FF2D55',
	},
	userInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		gap: 12,
	},
	avatar: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#EEEEEE',
	},
	initialsAvatar: {
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(255, 45, 85, 0.1)',
		borderWidth: 1,
		borderColor: 'rgba(255, 45, 85, 0.2)',
	},
	avatarInitials: {
		color: '#FF2D55',
		fontWeight: '700',
		fontSize: 15,
	},
	userDetails: {
		flex: 1,
	},
	userName: {
		color: '#1A1A1A',
		fontSize: 14,
		fontWeight: '600',
	},
	userUsername: {
		color: '#999999',
		fontSize: 12,
		marginTop: 2,
	},
	checkbox: {
		width: 24,
		height: 24,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: '#DDDDDD',
		justifyContent: 'center',
		alignItems: 'center',
	},
	checkboxChecked: {
		backgroundColor: '#FF2D55',
		borderColor: '#FF2D55',
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 32,
		marginTop: 40,
	},
	emptyText: {
		color: '#1A1A1A',
		fontSize: 16,
		fontWeight: '600',
		marginTop: 16,
		textAlign: 'center',
	},
	emptySubtext: {
		color: '#999999',
		fontSize: 14,
		marginTop: 8,
		textAlign: 'center',
	},
	footer: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderTopWidth: 1,
		borderTopColor: 'rgba(0,0,0,0.08)',
		backgroundColor: '#F9F9F9',
	},
	footerText: {
		color: '#999999',
		fontSize: 12,
		textAlign: 'center',
	},
});
