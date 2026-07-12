import React, { useCallback } from 'react';
import { FlatList, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '@/shared/context/theme.context';
import { ShareItem } from './ShareItem';

interface UserListProps {
  users: any[];
  selectedRecipients: Set<string>;
  onToggle: (id: string) => void;
  loadMore: () => void;
  loadingMore: boolean;
  hasMore: boolean;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
}

const ITEM_HEIGHT = 128;

export const UserList = React.memo(({
  users,
  selectedRecipients,
  onToggle,
  loadMore,
  loadingMore,
  hasMore,
  ListHeaderComponent,
}: UserListProps) => {
  const { theme: T } = useTheme();

  // Optimised getItemLayout for 3-column grid
  const getItemLayout = useCallback((data: any, index: number) => {
    const row = Math.floor(index / 3);
    return {
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * row,
      index,
    };
  }, []);

  const renderItem = useCallback(({ item }: { item: any }) => {
    return (
      <ShareItem
        item={item}
        selected={selectedRecipients.has(item.id)}
        onToggle={onToggle}
        layout="grid"
      />
    );
  }, [selectedRecipients, onToggle]);

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.gridList}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        removeClippedSubviews={true}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={5}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color="#6DAE3F" style={styles.footerLoader} />
          ) : null
        }
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gridList: {
    paddingHorizontal: 6,
    paddingBottom: 120, // Leave space for composer
  },
  footerLoader: {
    marginVertical: 16,
  },
});
