import React, { useRef, useEffect } from 'react';
import {
  View, Text, Modal, Pressable, TouchableOpacity,
  Animated, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface OptionsActionMenuProps {
  visible: boolean;
  onRequestClose: () => void;

  // context
  isDM: boolean;         // true for 1-to-1 conversations
  isMuted: boolean;      // current mute state for the user

  // Group-only callbacks
  onOpenMembers?: () => void;
  onOpenEditGroup?: () => void;

  // DM-only callbacks
  onMuteToggle?: () => void;
  onClearChat?: () => void;
  onDeleteConversation?: () => void;

  // shared callbacks
  theme: any;
  insets: any;
  isDark: boolean;
  BlurView: any;
  t?: (k: string) => string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function OptionsActionMenu({
  visible,
  onRequestClose,
  isDM,
  isMuted,
  onOpenMembers,
  onOpenEditGroup,
  onMuteToggle,
  onClearChat,
  onDeleteConversation,
  theme: T,
  insets,
  isDark,
  BlurView,
  t = (k) => k,
}: OptionsActionMenuProps) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 7,
          tension: 120,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  // ── Build menu items depending on context ──────────────────────────────────
  const items: MenuItem[] = isDM
    ? [
        {
          icon: isMuted ? 'notifications-outline' : 'notifications-off-outline',
          label: isMuted ? t('Unmute Notifications') : t('Mute Notifications'),
          onPress: () => { onRequestClose(); onMuteToggle?.(); },
        },
        {
          icon: 'trash-outline',
          label: t('Clear Chat'),
          onPress: () => { onRequestClose(); onClearChat?.(); },
          destructive: true,
        },
        {
          icon: 'close-circle-outline',
          label: t('Delete Conversation'),
          onPress: () => { onRequestClose(); onDeleteConversation?.(); },
          destructive: true,
        },
      ]
    : [
        {
          icon: 'people-outline',
          label: t('Group Info'),
          onPress: () => { onRequestClose(); onOpenMembers?.(); },
        },
        {
          icon: 'create-outline',
          label: t('Edit Group'),
          onPress: () => { onRequestClose(); onOpenEditGroup?.(); },
        },
      ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      {/* Overlay */}
      {BlurView ? (
        <Pressable
          onPress={onRequestClose}
          style={StyleSheet.absoluteFillObject}
        >
          <BlurView
            intensity={50}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFillObject}
          />
        </Pressable>
      ) : (
        <Pressable
          onPress={onRequestClose}
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.35)' }]}
        />
      )}

      {/* Menu card */}
      <View
        style={{
          position: 'absolute',
          right: 12,
          top: (insets?.top || 0) + 58,
          minWidth: 230,
        }}
      >
        <Animated.View
          style={{
            backgroundColor: isDark ? '#1C2833' : '#FFFFFF',
            borderRadius: 14,
            paddingVertical: 6,
            shadowColor: '#000',
            shadowOpacity: isDark ? 0.4 : 0.12,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 4 },
            elevation: 10,
            overflow: 'hidden',
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          }}
        >
          {items.map((item, i) => (
            <React.Fragment key={item.label}>
              {i > 0 && (
                <View
                  style={{
                    height: StyleSheet.hairlineWidth,
                    backgroundColor: isDark ? '#2C3E50' : '#E8ECF0',
                    marginHorizontal: 12,
                  }}
                />
              )}
              <TouchableOpacity
                onPress={item.onPress}
                activeOpacity={0.65}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 13,
                  paddingHorizontal: 16,
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: item.destructive
                      ? 'rgba(231,76,60,0.12)'
                      : isDark
                      ? 'rgba(255,255,255,0.06)'
                      : 'rgba(0,0,0,0.05)',
                  }}
                >
                  <Ionicons
                    name={item.icon}
                    size={17}
                    color={item.destructive ? '#E74C3C' : T.text}
                  />
                </View>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: item.destructive ? '#E74C3C' : T.text,
                    fontFamily: 'Poppins_500Medium',
                    flex: 1,
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </Animated.View>
      </View>
    </Modal>
  );
}
