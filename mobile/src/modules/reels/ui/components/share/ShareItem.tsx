import React, { useEffect } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/context/theme.context';
import FastImage from '@/shared/components/FastImage';

interface ShareItemProps {
  item: {
    id: string;
    name: string;
    avatarUrl: string | null;
    subtitle?: string;
    isChannel: boolean;
  };
  selected: boolean;
  onToggle: (id: string) => void;
  layout?: 'grid' | 'list';
}

export const ShareItem = React.memo(({ item, selected, onToggle, layout = 'grid' }: ShareItemProps) => {
  const { theme: T } = useTheme();
  const avatarSize = layout === 'grid' ? 80 : 44;
  const badgeScale = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    badgeScale.value = withTiming(selected ? 1 : 0, { duration: 200 });
  }, [selected]);

  const animatedBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
    opacity: badgeScale.value,
  }));

  const handlePress = () => {
    onToggle(item.id);
  };

  if (layout === 'list') {
    return (
      <TouchableOpacity
        style={[styles.listItemContainer, { borderBottomColor: T.border }]}
        activeOpacity={0.8}
        onPress={handlePress}
      >
        <View style={styles.listItemLeft}>
          <View style={{ width: avatarSize, height: avatarSize }}>
            <FastImage
              source={item.avatarUrl ? { uri: item.avatarUrl } : { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=fff&color=8A8A8E` }}
              style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
              contentFit="cover"
            />
          </View>
          <View style={styles.listTextContainer}>
            <Text numberOfLines={1} style={[styles.listName, { color: T.text }]}>{item.name}</Text>
            {item.subtitle ? <Text numberOfLines={1} style={[styles.listSubtitle, { color: T.textMuted }]}>{item.subtitle}</Text> : null}
          </View>
        </View>
        
        <View style={[styles.listCheckbox, { borderColor: T.border, backgroundColor: selected ? '#2E74FF' : 'transparent' }]}>
          {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  }

  // Grid layout (default)
  return (
    <TouchableOpacity
      style={styles.gridItemContainer}
      activeOpacity={0.8}
      onPress={handlePress}
    >
      <View style={{ width: avatarSize, height: avatarSize }}>
        <FastImage
          source={item.avatarUrl ? { uri: item.avatarUrl } : { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=fff&color=8A8A8E` }}
          style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
          contentFit="cover"
        />
        <Animated.View style={[styles.checkBadge, animatedBadgeStyle]} pointerEvents="none">
          <View style={styles.checkBadgeInner}>
            <Ionicons name="checkmark" size={14} color="#fff" />
          </View>
        </Animated.View>
      </View>
      <Text numberOfLines={1} style={[styles.gridName, { color: T.text }]}>{item.name}</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  gridItemContainer: {
    flex: 1 / 3,
    padding: 12,
    alignItems: 'center',
    height: 128,
  },
  avatar: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  gridName: {
    marginTop: 8,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 84,
  },
  checkBadge: {
    position: 'absolute',
    right: -6,
    bottom: -6,
  },
  checkBadgeInner: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2E74FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2E74FF',
    shadowOpacity: 0.16,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  listItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  listName: {
    fontSize: 15,
    fontWeight: '600',
  },
  listSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  listCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
