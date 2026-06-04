import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';

interface Props {
  page: number;
  totalPages: number;
  loading?: boolean;
  onPageChange: (newPage: number) => void;
}

/**
 * Compact 3-button pagination bar:
 *   [prev]  [page - 1]  [page ●]  [page + 1]  [next]
 * Only shows adjacent pages that exist.
 * Active page has a filled green square with a subtle glow.
 * Inactive pages are outlined rounded squares matching the app surface.
 */
export default function PaginationBar({ page, totalPages, loading = false, onPageChange }: Props) {
  const { theme: T } = useTheme();
  const { isRTL } = useLanguage();

  if (totalPages <= 1) return null;

  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;

  const s = StyleSheet.create({
    row: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 20,
    },
    arrowBtn: {
      width: 38,
      height: 38,
      borderRadius: 8,
      backgroundColor: T.surface,
      borderWidth: 1,
      borderColor: T.border,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 1,
    },
    arrowDisabled: {
      opacity: 0.28,
    },
    numBtn: {
      width: 38,
      height: 38,
      borderRadius: 8,
      backgroundColor: T.surface,
      borderWidth: 1,
      borderColor: T.border,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 1,
    },
    numBtnActive: {
      backgroundColor: T.green,
      borderColor: T.green,
      shadowColor: T.green,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 4,
    },
    numBtnAdjacent: {
      backgroundColor: T.surface,
      borderColor: T.border,
      opacity: 0.75,
    },
    numText: {
      fontSize: 13,
      fontFamily: 'Poppins_600SemiBold',
      fontWeight: '600',
      color: T.text,
    },
    numTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    infoText: {
      fontSize: 11,
      fontFamily: 'Poppins_400Regular',
      color: T.textMuted,
      marginHorizontal: 4,
    },
  });

  if (loading) {
    return (
      <View style={s.row}>
        <ActivityIndicator size="small" color={T.green} />
      </View>
    );
  }

  return (
    <View style={s.row}>
      {/* ◀ Prev arrow */}
      <TouchableOpacity
        disabled={!prevPage}
        onPress={() => prevPage && onPageChange(prevPage)}
        style={[s.arrowBtn, !prevPage && s.arrowDisabled]}
        activeOpacity={0.7}
        id="pagination-prev"
      >
        <Feather
          name={isRTL ? 'chevron-right' : 'chevron-left'}
          size={17}
          color={T.text}
        />
      </TouchableOpacity>

      {/* Prev page number (if exists) */}
      {prevPage && (
        <TouchableOpacity
          onPress={() => onPageChange(prevPage)}
          style={[s.numBtn, s.numBtnAdjacent]}
          activeOpacity={0.7}
          id={`pagination-page-${prevPage}`}
        >
          <Text style={s.numText}>{prevPage}</Text>
        </TouchableOpacity>
      )}

      {/* Current page (active) */}
      <TouchableOpacity
        style={[s.numBtn, s.numBtnActive]}
        activeOpacity={1}
        id={`pagination-page-${page}`}
      >
        <Text style={[s.numText, s.numTextActive]}>{page}</Text>
      </TouchableOpacity>

      {/* Next page number (if exists) */}
      {nextPage && (
        <TouchableOpacity
          onPress={() => onPageChange(nextPage)}
          style={[s.numBtn, s.numBtnAdjacent]}
          activeOpacity={0.7}
          id={`pagination-page-${nextPage}`}
        >
          <Text style={s.numText}>{nextPage}</Text>
        </TouchableOpacity>
      )}

      {/* ▶ Next arrow */}
      <TouchableOpacity
        disabled={!nextPage}
        onPress={() => nextPage && onPageChange(nextPage)}
        style={[s.arrowBtn, !nextPage && s.arrowDisabled]}
        activeOpacity={0.7}
        id="pagination-next"
      >
        <Feather
          name={isRTL ? 'chevron-left' : 'chevron-right'}
          size={17}
          color={T.text}
        />
      </TouchableOpacity>
    </View>
  );
}
