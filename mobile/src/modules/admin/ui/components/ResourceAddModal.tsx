import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../../shared/context/theme.context';
import { Colors, Font, Radius, Spacing } from '../../../../shared/utils/theme';

interface ResourceAddModalProps {
  visible: boolean;
  onClose: () => void;
  newTitle: string;
  setNewTitle: (v: string) => void;
  newCategory: 'Guide de Référence' | 'Fiche Pratique' | 'Article Médical';
  setNewCategory: (v: any) => void;
  newContent: string;
  setNewContent: (v: string) => void;
  onCreate: () => void;
}

export function ResourceAddModal({ visible, onClose, newTitle, setNewTitle, newCategory, setNewCategory, newContent, setNewContent, onCreate }: ResourceAddModalProps) {
  const { theme: T, isDark } = useTheme();
  const primaryGreen = Colors.green || '#8BC34A';

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : Colors.white }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: T.text }]}>Nouvelle Ressource Patient</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={20} color={T.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.fieldLabel, { color: T.text }]}>Titre du Guide / Article</Text>
          <TextInput
            style={[styles.input, { color: T.text, backgroundColor: isDark ? '#2C2C2E' : 'rgba(46,46,46,0.06)', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(46,46,46,0.2)' }]}
            placeholder="Ex: Guide des substituts de farine..."
            placeholderTextColor={T.textMuted}
            value={newTitle}
            onChangeText={setNewTitle}
          />

          <Text style={[styles.fieldLabel, { color: T.text }]}>Catégorie</Text>
          <View style={styles.catPillsRow}>
            {['Guide de Référence', 'Fiche Pratique', 'Article Médical'].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.catPill, { backgroundColor: newCategory === cat ? primaryGreen : isDark ? '#2C2C2E' : 'rgba(46,46,46,0.06)' }]}
                onPress={() => setNewCategory(cat as any)}
              >
                <Text style={{ color: newCategory === cat ? '#FFF' : T.text, fontSize: 11, fontFamily: Font.medium }}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { color: T.text }]}>Contenu de la Ressource</Text>
          <TextInput
            style={[styles.input, styles.textArea, { color: T.text, backgroundColor: isDark ? '#2C2C2E' : 'rgba(46,46,46,0.06)', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(46,46,46,0.2)' }]}
            placeholder="Rédigez ou collez le contenu éducatif ici..."
            placeholderTextColor={T.textMuted}
            multiline
            numberOfLines={4}
            value={newContent}
            onChangeText={setNewContent}
          />

          <View style={styles.modalFooter}>
            <TouchableOpacity style={[styles.btnCancel, { backgroundColor: isDark ? '#2C2C2E' : 'rgba(46,46,46,0.08)' }]} onPress={onClose}>
              <Text style={{ color: T.text, fontFamily: Font.bold }}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btnSubmit, { backgroundColor: primaryGreen }]} onPress={onCreate}>
              <Feather name="check" size={16} color="#FFF" />
              <Text style={{ color: '#FFF', fontFamily: Font.bold, marginLeft: 6 }}>Publier</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.md },
  modalContent: { width: '100%', borderRadius: Radius.lg, padding: Spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontFamily: Font.bold, fontSize: 18 },
  fieldLabel: { fontFamily: Font.bold, fontSize: 13, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, fontFamily: Font.regular, fontSize: 14, marginBottom: Spacing.md },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  catPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.lg },
  catPill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: Radius.full },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md, marginTop: Spacing.md },
  btnCancel: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: Radius.md },
  btnSubmit: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: Radius.md },
});
