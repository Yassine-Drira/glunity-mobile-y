import React from 'react';
import { FlatList, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/context/theme.context';
import { ShareItem } from './ShareItem';

interface GroupListProps {
  groups: any[];
  selectedRecipients: Set<string>;
  onToggle: (id: string) => void;
}

export const GroupList = React.memo(({ groups, selectedRecipients, onToggle }: GroupListProps) => {
  const { theme: T } = useTheme();

  if (groups.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: T.textMuted }]}>Groups</Text>
      <FlatList
        horizontal
        data={groups}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
        renderItem={({ item }) => (
          <ShareItem
            item={item}
            selected={selectedRecipients.has(item.id)}
            onToggle={onToggle}
            layout="grid"
          />
        )}
        removeClippedSubviews={true}
        initialNumToRender={5}
        windowSize={3}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  horizontalList: {
    paddingHorizontal: 12,
  },
});
