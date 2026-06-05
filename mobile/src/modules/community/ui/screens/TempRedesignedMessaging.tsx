import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Animated,
  Easing,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Modal
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// ============================================================================
// ━━━ GLOBAL DESIGN TOKENS ━━━
// ============================================================================
const TOKENS = {
  bgPrimary: '#0D0D14',      // Background primary
  bgCard: '#111827',         // Background card
  bgElevated: '#1E1E2E',     // Background elevated
  bgContext: '#1E293B',      // Background of context menus/pills
  accentPrimary: '#22C55E',   // Accent primary (green)
  accentMuted: '#16A34A',     // Accent muted
  accentGlow: '#4ADE80',      // Accent glow
  textPrimary: '#F9FAFB',     // Text primary
  textSecondary: '#9CA3AF',   // Text secondary
  textMuted: '#6B7280',       // Text muted
  borderDefault: '#1F2937',   // Border default
  borderSubtle: '#374151',    // Border subtle
  danger: '#EF4444',          // Danger (red)
  radiusBase: 12,
  radiusBubble: 18,
  radiusInput: 24,
};

// ============================================================================
// ━━━ 1. CHANNEL LIST ITEM ━━━
// ============================================================================
interface ChannelListItemProps {
  channel: {
    id: string;
    name: string;
    type: 'group' | 'dm' | 'topic';
    description?: string;
    lastMessage?: {
      content: string;
      senderName: string;
      createdAt: string;
    };
    unreadCount: number;
  };
  isActive: boolean;
  onPress: () => void;
}

export const ChannelListItem: React.FC<ChannelListItemProps> = ({ channel, isActive, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    // Micro-interaction: Channel row tap scale 0.97, 120ms
    Animated.timing(scaleAnim, {
      toValue: 0.97,
      duration: 120,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }).start();
  };

  // Determine avatar gradient per channel type spec
  const getGradient = () => {
    switch (channel.type) {
      case 'group':
        return ['#7C3AED', '#A855F7']; // #7C3AED→#A855F7
      case 'dm':
        return ['#0EA5E9', '#38BDF8']; // #0EA5E9→#38BDF8
      case 'topic':
      default:
        return ['#22C55E', '#16A34A']; // #22C55E→#16A34A
    }
  };

  const getIcon = () => {
    switch (channel.type) {
      case 'group':
        return 'people';
      case 'dm':
        return 'person';
      case 'topic':
      default:
        return 'leaf';
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.channelRow,
          isActive && styles.channelRowActive
        ]}
      >
        {/* Left active marker bar */}
        {isActive && <View style={styles.activeIndicatorBar} />}

        {/* Left: channel avatar (40px circle, gradient background per channel type) */}
        <LinearGradient
          colors={getGradient()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarGradientCircle}
        >
          <Ionicons name={getIcon() as any} size={20} color="#FFFFFF" />
        </LinearGradient>

        {/* Center column */}
        <View style={styles.channelInfoColumn}>
          <View style={styles.channelRowTopLine}>
            <Text style={styles.channelNameText} numberOfLines={1}>
              {channel.name}
            </Text>
            {channel.lastMessage && (
              <Text style={styles.channelTimestampText}>
                {channel.lastMessage.createdAt}
              </Text>
            )}
          </View>

          {channel.description && (
            <Text style={styles.channelSubtitleText} numberOfLines={1}>
              {channel.description}
            </Text>
          )}

          {channel.lastMessage && (
            <Text style={styles.channelPreviewText} numberOfLines={1}>
              <Text style={{ fontWeight: '500', color: TOKENS.textSecondary }}>
                {channel.lastMessage.senderName}:{' '}
              </Text>
              {channel.lastMessage.content}
            </Text>
          )}
        </View>

        {/* Right: Unread Badge pill */}
        {channel.unreadCount > 0 && (
          <View style={styles.unreadBadgePill} accessibilityLabel={`${channel.unreadCount} unread messages`}>
            <Text style={styles.unreadBadgeText}>{channel.unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ============================================================================
// ━━━ 2. CHAT BUBBLE ━━━
// ============================================================================
interface Reaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

interface ChatBubbleProps {
  message: {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    createdAt: string;
    replyTo?: {
      senderName: string;
      preview: string;
    };
    reactions?: Reaction[];
  };
  isMe: boolean;
  showSenderHeader: boolean; // True if it's the FIRST message of consecutive block within 5 mins
  onLongPress: (messageId: string, pageY: number) => void;
  onReactionPress: (messageId: string, emoji: string) => void;
  onReactionLongPress: (messageId: string) => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isMe,
  showSenderHeader,
  onLongPress,
  onReactionPress,
  onReactionLongPress,
}) => {
  const slideAnim = useRef(new Animated.Value(12)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const bubbleRef = useRef<View>(null);

  useEffect(() => {
    // Micro-interaction: message bubble entrance: slide up 12px + fade in, 200ms
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLongPress = (event: any) => {
    const pageY = event.nativeEvent.pageY || 300;
    onLongPress(message.id, pageY);
  };

  return (
    <Animated.View
      style={[
        styles.bubbleRowContainer,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
          alignSelf: isMe ? 'flex-end' : 'flex-start',
        },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {/* Left Side: Avatar spacer for consecutive grouping */}
        {!isMe && (
          <View style={styles.leftAvatarSpacer}>
            {showSenderHeader ? (
              <View style={styles.avatarCirclePlaceholder}>
                <Text style={styles.avatarCircleText}>
                  {message.senderName.substring(0, 2).toUpperCase()}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        <View style={{ flex: 1, alignItems: isMe ? 'flex-end' : 'flex-start' }}>
          {/* Sender name row for others */}
          {!isMe && showSenderHeader && (
            <Text style={styles.senderHeaderName}>{message.senderName}</Text>
          )}

          <TouchableOpacity
            ref={bubbleRef}
            activeOpacity={0.9}
            onLongPress={handleLongPress}
            style={[
              styles.messageBubble,
              isMe ? styles.messageBubbleMe : styles.messageBubbleOther,
            ]}
          >
            {/* Replied-to quote preview block */}
            {message.replyTo && (
              <View style={styles.replyQuoteContainer}>
                <View style={styles.replyQuoteIndicatorBar} />
                <View style={styles.replyQuoteContent}>
                  <Text style={styles.replyQuoteSender}>{message.replyTo.senderName}</Text>
                  <Text style={styles.replyQuoteText} numberOfLines={1}>
                    {message.replyTo.preview}
                  </Text>
                </View>
              </View>
            )}

            {/* Bubble text content */}
            <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextOther]}>
              {message.content}
            </Text>

            {/* Outgoing metadata status & timestamp row */}
            <View style={styles.bubbleStatusRow}>
              {isMe && (
                <Feather
                  name="check"
                  size={12}
                  color={TOKENS.accentGlow}
                  style={styles.deliveryCheckIcon}
                />
              )}
            </View>
          </TouchableOpacity>

          {/* Reactions Row (aligned below bubble, not overlapping) */}
          {message.reactions && message.reactions.length > 0 && (
            <View style={styles.reactionsFeedRow}>
              {message.reactions.map((react, i) => (
                <ReactionPill
                  key={i}
                  react={react}
                  onPress={() => onReactionPress(message.id, react.emoji)}
                  onLongPress={() => onReactionLongPress(message.id)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Right Side: Spacer/Avatar placeholder for Me */}
        {isMe && (
          <View style={styles.rightAvatarSpacer}>
            {showSenderHeader ? (
              <View style={[styles.avatarCirclePlaceholder, { backgroundColor: TOKENS.accentMuted }]}>
                <Text style={styles.avatarCircleText}>ME</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </Animated.View>
  );
};

// ============================================================================
// ━━━ REACTION PILL COMPONENT ━━━
// ============================================================================
const ReactionPill: React.FC<{
  react: Reaction;
  onPress: () => void;
  onLongPress: () => void;
}> = ({ react, onPress, onLongPress }) => {
  const bounceAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    // Micro-interaction: emoji bounces scale 1.0 → 1.3 → 1.0
    Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: 1.3,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(bounceAnim, {
        toValue: 1.0,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePress}
        onLongPress={onLongPress}
        style={[
          styles.reactionPill,
          react.hasReacted && styles.reactionPillActive, // Active state has accent border
        ]}
      >
        <Text style={styles.reactionEmoji}>{react.emoji}</Text>
        <Text style={styles.reactionCountText}>{react.count}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ============================================================================
// ━━━ 3. EMOJI REACTION PICKER (Bottom Sheet) ━━━
// ============================================================================
const QUICK_EMOJIS = ['❤️', '👍', '🔥', '😂', '😮', '😢', '🙏', '🎉'];
const CATEGORY_TABS = [
  { icon: 'smile', key: 'smile' },
  { icon: 'heart', key: 'heart' },
  { icon: 'thumbs-up', key: 'thumbs' },
  { icon: 'star', key: 'star' },
  { icon: 'flag', key: 'flags' },
];

interface ReactionPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
}

export const ReactionPicker: React.FC<ReactionPickerProps> = ({ visible, onClose, onSelectEmoji }) => {
  const slideAnim = useRef(new Animated.Value(350)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Entrance animation: slide up 250ms ease-out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0.6,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(350);
      backdropOpacity.setValue(0);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 350,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      <View style={styles.sheetBackdropContainer}>
        {/* Backdrop blur fallback with opacity */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View style={[styles.sheetBackdrop, { opacity: backdropOpacity }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.bottomSheetCard,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Drag Handle pill */}
          <View style={styles.dragHandlePill} />

          {/* Top row: 8 quick-reaction emojis */}
          <View style={styles.quickEmojisRow}>
            {QUICK_EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.quickEmojiButton}
                onPress={() => {
                  onSelectEmoji(emoji);
                  handleClose();
                }}
              >
                <Text style={styles.quickEmojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.dividerLine} />

          {/* Full Emoji Keyboard mock with categories */}
          <Text style={styles.keyboardSectionTitle}>ALL EMOJIS</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.emojiKeyboardMockRow}
          >
            {['🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭', '🍎', '🍏', '🍐', '🍑', '🍒', '🍓', '🥝', '🍅', '🥥'].map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.keyboardEmojiButton}
                onPress={() => {
                  onSelectEmoji(emoji);
                  handleClose();
                }}
              >
                <Text style={styles.keyboardEmojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Category Tabs at bottom */}
          <View style={styles.categoryTabsRow}>
            {CATEGORY_TABS.map((tab) => (
              <TouchableOpacity key={tab.key} style={styles.categoryTabButton}>
                <Feather name={tab.icon as any} size={20} color={TOKENS.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ============================================================================
// ━━━ 4. CONTEXT MENU ━━━
// ============================================================================
interface ContextMenuProps {
  visible: boolean;
  anchorY: number; // Anchor coordinate near long-pressed bubble
  onClose: () => void;
  onAction: (action: string) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ visible, anchorY, onClose, onAction }) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Entrance animation: scale from 0.9 to 1.0 + fade in, 180ms ease-out
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.0,
          duration: 180,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1.0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  // Determine vertical offset based on bubble position to prevent screen edge overflow
  const menuTop = anchorY > height - 300 ? anchorY - 260 : anchorY + 20;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.contextModalBackdrop}>
          <Animated.View
            style={[
              styles.contextMenuCard,
              {
                top: menuTop,
                opacity: opacityAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Reply */}
            <TouchableOpacity style={styles.contextItem} onPress={() => { onAction('reply'); onClose(); }}>
              <Feather name="corner-up-left" size={16} color={TOKENS.textPrimary} style={styles.contextItemIcon} />
              <Text style={styles.contextItemText}>Reply</Text>
            </TouchableOpacity>

            {/* Copy */}
            <TouchableOpacity style={styles.contextItem} onPress={() => { onAction('copy'); onClose(); }}>
              <Feather name="copy" size={16} color={TOKENS.textPrimary} style={styles.contextItemIcon} />
              <Text style={styles.contextItemText}>Copy</Text>
            </TouchableOpacity>

            {/* Pin */}
            <TouchableOpacity style={styles.contextItem} onPress={() => { onAction('pin'); onClose(); }}>
              <Feather name="pin" size={16} color={TOKENS.textPrimary} style={styles.contextItemIcon} />
              <Text style={styles.contextItemText}>Pin Message</Text>
            </TouchableOpacity>

            {/* Edit */}
            <TouchableOpacity style={styles.contextItem} onPress={() => { onAction('edit'); onClose(); }}>
              <Feather name="edit-2" size={16} color={TOKENS.textPrimary} style={styles.contextItemIcon} />
              <Text style={styles.contextItemText}>Edit Message</Text>
            </TouchableOpacity>

            {/* Divider line before Delete */}
            <View style={styles.contextMenuDivider} />

            {/* Delete (always red danger style) */}
            <TouchableOpacity style={styles.contextItem} onPress={() => { onAction('delete'); onClose(); }}>
              <Feather name="trash-2" size={16} color={TOKENS.danger} style={styles.contextItemIcon} />
              <Text style={[styles.contextItemText, { color: TOKENS.danger }]}>Delete Message</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ============================================================================
// ━━━ 5. MESSAGE INPUT BAR ━━━
// ============================================================================
interface MessageInputBarProps {
  channelName: string;
  onSend: (text: string) => void;
}

export const MessageInputBar: React.FC<MessageInputBarProps> = ({ channelName, onSend }) => {
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const sendScale = useRef(new Animated.Value(1)).current;
  const quickActionsHeight = useRef(new Animated.Value(0)).current;

  // Animate Quick action bar slide down/up on focus
  useEffect(() => {
    Animated.timing(quickActionsHeight, {
      toValue: isFocused ? 36 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  const handleSend = () => {
    if (!text.trim()) return;

    // Send button micro-interaction: scale tap animation + send trigger
    Animated.sequence([
      Animated.timing(sendScale, {
        toValue: 0.85,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(sendScale, {
        toValue: 1.0,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    onSend(text);
    setText('');
  };

  const hasContent = text.trim().length > 0;

  return (
    <View style={styles.inputContainerWrapper}>
      {/* Quick-action bar above input (appears on focus) */}
      <Animated.View style={[styles.quickActionsBar, { height: quickActionsHeight, opacity: isFocused ? 1 : 0 }]}>
        <TouchableOpacity style={styles.quickActionIconButton}>
          <Feather name="image" size={18} color={TOKENS.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionIconButton}>
          <MaterialCommunityIcons name="gif" size={22} color={TOKENS.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionIconButton}>
          <Feather name="at-sign" size={18} color={TOKENS.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionIconButton}>
          <Feather name="hash" size={18} color={TOKENS.textSecondary} />
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.inputRowContainer}>
        {/* Left: ti-plus circle button for attachments */}
        <TouchableOpacity style={styles.attachmentCircleButton} activeOpacity={0.8}>
          <Feather name="plus" size={20} color={TOKENS.textPrimary} />
        </TouchableOpacity>

        {/* Center: rounded text input field */}
        <View style={styles.textInputFrame}>
          <TextInput
            style={styles.messageTextInput}
            placeholder={`Message #${channelName}`}
            placeholderTextColor={TOKENS.textMuted}
            value={text}
            onChangeText={setText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            multiline
          />
        </View>

        {/* Right: Active Send or Muted Microphone */}
        <Animated.View style={{ transform: [{ scale: sendScale }] }}>
          {hasContent ? (
            <TouchableOpacity
              onPress={handleSend}
              style={[styles.sendActionCircle, { backgroundColor: TOKENS.accentPrimary }]}
              activeOpacity={0.8}
            >
              <Feather name="send" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.sendActionCircle, { backgroundColor: TOKENS.bgElevated }]}
              activeOpacity={0.8}
            >
              <Feather name="mic" size={16} color={TOKENS.textMuted} />
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </View>
  );
};

// ============================================================================
// ━━━ DEMO SCREEN CONTAINER (COMMUNITY SCREEN) ━━━
// ============================================================================
export default function TempRedesignedMessaging() {
  const [activeChannelId, setActiveChannelId] = useState('1');
  const [activeScreen, setActiveScreen] = useState<'list' | 'chat'>('list');
  const [reactionMsgId, setReactionMsgId] = useState<string | null>(null);
  const [contextMsgId, setContextMsgId] = useState<string | null>(null);
  const [menuAnchorY, setMenuAnchorY] = useState(0);

  const mockChannels = [
    { id: '1', name: 'gf-baking-tips', type: 'topic' as const, description: 'Share recipes & yeast tips!', unreadCount: 3, lastMessage: { content: 'Sourdough flour arrived!', senderName: 'Yassi', createdAt: '10:42 AM' } },
    { id: '2', name: 'Celiac Support Group', type: 'group' as const, description: 'Medical guidelines and resources', unreadCount: 0, lastMessage: { content: 'Check this out.', senderName: 'Dr. Rayen', createdAt: 'Yesterday' } },
    { id: '3', name: 'Sarah Miller', type: 'dm' as const, description: 'Active now', unreadCount: 1, lastMessage: { content: 'Let\'s meet for gluten-free pizza!', senderName: 'Sarah', createdAt: 'May 28' } },
  ];

  const mockMessages = [
    { id: 'm1', senderId: 'u2', senderName: 'Dr. Rayen', content: 'Hello everyone! Welcome to the new redesigned gluten-free spaces.', createdAt: 'May 30, 2025' },
    { id: 'm2', senderId: 'u2', senderName: 'Dr. Rayen', content: 'Let me know if you need any baking recommendations or guides.', createdAt: 'May 30, 2025' }, // consecutive message within 5 mins
    { id: 'm3', senderId: 'me', senderName: 'Me', content: 'This chat UI bubble layout is beautiful. Love the green accents!', createdAt: 'May 30, 2025', replyTo: { senderName: 'Dr. Rayen', preview: 'Let me know if you need any baking recommendations...' }, reactions: [{ emoji: '👍', count: 3, hasReacted: true }, { emoji: '🔥', count: 5, hasReacted: false }] },
  ];

  const activeChan = mockChannels.find(c => c.id === activeChannelId) || mockChannels[0];

  const handleSend = (text: string) => {
    console.log('Sending message:', text);
  };

  const handleSelectEmoji = (emoji: string) => {
    console.log('Selected Emoji:', emoji, 'for message:', reactionMsgId);
    setReactionMsgId(null);
  };

  const handleContextAction = (action: string) => {
    console.log('Context action:', action, 'for message:', contextMsgId);
  };

  if (activeScreen === 'list') {
    return (
      <View style={styles.mainScreenContainer}>
        {/* HEADER BLOCK */}
        <View style={styles.screenHeaderContainer}>
          <Text style={styles.largeHeaderTitle}>Community</Text>
          <Text style={styles.subHeaderGreenTitle}>3 active channels</Text>

          {/* Search bar always visible */}
          <View style={styles.searchBarContainer}>
            <Feather name="search" size={16} color={TOKENS.textMuted} style={styles.searchIconPadding} />
            <TextInput
              style={styles.searchInputField}
              placeholder="Search channels..."
              placeholderTextColor={TOKENS.textMuted}
            />
          </View>

          {/* Scrollable pill filter tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsRow}>
            {['All', 'Active', 'Unread', 'Pinned'].map((pill, i) => (
              <TouchableOpacity
                key={pill}
                style={[
                  styles.filterPillButton,
                  i === 0 && styles.filterPillButtonActive,
                ]}
              >
                <Text style={[styles.filterPillText, i === 0 && styles.filterPillTextActive]}>
                  {pill}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* SECTIONS & CHANNEL LIST */}
        <ScrollView style={{ flex: 1 }}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderLabel}>YOUR SPACES</Text>
            <View style={styles.sectionCountPill}>
              <Text style={styles.sectionCountText}>3</Text>
            </View>
          </View>

          {mockChannels.map((channel) => (
            <ChannelListItem
              key={channel.id}
              channel={channel}
              isActive={channel.id === activeChannelId}
              onPress={() => {
                setActiveChannelId(channel.id);
                setActiveScreen('chat');
              }}
            />
          ))}

          <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
            <Text style={styles.sectionHeaderLabel}>EXPLORE COMMUNITIES</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllTextLink}>See all</Text>
            </TouchableOpacity>
          </View>

          {/* Explore Community card example */}
          <View style={styles.exploreGroupCard}>
            <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.exploreAvatar} />
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={styles.exploreGroupName}>Gluten-Free Restaurants</Text>
              <Text style={styles.exploreGroupSub} numberOfLines={1}>Discover local celiac friendly spots</Text>
            </View>
            {/* Join button states */}
            <TouchableOpacity style={styles.joinButtonOutlined}>
              <Text style={styles.joinButtonOutlinedText}>Join</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.mainScreenContainer}>
      {/* SCREEN 2: CHAT HEADER */}
      <View style={styles.chatScreenHeader}>
        <TouchableOpacity style={{ marginRight: 12 }} onPress={() => setActiveScreen('list')}>
          <Ionicons name="arrow-back" size={24} color={TOKENS.textPrimary} />
        </TouchableOpacity>

        <Feather name="hash" size={18} color={TOKENS.accentPrimary} style={{ marginRight: 4 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.chatHeaderNameText}>{activeChan.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <View style={styles.onlineStatusDot} />
            <Text style={styles.chatHeaderSubtitle}>128 members</Text>
          </View>
        </View>

        {/* Right action button icons */}
        <View style={styles.chatHeaderActionsRow}>
          <TouchableOpacity style={styles.headerIconButton}>
            <Feather name="search" size={18} color={TOKENS.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButton}>
            <Feather name="phone" size={18} color={TOKENS.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButton}>
            <Feather name="more-vertical" size={18} color={TOKENS.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Date floating pill separator */}
      <View style={styles.dateSeparatorPill}>
        <Text style={styles.dateSeparatorText}>Today</Text>
      </View>

      {/* CHAT MESSAGES FEED */}
      <FlatList
        data={mockMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          // Message grouping: only show avatar/name if first message of group from sender
          const isPrevFromSameSender = index > 0 && mockMessages[index - 1].senderId === item.senderId;
          const showSenderHeader = !isPrevFromSameSender;

          return (
            <ChatBubble
              message={item}
              isMe={item.senderId === 'me'}
              showSenderHeader={showSenderHeader}
              onLongPress={(messageId, pageY) => {
                setContextMsgId(messageId);
                setMenuAnchorY(pageY);
              }}
              onReactionPress={(messageId, emoji) => console.log('Toggled reaction:', emoji)}
              onReactionLongPress={(messageId) => setReactionMsgId(messageId)}
            />
          );
        }}
        contentContainerStyle={styles.chatFeedScrollArea}
      />

      {/* MESSAGE INPUT BAR */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <MessageInputBar channelName={activeChan.name} onSend={handleSend} />
      </KeyboardAvoidingView>

      {/* BOTTOM SHEET REACTION PICKER */}
      <ReactionPicker
        visible={!!reactionMsgId}
        onClose={() => setReactionMsgId(null)}
        onSelectEmoji={handleSelectEmoji}
      />

      {/* FLOATING CONTEXT MENU */}
      <ContextMenu
        visible={!!contextMsgId}
        anchorY={menuAnchorY}
        onClose={() => setContextMsgId(null)}
        onAction={handleContextAction}
      />
    </View>
  );
}

// ============================================================================
// ━━━ STYLE SHEET DEFINITIONS ━━━
// ============================================================================
const styles = StyleSheet.create({
  // Main background tokens mapping
  mainScreenContainer: {
    flex: 1,
    backgroundColor: TOKENS.bgPrimary, // TOKENS.bgPrimary
  },

  // ── SCREEN 1: CHANNEL LIST STYLES ──
  screenHeaderContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingBottom: 16,
    backgroundColor: TOKENS.bgCard, // TOKENS.bgCard
    borderBottomWidth: 0.5,
    borderBottomColor: TOKENS.borderDefault,
  },
  largeHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: TOKENS.textPrimary, // TOKENS.textPrimary
  },
  subHeaderGreenTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: TOKENS.accentGlow, // TOKENS.accentGlow
    marginTop: 2,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.bgElevated, // TOKENS.bgElevated
    borderRadius: TOKENS.radiusInput,
    height: 40,
    marginTop: 14,
    paddingHorizontal: 12,
  },
  searchIconPadding: {
    marginRight: 8,
  },
  searchInputField: {
    flex: 1,
    color: TOKENS.textPrimary,
    fontSize: 14,
  },
  filterPillsRow: {
    flexDirection: 'row',
    marginTop: 14,
    paddingRight: 20,
  },
  filterPillButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TOKENS.borderSubtle,
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  filterPillButtonActive: {
    backgroundColor: TOKENS.accentPrimary, // Active state bg token
    borderColor: TOKENS.accentPrimary,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: TOKENS.textSecondary,
  },
  filterPillTextActive: {
    color: '#0D0D14', // Active tab black text
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: TOKENS.textMuted,
    letterSpacing: 1,
  },
  sectionCountPill: {
    backgroundColor: TOKENS.bgElevated,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  sectionCountText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: TOKENS.textSecondary,
  },
  seeAllTextLink: {
    fontSize: 12,
    fontWeight: '600',
    color: TOKENS.accentPrimary,
    marginLeft: 'auto',
  },

  // Channel rows
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 72,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: TOKENS.borderDefault,
    backgroundColor: 'transparent',
  },
  channelRowActive: {
    backgroundColor: '#1A1A2E', // Active background spec
  },
  activeIndicatorBar: {
    position: 'absolute',
    left: 0,
    width: 3,
    height: '100%',
    backgroundColor: TOKENS.accentPrimary,
  },
  avatarGradientCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelInfoColumn: {
    flex: 1,
    marginLeft: 12,
  },
  channelRowTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  channelNameText: {
    fontSize: 15,
    fontWeight: '600',
    color: TOKENS.textPrimary,
  },
  channelSubtitleText: {
    fontSize: 12,
    color: TOKENS.textSecondary,
    marginTop: 2,
  },
  channelPreviewText: {
    fontSize: 11,
    color: TOKENS.textMuted,
    marginTop: 2,
  },
  channelTimestampText: {
    fontSize: 10,
    color: TOKENS.textMuted,
  },
  unreadBadgePill: {
    backgroundColor: TOKENS.accentPrimary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // Explore community card
  exploreGroupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.bgCard,
    borderRadius: TOKENS.radiusBase,
    padding: 14,
    marginHorizontal: 20,
    marginVertical: 6,
  },
  exploreAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  exploreGroupName: {
    fontSize: 14,
    fontWeight: '600',
    color: TOKENS.textPrimary,
  },
  exploreGroupSub: {
    fontSize: 11,
    color: TOKENS.textMuted,
    marginTop: 2,
  },
  joinButtonOutlined: {
    borderWidth: 1,
    borderColor: TOKENS.accentPrimary,
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
  },
  joinButtonOutlinedText: {
    fontSize: 12,
    fontWeight: '600',
    color: TOKENS.accentPrimary,
  },

  // ── SCREEN 2: CHAT SCREEN STYLES ──
  chatScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingBottom: 12,
    backgroundColor: TOKENS.bgCard,
    borderBottomWidth: 0.5,
    borderBottomColor: TOKENS.borderDefault,
  },
  chatHeaderNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: TOKENS.textPrimary,
  },
  onlineStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TOKENS.accentPrimary,
    marginRight: 4,
  },
  chatHeaderSubtitle: {
    fontSize: 12,
    color: TOKENS.textMuted,
  },
  chatHeaderActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  dateSeparatorPill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.8)', // semi-transparent dark bg (#111827/80)
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginTop: 16,
    zIndex: 10,
  },
  dateSeparatorText: {
    fontSize: 11,
    fontWeight: '600',
    color: TOKENS.textSecondary,
  },
  chatFeedScrollArea: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },

  // Message Bubbles layout
  bubbleRowContainer: {
    marginVertical: 4,
    maxWidth: '85%',
  },
  leftAvatarSpacer: {
    width: 32,
    marginRight: 8,
    justifyContent: 'flex-end',
  },
  rightAvatarSpacer: {
    width: 32,
    marginLeft: 8,
    justifyContent: 'flex-end',
  },
  avatarCirclePlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TOKENS.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircleText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: TOKENS.textPrimary,
  },
  senderHeaderName: {
    fontSize: 12,
    fontWeight: '500',
    color: TOKENS.textSecondary,
    marginBottom: 2,
  },
  messageBubble: {
    borderRadius: TOKENS.radiusBubble,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  messageBubbleMe: {
    backgroundColor: TOKENS.accentPrimary, // Own message green background
    borderBottomRightRadius: 4,             // Flat bottom-right corner
  },
  messageBubbleOther: {
    backgroundColor: TOKENS.bgElevated,     // Incoming message card background
    borderBottomLeftRadius: 4,              // Flat bottom-left corner
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 19,
  },
  bubbleTextMe: {
    color: '#FFFFFF',
  },
  bubbleTextOther: {
    color: '#E5E7EB',
  },
  bubbleStatusRow: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  deliveryCheckIcon: {
    marginLeft: 4,
  },

  // Replied to quote blocks
  replyQuoteContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 6,
    padding: 6,
    marginBottom: 6,
  },
  replyQuoteIndicatorBar: {
    width: 3,
    backgroundColor: TOKENS.accentPrimary,
    borderRadius: 1.5,
  },
  replyQuoteContent: {
    marginLeft: 8,
    flex: 1,
  },
  replyQuoteSender: {
    fontSize: 11,
    fontWeight: 'bold',
    color: TOKENS.accentGlow,
  },
  replyQuoteText: {
    fontSize: 11,
    color: TOKENS.textSecondary,
    fontStyle: 'italic',
  },

  // Reactions pills
  reactionsFeedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B', // dark bg (#1E293B)
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 4,
    marginVertical: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  reactionPillActive: {
    borderColor: TOKENS.accentPrimary, // Own reaction pill border
  },
  reactionEmoji: {
    fontSize: 12,
  },
  reactionCountText: {
    fontSize: 11,
    color: TOKENS.textSecondary,
    marginLeft: 4,
  },

  // ── EMOJI REACTION PICKER BOTTOM SHEET STYLES ──
  sheetBackdropContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  bottomSheetCard: {
    backgroundColor: '#111827', // dark bg #111827
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    height: 320, // Sheet height 320px
  },
  dragHandlePill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: TOKENS.borderSubtle,
    alignSelf: 'center',
    marginVertical: 10,
  },
  quickEmojisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  quickEmojiButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickEmojiText: {
    fontSize: 24,
  },
  dividerLine: {
    height: 0.5,
    backgroundColor: TOKENS.borderDefault,
    marginVertical: 8,
  },
  keyboardSectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: TOKENS.textMuted,
    letterSpacing: 0.5,
    marginVertical: 6,
  },
  emojiKeyboardMockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
  },
  keyboardEmojiButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  keyboardEmojiText: {
    fontSize: 22,
  },
  categoryTabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 0.5,
    borderTopColor: TOKENS.borderDefault,
    paddingTop: 12,
    marginTop: 'auto',
  },
  categoryTabButton: {
    padding: 8,
  },

  // ── FLOATING CONTEXT MENU STYLES ──
  contextModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  contextMenuCard: {
    position: 'absolute',
    alignSelf: 'center',
    width: 200, // Width 200px
    backgroundColor: '#1E293B', // dark bg #1E293B
    borderRadius: 16,
    paddingVertical: 6,
    borderWidth: 0.5,
    borderColor: '#374151', // border 0.5px #374151
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  contextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44, // 44px item height
    paddingHorizontal: 16,
  },
  contextItemIcon: {
    marginRight: 12,
    width: 20, // Icon left 20px spacer bound
    textAlign: 'center',
  },
  contextItemText: {
    fontSize: 14, // label 14px
    color: TOKENS.textPrimary,
  },
  contextMenuDivider: {
    height: 0.5,
    backgroundColor: '#374151',
    marginVertical: 4,
  },

  // ── MESSAGE INPUT BAR STYLES ──
  inputContainerWrapper: {
    backgroundColor: '#111827', // Background #111827
    borderTopWidth: 0.5,
    borderTopColor: '#1F2937', // Border #1F2937
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  quickActionIconButton: {
    marginRight: 16,
    paddingVertical: 4,
  },
  inputRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56, // Height: 56px
  },
  attachmentCircleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B', // #1E293B bg for attachments
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  textInputFrame: {
    flex: 1,
    height: 40,
    backgroundColor: '#1E293B', // bg #1E293B
    borderRadius: TOKENS.radiusInput,
    paddingHorizontal: 16,
    justifyContent: 'center',
    marginRight: 10,
  },
  messageTextInput: {
    color: TOKENS.textPrimary,
    fontSize: 13,
  },
  sendActionCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
