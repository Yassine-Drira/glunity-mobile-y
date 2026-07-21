import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { adminApi, PatientResourceItem, ResourceAnalyticsDTO } from '../api/admin.api';

export type ResourceTypeFilter = 'all' | 'article' | 'document' | 'video';
export type ResourceStatusFilter = 'all' | 'Published' | 'Draft';

export function useAdminResources() {
  const [resources, setResources] = useState<PatientResourceItem[]>([]);
  const [analytics, setAnalytics] = useState<ResourceAnalyticsDTO>({
    totalResources: 0,
    articlesCount: 0,
    documentsCount: 0,
    videosCount: 0,
    totalViews: 0,
    totalClicks: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ResourceTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<ResourceStatusFilter>('all');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<PatientResourceItem | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [listData, analyticsData] = await Promise.all([
        adminApi.getPatientResources({
          type: typeFilter !== 'all' ? typeFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        }),
        adminApi.getResourceAnalytics(),
      ]);
      setResources(listData || []);
      if (analyticsData) setAnalytics(analyticsData);
    } catch (err) {
      console.error('Error fetching resources:', err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered List
  const filteredResources = useMemo(() => {
    return resources.filter((item) => {
      const matchesSearch =
        !searchQuery.trim() ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [resources, searchQuery, typeFilter, statusFilter]);

  const openCreateModal = () => {
    setEditingItem(null);
    setModalVisible(true);
  };

  const openEditModal = (item: PatientResourceItem) => {
    setEditingItem(item);
    setModalVisible(true);
  };

  const handleSaveResource = async (formData: Partial<PatientResourceItem> & { content?: string }) => {
    try {
      if (editingItem) {
        // Update existing resource
        const updated = await adminApi.updatePatientResource(editingItem.id, formData);
        setResources((prev) => prev.map((r) => (r.id === editingItem.id ? { ...r, ...updated } : r)));
        Alert.alert('Succès', 'La ressource a été mise à jour.');
      } else {
        // Create new resource
        const created = await adminApi.createPatientResource(formData);
        if (created) {
          setResources((prev) => [created, ...prev]);
        }
        Alert.alert('Succès', 'La ressource a été créée avec succès.');
      }
      setModalVisible(false);
      setEditingItem(null);
      loadData(); // Refresh analytics & totals
    } catch (err) {
      console.error('Error saving resource:', err);
      Alert.alert('Erreur', 'Impossible d\'enregistrer la ressource.');
    }
  };

  const handleDeleteResource = (id: string, title: string) => {
    Alert.alert('Supprimer la ressource', `Êtes-vous sûr de vouloir supprimer "${title}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminApi.deletePatientResource(id);
            setResources((prev) => prev.filter((r) => r.id !== id));
            Alert.alert('Supprimé', 'La ressource a été supprimée.');
            loadData();
          } catch {
            Alert.alert('Erreur', 'Impossible de supprimer.');
          }
        },
      },
    ]);
  };

  return {
    resources: filteredResources,
    allResources: resources,
    analytics,
    loading,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    refresh: loadData,
    openCreateModal,
    openEditModal,
    handleSaveResource,
    handleDeleteResource,
    modal: {
      visible: modalVisible,
      setVisible: setModalVisible,
      editingItem,
    },
  };
}
