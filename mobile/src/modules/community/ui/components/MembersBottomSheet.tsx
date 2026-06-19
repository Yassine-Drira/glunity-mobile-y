import React, { useRef, useEffect } from 'react';
import { View, Text, Modal, Pressable, Animated, PanResponder, Dimensions, TouchableOpacity, Image, FlatList, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MembersBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  channel: any;
  members: any[];
  membersLoading: boolean;
  isAdmin: boolean;
  user: any;
  allUsers: any[];
  showAddList: boolean;
  setShowAddList: (val: boolean) => void;
  selectedToAdd: string[];
  toggleSelectToAdd: (id: string) => void;
  addMembers: () => void;
  adding: boolean;
  removeMember: (id: string) => void;
  openEditSheet: () => void;
  copyChannelLink: () => void;
  fetchMembers: () => void;
  theme: any;
  isRTL: boolean;
  t: (key: string) => string;
  isDark: boolean;
  BlurView: any;
  onPressMemberAvatar?: (userId: string) => void;
}

export function MembersBottomSheet({
  visible,
  onClose,
  channel,
  members,
  membersLoading,
  isAdmin,
  user,
  allUsers,
  showAddList,
  setShowAddList,
  selectedToAdd,
  toggleSelectToAdd,
  addMembers,
  adding,
  removeMember,
  openEditSheet,
  copyChannelLink,
  fetchMembers,
  theme: T,
  isRTL,
  t,
  isDark,
  BlurView,
  onPressMemberAvatar,
}: MembersBottomSheetProps) {
  const SHEET_HEIGHT = Dimensions.get('window').height * 0.8;
  const sheetAnim = useRef(new Animated.Value(0)).current; // 0 closed, 1 open
  const pan = useRef(new Animated.Value(0)).current;
  const overlayFallback = 'rgba(0, 0, 0, 0.45)';

  const isDM = React.useMemo(() => {
    const name = channel?.name;
    const type = channel?.type;
    return (
      (typeof name === 'string' && name.startsWith('DM-')) ||
      type === 'direct' ||
      type === 'dm' ||
      (Array.isArray(members) && members.length === 2 && !name)
    );
  }, [channel, members]);

  const displayTitle = React.useMemo(() => {
    if (!channel) return '';
    if (!isDM) return channel.name || t('Group');

    const desc = channel.description || channel.desc;
    const dmPrefix = 'Direct Message between ';
    if (desc && typeof desc === 'string' && desc.startsWith(dmPrefix)) {
      const namesStr = desc.substring(dmPrefix.length);
      const parts = namesStr.split(' and ');
      if (parts.length === 2) {
        return parts[0] === user?.fullName ? parts[1] : parts[0];
      }
    }

    const other = (members || []).find((m: any) => m && String(m._id || m.id) !== String(user?._id));
    if (other) {
      return other.fullName || other.name || other.displayName;
    }

    return t('Direct Message');
  }, [channel, members, user, isDM, t]);

  const displayDescription = React.useMemo(() => {
    if (!channel) return '';
    if (!isDM) return channel.description || '';
    return t('Direct Message');
  }, [channel, isDM, t]);

  const displayAvatar = React.useMemo(() => {
    if (!isDM) return channel?.avatarUrl || channel?.icon || null;
    const other = (members || []).find((m: any) => m && String(m._id || m.id) !== String(user?._id));
    return other?.avatarUrl || other?.avatar || channel?.avatarUrl || null;
  }, [channel, members, user, isDM]);

  useEffect(() => {
    if (visible) {
      pan.setValue(0);
      Animated.timing(sheetAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
      fetchMembers();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(sheetAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
      onClose();
    });
  };

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
    onPanResponderMove: (_, g) => {
      if (g.dy > 0) pan.setValue(g.dy);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 120) {
        handleClose();
      } else {
        Animated.timing(pan, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      }
    }
  })).current;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      {BlurView ? (
        <Pressable onPress={handleClose} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
          <BlurView intensity={60} tint={isDark ? 'dark' : 'light'} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
        </Pressable>
      ) : (
        <Pressable onPress={handleClose} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: overlayFallback }} />
      )}

      <Animated.View
        {...panResponder.panHandlers}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: SHEET_HEIGHT,
          bottom: 0,
          backgroundColor: T.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: 12,
          transform: [{ translateY: Animated.add(sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [SHEET_HEIGHT, 0] }), pan) }]
        }}
      >
        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          <View style={{ width: 48, height: 4, borderRadius: 2, backgroundColor: T.divider }} />
        </View>

        {/* Header: Group photo + main info */}
        <View style={{ alignItems: 'center', marginBottom: 12 }}>
          <View style={{ width: 96, height: 96, borderRadius: 48, overflow: 'hidden', backgroundColor: T.surfaceAlt, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, elevation: 6 }}>
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={{ width: 96, height: 96 }} />
            ) : (
              <Ionicons name={isDM ? "person" : "people"} size={44} color={T.textMuted} />
            )}
          </View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: T.text, marginTop: 10 }}>{displayTitle}</Text>
          {displayDescription ? <Text style={{ color: T.textMuted, textAlign: 'center', marginTop: 6 }}>{displayDescription}</Text> : null}
          <Text style={{ color: T.textMuted, marginTop: 6 }}>{members.length} {t('members')}</Text>
        </View>

        {/* Quick action buttons */}
        {!isDM && (
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <TouchableOpacity onPress={() => { if (isAdmin) setShowAddList(true); else Alert.alert(t('Permission denied')); }} style={{ flex: 1, marginRight: 8, padding: 10, borderRadius: 12, backgroundColor: T.surfaceAlt, alignItems: 'center' }}>
              <Ionicons name="person-add-outline" size={22} color={T.text} style={{ marginBottom: 4 }} />
              <Text style={{ color: T.text, fontWeight: '700', marginTop: 2 }}>{t('Add')}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { handleClose(); openEditSheet(); }} style={{ flex: 1, marginHorizontal: 8, padding: 10, borderRadius: 12, backgroundColor: T.surfaceAlt, alignItems: 'center' }}>
              <Ionicons name="create-outline" size={22} color={T.text} style={{ marginBottom: 4 }} />
              <Text style={{ color: T.text, fontWeight: '700', marginTop: 2 }}>{t('Edit')}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={copyChannelLink} style={{ flex: 1, marginLeft: 8, padding: 10, borderRadius: 12, backgroundColor: T.surfaceAlt, alignItems: 'center' }}>
              <Ionicons name="share-social-outline" size={22} color={T.text} style={{ marginBottom: 4 }} />
              <Text style={{ color: T.text, fontWeight: '700', marginTop: 2 }}>{t('Share')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Members summary card + full list */}
        <View style={{ backgroundColor: T.surfaceAlt, borderRadius: 12, padding: 12, marginBottom: 12 }}>
          <Text style={{ color: T.textMuted, fontWeight: '800', marginBottom: 8 }}>{t('MEMBERS')}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: T.text }}>{t('Members')}: {members.length}</Text>
            <Text style={{ color: T.text }}>{t('Administrators')}: {(members || []).filter((m: any) => (m.role || '').toLowerCase().includes('admin')).length}</Text>
          </View>
        </View>

        <Text style={{ color: T.textMuted, marginBottom: 8 }}>{t('Member list')}</Text>
        {membersLoading ? <ActivityIndicator style={{ marginVertical: 20 }} /> : (
          members && members.length > 0 ? (
            <FlatList
              data={members}
              keyExtractor={(i) => String(i._id || i.id)}
              style={{ flex: 1 }}
              renderItem={({ item }) => (
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.divider }}>
                  <TouchableOpacity onPress={() => { handleClose(); onPressMemberAvatar?.(item._id || item.id); }} activeOpacity={0.8}>
                    <Image source={{ uri: item.avatarUrl || item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.fullName || item.name || 'U')}&background=8BC34A&color=fff` }} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12 }} />
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: T.text, fontWeight: '700' }}>{item.fullName || item.name || item.displayName || item._id}</Text>
                    <Text style={{ color: T.textMuted, fontSize: 12 }}>{item.role || item.profileType || 'Membre'}</Text>
                  </View>
                  {isAdmin && String(item._id || item.id) !== String(user?._id) ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity onPress={() => removeMember(item._id || item.id)} style={{ padding: 8 }}>
                        <Ionicons name="trash" size={18} color="#D9534F" />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              )}
            />
          ) : (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <Text style={{ color: T.textMuted, marginBottom: 8 }}>Aucun membre listé pour ce groupe.</Text>
              <Text style={{ color: T.textMuted, fontSize: 12, marginBottom: 12 }}>Channel keys: {channel ? Object.keys(channel).join(', ') : 'n/a'}</Text>
              <TouchableOpacity onPress={fetchMembers} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#2ECC71' }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Rafraîchir</Text>
              </TouchableOpacity>
            </View>
          )
        )}

        <View style={{ paddingVertical: 8 }}>
          {isAdmin ? (
            <>
              {!showAddList ? (
                <TouchableOpacity onPress={() => setShowAddList(true)} style={{ backgroundColor: '#8BC34A', padding: 12, borderRadius: 10, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Ajouter des membres</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ height: 220 }}>
                  <FlatList
                    data={(allUsers || []).filter(u => !(members || []).some((m: any) => String(m._id || m.id) === String(u._id || u.id)))}
                    keyExtractor={(i) => String(i._id || i.id)}
                    renderItem={({ item }) => {
                      const isSel = selectedToAdd.includes(String(item._id || item.id));
                      return (
                        <TouchableOpacity onPress={() => toggleSelectToAdd(String(item._id || item.id))} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
                          <TouchableOpacity onPress={() => { handleClose(); onPressMemberAvatar?.(item._id || item.id); }} activeOpacity={0.8}>
                            <Image source={{ uri: item.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.fullName || item.name || 'U')}&background=8BC34A&color=fff` }} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12 }} />
                          </TouchableOpacity>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: T.text, fontWeight: '700' }}>{item.fullName || item.name}</Text>
                            <Text style={{ color: T.textMuted, fontSize: 12 }}>{item.profileType || ''}</Text>
                          </View>
                          <View style={{ width: 44, alignItems: 'center' }}>
                            <TouchableOpacity onPress={() => toggleSelectToAdd(String(item._id || item.id))} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isSel ? '#8BC34A' : T.surfaceAlt, justifyContent: 'center', alignItems: 'center' }}>
                              {isSel ? <Ionicons name="checkmark" size={18} color="#fff" /> : <Ionicons name="add" size={18} color={T.text} />}
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                  />
                  <View style={{ flexDirection: 'row', marginTop: 8 }}>
                    <TouchableOpacity onPress={() => { setShowAddList(false); }} style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: T.surfaceAlt, alignItems: 'center', marginRight: 8 }}>
                      <Text style={{ color: T.text }}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={addMembers} style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#2ECC71', alignItems: 'center' }} disabled={adding}>
                      <Text style={{ color: '#fff', fontWeight: '700' }}>{adding ? '...' : 'Ajouter'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          ) : null}
        </View>
      </Animated.View>
    </Modal>
  );
}
