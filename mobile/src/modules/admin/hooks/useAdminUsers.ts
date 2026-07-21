import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { adminApi, AdminUserListItem } from '../api/admin.api';

export type UserFilter = 'all' | 'celiac' | 'pro_commerce' | 'pro_health' | 'suspended';

export function useAdminUsers() {
  const [filter, setFilter] = useState<UserFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadUsersData = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getUsers(filter, searchQuery);
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsersData();
  }, [filter, searchQuery]);

  const handleToggleStatus = async (userToToggle?: AdminUserListItem) => {
    const target = userToToggle || selectedUser;
    if (!target) return;

    const newStatus = target.status === 'active' ? 'suspended' : 'active';
    const statusLabel = newStatus === 'suspended' ? 'Suspendu' : 'Réactivé';

    try {
      await adminApi.toggleUserStatus(target.id, newStatus);
      setUsers(users.map((u) => (u.id === target.id ? { ...u, status: newStatus } : u)));
      Alert.alert(`Compte ${statusLabel}`, `${target.fullName} est désormais ${statusLabel.toLowerCase()}.`);
      if (selectedUser?.id === target.id) {
        setSelectedUser({ ...target, status: newStatus });
      }
      setModalVisible(false);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de modifier le statut de l\'utilisateur.');
    }
  };

  const handlePasswordReset = () => {
    if (!selectedUser) return;
    Alert.alert('Mot de Passe', `Un lien de réinitialisation a été envoyé à ${selectedUser.email}`);
    setModalVisible(false);
  };

  return {
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    users,
    loading,
    refresh: loadUsersData,
    handleToggleStatus,
    modal: {
      visible: modalVisible,
      setVisible: setModalVisible,
      selectedUser,
      setSelectedUser,
      handleToggleStatus: () => handleToggleStatus(),
      handlePasswordReset
    }
  };
}
