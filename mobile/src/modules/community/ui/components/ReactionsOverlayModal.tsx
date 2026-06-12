import React from 'react';
import { View, Text, Modal, Pressable, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ReactionsOverlayModalProps {
  visible: boolean;
  reactionMsgId: string | null;
  onClose: () => void;
  reactionEmojis: string[];
  handleToggleReaction: (messageId: string, emoji: string) => void;
  selectedMsg: any;
  handleReplyTo: (msg: any) => void;
  handleCopy: (text: string) => void;
  handleStartEdit: (msg: any) => void;
  handleDeleteMessage: (id: string) => void;
  handleTogglePin: (messageId: string) => void;
  user: any;
  theme: any;
  isDark: boolean;
  BlurView: any;
  t: (key: string) => string;
  modalBg: string;
  overlayFallback: string;
}

export function ReactionsOverlayModal({
  visible,
  reactionMsgId,
  onClose,
  reactionEmojis,
  handleToggleReaction,
  selectedMsg,
  handleReplyTo,
  handleCopy,
  handleStartEdit,
  handleDeleteMessage,
  handleTogglePin,
  user,
  theme: T,
  isDark,
  BlurView,
  t,
  modalBg,
  overlayFallback
}: ReactionsOverlayModalProps) {
  if (!visible) return null;

  const isAudio = selectedMsg?.attachments?.some((att: any) => att.type === 'audio');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {BlurView ? (
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill}>
          <BlurView intensity={45} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        </Pressable>
      ) : (
        <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: overlayFallback }]} />
      )}

      <View style={s.bottomWrapper}>
        <View style={[s.sheetContainer, { backgroundColor: T.surface }]}>
          {/* Handle bar indicator */}
          <View style={[s.handleBar, { backgroundColor: T.divider }]} />

          {/* Emoji Reactions Row */}
          <View style={[s.emojiRow, { borderBottomColor: T.divider }]}>
            {reactionEmojis.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => {
                  if (reactionMsgId) handleToggleReaction(reactionMsgId, emoji);
                  onClose();
                }}
                style={s.emojiButton}
                activeOpacity={0.7}
              >
                <Text style={s.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Action List Options */}
          <View style={s.actionList}>
            <TouchableOpacity
              onPress={() => { if (reactionMsgId) handleReplyTo(selectedMsg); }}
              style={s.actionItem}
              activeOpacity={0.7}
            >
              <View style={[s.iconWrap, { backgroundColor: T.surfaceAlt }]}>
                <Ionicons name="arrow-undo-outline" size={20} color={T.text} />
              </View>
              <Text style={[s.actionText, { color: T.text }]}>{t('Reply')}</Text>
            </TouchableOpacity>

            {!isAudio && (
              <TouchableOpacity
                onPress={() => { if (selectedMsg) handleCopy(selectedMsg.content || ''); }}
                style={s.actionItem}
                activeOpacity={0.7}
              >
                <View style={[s.iconWrap, { backgroundColor: T.surfaceAlt }]}>
                  <Ionicons name="copy-outline" size={20} color={T.text} />
                </View>
                <Text style={[s.actionText, { color: T.text }]}>{t('Copy Text')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => { if (reactionMsgId) handleTogglePin(reactionMsgId); onClose(); }}
              style={s.actionItem}
              activeOpacity={0.7}
            >
              <View style={[s.iconWrap, { backgroundColor: T.surfaceAlt }]}>
                <Ionicons name="pin-outline" size={20} color={T.text} />
              </View>
              <Text style={[s.actionText, { color: T.text }]}>
                {selectedMsg?.pinned ? t('Unpin Message') : t('Pin Message')}
              </Text>
            </TouchableOpacity>

            {String(selectedMsg?.senderId?._id || selectedMsg?.senderId || '') === String(user?._id || '') && !selectedMsg?.deletedAt && (
              <>
                <View style={[s.divider, { backgroundColor: T.divider }]} />

                {!isAudio && (
                  <TouchableOpacity
                    onPress={() => { if (selectedMsg) handleStartEdit(selectedMsg); }}
                    style={s.actionItem}
                    activeOpacity={0.7}
                  >
                    <View style={[s.iconWrap, { backgroundColor: T.surfaceAlt }]}>
                      <Ionicons name="create-outline" size={20} color={T.text} />
                    </View>
                    <Text style={[s.actionText, { color: T.text }]}>{t('Edit Message')}</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => { if (selectedMsg) handleDeleteMessage(selectedMsg.id || selectedMsg._id); }}
                  style={s.actionItem}
                  activeOpacity={0.7}
                >
                  <View style={[s.iconWrap, { backgroundColor: 'rgba(231, 76, 60, 0.1)' }]}>
                    <Ionicons name="trash-outline" size={20} color="#E74C3C" />
                  </View>
                  <Text style={[s.actionText, { color: '#E74C3C', fontWeight: '600' }]}>{t('Delete Message')}</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={[s.divider, { backgroundColor: T.divider }]} />

            <TouchableOpacity onPress={onClose} style={[s.actionItem, { paddingBottom: Platform.OS === 'ios' ? 24 : 12 }]} activeOpacity={0.7}>
              <View style={[s.iconWrap, { backgroundColor: T.surfaceAlt }]}>
                <Ionicons name="close-outline" size={20} color={T.textMuted} />
              </View>
              <Text style={[s.actionText, { color: T.textMuted }]}>{t('Cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  bottomWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent'
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  emojiButton: {
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  emojiText: {
    fontSize: 28,
  },
  actionList: {
    paddingTop: 4,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 6,
  }
});
