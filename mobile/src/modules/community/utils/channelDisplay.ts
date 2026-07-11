export function getChannelDisplay(channel: any, currentUser?: any) {
  const tName = (s: any) => (s && typeof s === 'string' ? s : null);
  if (!channel) return { name: 'Chat', avatar: null, isDM: false };

  // Detect DM
  const parts = channel.participants || channel.members || channel.userIds || channel.participantIds || [];
  const explicitDMByName = Boolean(tName(channel.name)?.startsWith('DM-'));
  const explicitDMByType = Boolean(channel.type === 'direct' || channel.type === 'dm' || String(channel.type).toUpperCase() === 'DM');

  // Treat as DM only when explicitly indicated by name/type or when there are exactly two participants
  // AND the channel is not explicitly declared as a group/channel type. This prevents tiny group
  // channels (channels with only two members) from being misclassified as direct messages.
  const implicitDMByParticipants = Array.isArray(parts) && parts.length === 2 && !channel.type;

  const isDM = explicitDMByName || explicitDMByType || implicitDMByParticipants;

  if (isDM) {
    // Try to resolve the other participant name/avatar.
    // Backend now populates fullName + avatarUrl into each participant entry,
    // so we can resolve names immediately without a separate /users call.
    let other: any = null;
    if (Array.isArray(parts) && parts.length > 0) {
      const myId = String(currentUser?._id || currentUser?.id || '');
      // Find the participant that is NOT the current user.
      // Support both enriched objects ({ userId, fullName, avatarUrl }) and plain id strings.
      const otherEntry = parts.find((p: any) => {
        const pid = typeof p === 'string' ? p : String(p.userId || p._id || p.id || '');
        return pid && pid !== myId;
      });

      if (otherEntry) {
        if (typeof otherEntry === 'string') {
          other = { _id: otherEntry, fullName: null, avatarUrl: null };
        } else {
          // Prefer populated name from the enriched backend response
          const pid = String(otherEntry.userId || otherEntry._id || otherEntry.id || '');
          other = {
            _id: pid,
            id: pid,
            fullName: otherEntry.fullName || otherEntry.name || otherEntry.displayName || null,
            avatarUrl: otherEntry.avatarUrl || otherEntry.avatar || null,
          };
        }
      }
    }

    const name = other?.fullName || other?.name || other?.displayName || channel.name || 'Direct Message';
    const avatar = other?.avatarUrl || other?.avatar || channel.avatarUrl || null;
    return { name, avatar, isDM: true };
  }

  // Non-DM: prefer channel's explicit display fields
  const name = channel.name || channel.displayName || channel.description || 'Channel';
  let avatar = channel.avatarUrl || channel.photoUrl || channel.image || null;

  // Fallback to creator/owner avatar if channel has none
  if (!avatar) {
    const creatorId = channel.createdBy || channel.createdById || channel.creator || channel.creatorId || channel.ownerId || null;
    if (creatorId) {
      if (typeof creatorId === 'object') {
        avatar = creatorId.avatarUrl || creatorId.avatar || null;
      } else {
        if (Array.isArray(parts) && parts.length > 0) {
          const creatorObj = parts.find((p: any) => {
            const pId = p && (p.userId?._id || p.userId || p._id || p.id || p);
            return pId && String(pId) === String(creatorId);
          });
          if (creatorObj) avatar = creatorObj.avatarUrl || creatorObj.avatar || (creatorObj.user && (creatorObj.user.avatarUrl || creatorObj.user.avatar)) || null;
        }
      }
    }
  }

  return { name, avatar, isDM: false };
}

export default { getChannelDisplay };
