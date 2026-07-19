import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSocket } from './socket.context';
import { BadgeUnlockOverlay } from '../components/BadgeUnlockOverlay';

interface BadgeInfo {
  icon: string;
  name: string;
}

interface BadgeUnlockContextProps {
  triggerUnlock: (badge: BadgeInfo) => void;
}

const BadgeUnlockContext = createContext<BadgeUnlockContextProps | undefined>(undefined);

export function BadgeUnlockProvider({ children }: { children: React.ReactNode }) {
  const { socket } = useSocket();
  const [activeBadge, setActiveBadge] = useState<BadgeInfo | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleNotification = (notif: any) => {
      // Only display the badge unlock animation for real badge achievements.
      if (notif?.type !== 'achievement') return;

      const badgeIcon = notif.metadata?.badgeIcon;
      const badgeName = notif.metadata?.badgeName;
      const title = notif.title || '';

      const hasBadgeMetadata = Boolean(badgeIcon || badgeName);
      const looksLikeBadgeNotification = title.includes('New Badge Unlocked');

      if (!hasBadgeMetadata && !looksLikeBadgeNotification) return;

      setActiveBadge({
        icon: badgeIcon || '',
        name:
          badgeName ||
          title.replace('New Badge Unlocked: ', '').replace('! 🛡️', '').trim() ||
          'Badge',
      });
    };

    socket.on('notification:new', handleNotification);
    return () => {
      socket.off('notification:new', handleNotification);
    };
  }, [socket]);

  const triggerUnlock = (badge: BadgeInfo) => {
    setActiveBadge(badge);
  };

  return (
    <BadgeUnlockContext.Provider value={{ triggerUnlock }}>
      {children}
      {activeBadge && (
        <BadgeUnlockOverlay
          badge={activeBadge}
          onClose={() => setActiveBadge(null)}
        />
      )}
    </BadgeUnlockContext.Provider>
  );
}

export function useBadgeUnlock() {
  const context = useContext(BadgeUnlockContext);
  if (!context) {
    throw new Error('useBadgeUnlock must be used within a BadgeUnlockProvider');
  }
  return context;
}
