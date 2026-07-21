import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { adminApi, ModerationItem } from '../api/admin.api';

export type TabType = 'products' | 'events' | 'recipes' | 'reels';

export function useAdminModeration(initialTab: TabType = 'products') {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [rejectReason, setRejectReason] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getModerationItems(activeTab);
      setItems(data);
    } catch (err) {
      console.error('Error fetching moderation items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleOpenAction = (item: ModerationItem, type: 'approve' | 'reject') => {
    setSelectedItem(item);
    setActionType(type);
    setRejectReason('');
    setModalVisible(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedItem) return;
    if (actionType === 'reject' && !rejectReason.trim()) {
      Alert.alert('Motif requis', 'Veuillez préciser la raison du refus.');
      return;
    }

    try {
      await adminApi.moderateItem(selectedItem.id, selectedItem.type, actionType, rejectReason);
      
      const itemTitle = selectedItem.title;
      if (actionType === 'approve') {
        Alert.alert('Publication Validée', `"${itemTitle}" a été validé. Notifié par Email/In-App.`);
      } else {
        Alert.alert('Refus Enregistré', `Motif : "${rejectReason}". Utilisateur notifié.`);
      }

      setItems(items.filter((i) => i.id !== selectedItem.id));
      setModalVisible(false);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible d\'effectuer l\'action pour le moment.');
    }
  };

  const filteredItems = items.filter((i) => {
    if (activeTab === 'products') return i.type === 'product';
    if (activeTab === 'events') return i.type === 'event';
    if (activeTab === 'recipes') return i.type === 'recipe';
    if (activeTab === 'reels') return i.type === 'reel';
    return true;
  });

  return {
    activeTab,
    setActiveTab,
    loading,
    filteredItems,
    refresh: loadData,
    modal: {
      visible: modalVisible,
      setVisible: setModalVisible,
      selectedItem,
      actionType,
      rejectReason,
      setRejectReason,
      handleOpenAction,
      handleConfirmAction
    }
  };
}
