import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Switch } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../shared/context/theme.context';
import { Colors, Font, Radius, Spacing } from '../../../../shared/utils/theme';
import { PatientResourceItem } from '../../api/admin.api';

interface ResourceFormModalProps {
  visible: boolean;
  onClose: () => void;
  initialData?: PatientResourceItem | null;
  onSave: (data: Partial<PatientResourceItem> & { content?: string }) => Promise<void>;
}

const CATEGORY_OPTIONS = [
  { id: 'celiac-disease', label: 'Maladie Cœliaque' },
  { id: 'diet-basics', label: 'Bases Régime SG' },
  { id: 'safe-foods', label: 'Aliments Sûrs' },
  { id: 'lifestyle-tips', label: 'Conseils au Quotidien' },
];

export function ResourceFormModal({ visible, onClose, initialData, onSave }: ResourceFormModalProps) {
  const { theme: T, isDark } = useTheme();
  const primaryGreen = Colors.green || '#8BC34A';

  const [type, setType] = useState<'article' | 'document' | 'video'>('article');
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [body, setBody] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [category, setCategory] = useState('celiac-disease');
  const [authorName, setAuthorName] = useState('Équipe Médicale Glu10');
  const [readMinutes, setReadMinutes] = useState('5');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setType(initialData.type || 'article');
      setTitle(initialData.title || '');
      setExcerpt(initialData.excerpt || '');
      setBody(initialData.body || '');
      setFileUrl(initialData.fileUrl || '');
      setVideoUrl(initialData.videoUrl || '');
      setCategory(initialData.category || 'celiac-disease');
      setAuthorName(initialData.author || 'Équipe Médicale Glu10');
      setReadMinutes(String(initialData.readMinutes || 5));
      setCoverImageUrl(initialData.coverImageUrl || '');
      setIsFeatured(Boolean(initialData.isFeatured));
      setIsPublished(initialData.status === 'Published' || initialData.isPublished !== false);
    } else {
      setType('article');
      setTitle('');
      setExcerpt('');
      setBody('');
      setFileUrl('');
      setVideoUrl('');
      setCategory('celiac-disease');
      setAuthorName('Équipe Médicale Glu10');
      setReadMinutes('5');
      setCoverImageUrl('');
      setIsFeatured(false);
      setIsPublished(true);
    }
  }, [initialData, visible]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onSave({
        type,
        title: title.trim(),
        excerpt: excerpt.trim(),
        body: body.trim(),
        content: body.trim(),
        fileUrl: fileUrl.trim() || null,
        videoUrl: videoUrl.trim() || null,
        category,
        author: authorName.trim(),
        readMinutes: Number(readMinutes) || 5,
        coverImageUrl: coverImageUrl.trim() || null,
        isFeatured,
        isPublished,
        status: isPublished ? 'Published' : 'Draft',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isEdit = !!initialData;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : Colors.white }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={isEdit ? 'create' : 'add-circle'} size={22} color={primaryGreen} />
              <Text style={[styles.modalTitle, { color: T.text }]}>
                {isEdit ? 'Modifier la Ressource' : 'Nouvelle Ressource Patient'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.btnClose}>
              <Feather name="x" size={20} color={T.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Type Selector */}
            <Text style={[styles.fieldLabel, { color: T.text }]}>Type de Ressource</Text>
            <View style={styles.typeRow}>
              {[
                { id: 'article', label: 'Article', icon: 'book-outline' as const, color: '#10B981' },
                { id: 'document', label: 'Document PDF', icon: 'document-text-outline' as const, color: '#3B82F6' },
                { id: 'video', label: 'Vidéo', icon: 'videocam-outline' as const, color: '#8B5CF6' },
              ].map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.typeBtn,
                    {
                      backgroundColor: type === t.id ? t.color : isDark ? '#2C2C2E' : 'rgba(46,46,46,0.06)',
                      borderColor: type === t.id ? t.color : 'transparent',
                    },
                  ]}
                  onPress={() => setType(t.id as any)}
                >
                  <Ionicons name={t.icon} size={16} color={type === t.id ? '#FFF' : T.text} />
                  <Text style={{ color: type === t.id ? '#FFF' : T.text, fontSize: 12, fontFamily: Font.bold }}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Category Pills */}
            <Text style={[styles.fieldLabel, { color: T.text }]}>Catégorie Médicale</Text>
            <View style={styles.catPillsRow}>
              {CATEGORY_OPTIONS.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catPill,
                    {
                      backgroundColor: category === cat.id ? primaryGreen : isDark ? '#2C2C2E' : 'rgba(46,46,46,0.06)',
                    },
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Text style={{ color: category === cat.id ? '#FFF' : T.text, fontSize: 11, fontFamily: Font.medium }}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Title Input */}
            <Text style={[styles.fieldLabel, { color: T.text }]}>Titre de la Ressource *</Text>
            <TextInput
              style={[
                styles.input,
                { color: T.text, backgroundColor: isDark ? '#2C2C2E' : 'rgba(46,46,46,0.06)', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(46,46,46,0.2)' },
              ]}
              placeholder="Ex: Guide des céréales sans gluten..."
              placeholderTextColor={T.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            {/* Excerpt Input */}
            <Text style={[styles.fieldLabel, { color: T.text }]}>Résumé / Extrait (Aperçu)</Text>
            <TextInput
              style={[
                styles.input,
                { color: T.text, backgroundColor: isDark ? '#2C2C2E' : 'rgba(46,46,46,0.06)', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(46,46,46,0.2)' },
              ]}
              placeholder="Bref résumé affiché dans les listes..."
              placeholderTextColor={T.textMuted}
              value={excerpt}
              onChangeText={setExcerpt}
            />

            {/* Conditional Content by Type */}
            {type === 'article' && (
              <>
                <Text style={[styles.fieldLabel, { color: T.text }]}>Contenu de l'Article (Texte / Markdown)</Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    { color: T.text, backgroundColor: isDark ? '#2C2C2E' : 'rgba(46,46,46,0.06)', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(46,46,46,0.2)' },
                  ]}
                  placeholder="Rédigez le contenu complet de l'article..."
                  placeholderTextColor={T.textMuted}
                  multiline
                  numberOfLines={6}
                  value={body}
                  onChangeText={setBody}
                />
              </>
            )}

            {type === 'document' && (
              <>
                <Text style={[styles.fieldLabel, { color: T.text }]}>Lien URL du Document (PDF)</Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: T.text, backgroundColor: isDark ? '#2C2C2E' : 'rgba(46,46,46,0.06)', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(46,46,46,0.2)' },
                  ]}
                  placeholder="https://example.com/documents/guide.pdf"
                  placeholderTextColor={T.textMuted}
                  value={fileUrl}
                  onChangeText={setFileUrl}
                />
              </>
            )}

            {type === 'video' && (
              <>
                <Text style={[styles.fieldLabel, { color: T.text }]}>Lien URL de la Vidéo (MP4 / Streaming)</Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: T.text, backgroundColor: isDark ? '#2C2C2E' : 'rgba(46,46,46,0.06)', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(46,46,46,0.2)' },
                  ]}
                  placeholder="https://example.com/video.mp4"
                  placeholderTextColor={T.textMuted}
                  value={videoUrl}
                  onChangeText={setVideoUrl}
                />
              </>
            )}

            {/* Author & Read Time */}
            <View style={styles.formRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.fieldLabel, { color: T.text }]}>Auteur / Organisme</Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: T.text, backgroundColor: isDark ? '#2C2C2E' : 'rgba(46,46,46,0.06)', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(46,46,46,0.2)' },
                  ]}
                  placeholder="Équipe Médicale"
                  placeholderTextColor={T.textMuted}
                  value={authorName}
                  onChangeText={setAuthorName}
                />
              </View>
              <View style={{ width: 110 }}>
                <Text style={[styles.fieldLabel, { color: T.text }]}>Durée (min)</Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: T.text, backgroundColor: isDark ? '#2C2C2E' : 'rgba(46,46,46,0.06)', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(46,46,46,0.2)' },
                  ]}
                  placeholder="5"
                  keyboardType="numeric"
                  placeholderTextColor={T.textMuted}
                  value={readMinutes}
                  onChangeText={setReadMinutes}
                />
              </View>
            </View>

            {/* Cover Image URL */}
            <Text style={[styles.fieldLabel, { color: T.text }]}>URL Image de Couverture / Miniature</Text>
            <TextInput
              style={[
                styles.input,
                { color: T.text, backgroundColor: isDark ? '#2C2C2E' : 'rgba(46,46,46,0.06)', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(46,46,46,0.2)' },
              ]}
              placeholder="https://images.unsplash.com/photo-..."
              placeholderTextColor={T.textMuted}
              value={coverImageUrl}
              onChangeText={setCoverImageUrl}
            />

            {/* Switches Row */}
            <View style={styles.switchesContainer}>
              <View style={styles.switchRow}>
                <View>
                  <Text style={[styles.switchTitle, { color: T.text }]}>Publier la Ressource</Text>
                  <Text style={[styles.switchSub, { color: T.textMuted }]}>Rendre visible aux patients immédiatement</Text>
                </View>
                <Switch value={isPublished} onValueChange={setIsPublished} trackColor={{ false: '#767577', true: primaryGreen }} />
              </View>

              <View style={styles.switchRow}>
                <View>
                  <Text style={[styles.switchTitle, { color: T.text }]}>Mettre en Vedette</Text>
                  <Text style={[styles.switchSub, { color: T.textMuted }]}>Afficher dans la section À la une</Text>
                </View>
                <Switch value={isFeatured} onValueChange={setIsFeatured} trackColor={{ false: '#767577', true: '#F59E0B' }} />
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={[styles.btnCancel, { backgroundColor: isDark ? '#2C2C2E' : 'rgba(46,46,46,0.08)' }]} onPress={onClose}>
              <Text style={{ color: T.text, fontFamily: Font.bold }}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnSubmit, { backgroundColor: primaryGreen, opacity: submitting || !title.trim() ? 0.6 : 1 }]}
              onPress={handleSubmit}
              disabled={submitting || !title.trim()}
            >
              <Feather name="check" size={16} color="#FFF" />
              <Text style={{ color: '#FFF', fontFamily: Font.bold, marginLeft: 6 }}>
                {isEdit ? 'Enregistrer' : 'Publier'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  modalContent: {
    maxHeight: '90%',
    width: '100%',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: { fontFamily: Font.bold, fontSize: 18 },
  btnClose: { padding: 4 },
  fieldLabel: { fontFamily: Font.bold, fontSize: 12, marginTop: Spacing.sm, marginBottom: 6 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.sm },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Radius.md,
    gap: 6,
    borderWidth: 1,
  },
  catPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.sm },
  catPill: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: Radius.full },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontFamily: Font.regular,
    fontSize: 13,
  },
  textArea: { minHeight: 110, textAlignVertical: 'top' },
  formRow: { flexDirection: 'row', alignItems: 'center' },
  switchesContainer: { marginTop: Spacing.md, gap: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchTitle: { fontFamily: Font.bold, fontSize: 13 },
  switchSub: { fontFamily: Font.regular, fontSize: 11 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md, marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  btnCancel: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: Radius.md },
  btnSubmit: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 22, borderRadius: Radius.md },
});
