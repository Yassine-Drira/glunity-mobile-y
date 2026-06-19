import React from 'react';
import { View, Text, Modal, Pressable, Animated, TouchableOpacity, ActivityIndicator } from 'react-native';

interface ConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  loading?: boolean;
  isDestructive?: boolean;
  theme: any;
  isDark: boolean;
  BlurView: any;
  t: (key: string) => string;
  modalBg: string;
  overlayFallback: string;
}

export function ConfirmationModal({
  visible,
  onClose,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  loading = false,
  isDestructive = true,
  theme: T,
  isDark,
  BlurView,
  t,
  modalBg,
  overlayFallback,
}: ConfirmationModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {BlurView ? (
        <Pressable onPress={onClose} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
          <BlurView intensity={35} tint={isDark ? 'dark' : 'light'} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
        </Pressable>
      ) : (
        <Pressable onPress={onClose} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: overlayFallback }} />
      )}

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)' }}>
        <Animated.View style={{ 
          width: '86%', 
          backgroundColor: modalBg, 
          padding: 20, 
          borderRadius: 16, 
          shadowColor: '#000', 
          shadowOpacity: isDark ? 0.35 : 0.12, 
          shadowRadius: 16, 
          elevation: 10,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'
        }}>
          <Text style={{ 
            fontSize: 18, 
            fontWeight: '700', 
            color: T.text, 
            marginBottom: 10,
            fontFamily: 'Poppins_700Bold'
          }}>
            {t(title)}
          </Text>
          <Text style={{ 
            fontSize: 14.5,
            color: T.textMuted || '#7F8C8D', 
            marginBottom: 20,
            fontFamily: 'Poppins_400Regular',
            lineHeight: 20
          }}>
            {t(message)}
          </Text>
          
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity 
              onPress={onClose} 
              activeOpacity={0.7}
              style={{ 
                flex: 1, 
                padding: 13, 
                borderRadius: 12, 
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F2F4F4', 
                alignItems: 'center' 
              }}
            >
              <Text style={{ color: T.text, fontWeight: '600', fontFamily: 'Poppins_600Medium' }}>
                {t(cancelLabel)}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={onConfirm} 
              disabled={loading}
              activeOpacity={0.7}
              style={{ 
                flex: 1, 
                padding: 13, 
                borderRadius: 12, 
                backgroundColor: isDestructive ? '#E74C3C' : (isDark ? '#2ECC71' : '#27AE60'), 
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '700', fontFamily: 'Poppins_600Medium' }}>
                  {t(confirmLabel)}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
