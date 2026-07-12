import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/context/theme.context';
import { PerformanceProfiler } from '@/shared/utils/performance-profiler';

interface SearchBarProps {
  value: string;
  onChangeQuery: (query: string) => void;
}

export const SearchBar = React.memo(({ value, onChangeQuery }: SearchBarProps) => {
  const { theme: T } = useTheme();
  const [localQuery, setLocalQuery] = useState(value);
  const isFirstRender = useRef(true);

  // Sync localQuery when value prop changes from parent
  useEffect(() => {
    setLocalQuery(value);
  }, [value]);

  // Debounce query change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const handler = setTimeout(() => {
      PerformanceProfiler.start('SearchFiltering');
      onChangeQuery(localQuery);
      PerformanceProfiler.end('SearchFiltering', 'Search');
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [localQuery, onChangeQuery]);

  return (
    <View style={[styles.searchContainer, { backgroundColor: T.inputBg }]}>
      <Ionicons name="search" size={18} color={T.textMuted} />
      <TextInput
        style={[styles.searchInput, { color: T.text }]}
        placeholder="Search"
        placeholderTextColor={T.textMuted}
        value={localQuery}
        onChangeText={setLocalQuery}
        returnKeyType="search"
      />
      {localQuery.length > 0 && (
        <TouchableOpacity onPress={() => setLocalQuery('')}>
          <Ionicons name="close-circle" size={18} color={T.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 44,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
    padding: 0,
  },
});
