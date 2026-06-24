import React from 'react';
import { View, Text, Modal, Pressable, Animated, TouchableOpacity } from 'react-native';

interface InfoModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  theme: any;
  isDark: boolean;
  BlurView: any;
  t: (k: string) => string;
  modalBg: string;
  overlayFallback: string;
}

export default function InfoModal({ visible, onClose, title, message, theme: T, isDark, BlurView, t, modalBg, overlayFallback }: InfoModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {BlurView ? (
        <Pressable onPress={onClose} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
          <BlurView intensity={35} tint={isDark ? 'dark' : 'light'} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
        </Pressable>
      ) : (
        <Pressable onPress={onClose} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: overlayFallback }} />
      )}

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Animated.View style={{ width: '86%', backgroundColor: modalBg, padding: 18, borderRadius: 14, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: T.text, marginBottom: 8 }}>{t(title)}</Text>
          <Text style={{ color: T.textMuted, marginBottom: 16 }}>{t(message)}</Text>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: T.surfaceAlt, alignItems: 'center' }}>
              <Text style={{ color: T.text }}>{t('OK')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
