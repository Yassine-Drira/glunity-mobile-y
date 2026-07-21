import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { adminApi, SellerVerificationDossier } from '../api/admin.api';

export type ActionKind = 'approve' | 'revision' | 'reject';
export type ModalType = 'details' | 'action' | null;

export function useSellerVerification() {
  const [sellers, setSellers] = useState<SellerVerificationDossier[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedSeller, setSelectedSeller] = useState<SellerVerificationDossier | null>(null);
  const [actionKind, setActionKind] = useState<ActionKind>('approve');
  const [remarks, setRemarks] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getSellerVerifications();
      setSellers(data);
    } catch (err) {
      console.error('Error fetching seller verifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenDetails = (seller: SellerVerificationDossier) => {
    setSelectedSeller(seller);
    setModalType('details');
  };

  const handleOpenAction = (seller: SellerVerificationDossier, kind: ActionKind) => {
    setSelectedSeller(seller);
    setActionKind(kind);
    setRemarks('');
    setModalType('action');
  };

  const handleConfirmAction = async () => {
    if (!selectedSeller) return;
    if (actionKind !== 'approve' && !remarks.trim()) {
      Alert.alert('Motif requis', 'Veuillez préciser la raison (révision ou refus).');
      return;
    }

    try {
      await adminApi.processSellerVerification(selectedSeller.id, actionKind === 'approve' ? 'approve' : 'reject', remarks);
      
      if (actionKind === 'approve') {
        Alert.alert('Badge Attribué', `Le badge Vendeur Vérifié a été accordé à ${selectedSeller.storeName}. Email envoyé.`);
      } else if (actionKind === 'revision') {
        Alert.alert('Révision Demandée', `Une demande de pièces complémentaires a été envoyée à ${selectedSeller.storeName}.`);
      } else {
        Alert.alert('Candidature Refusée', `Le dossier de ${selectedSeller.storeName} a été refusé.`);
      }

      setSellers(sellers.filter((s) => s.id !== selectedSeller.id));
      setModalType(null);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de traiter la demande pour le moment.');
    }
  };

  return {
    sellers,
    loading,
    refresh: loadData,
    modal: {
      type: modalType,
      setType: setModalType,
      selectedSeller,
      actionKind,
      remarks,
      setRemarks,
      handleOpenDetails,
      handleOpenAction,
      handleConfirmAction
    }
  };
}
