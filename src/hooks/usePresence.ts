import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface PresenceUser {
  uid: string;
  email: string;
  name: string;
  avatar: string;
  online_at: string;
}

export function usePresence(journalOwnerUid: string | null) {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!user || !journalOwnerUid) return;

    const supabase = getSupabase();
    const channel = supabase.channel(`presence_${journalOwnerUid}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: PresenceUser[] = [];
        
        // Convert presence state object to array of unique users
        Object.keys(state).forEach((key) => {
          const presences = state[key] as any[];
          if (presences && presences.length > 0) {
            users.push(presences[0] as PresenceUser);
          }
        });
        
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const presencePayload: PresenceUser = {
            uid: user.id,
            email: user.email || '',
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown',
            avatar: user.user_metadata?.avatar_url || '',
            online_at: new Date().toISOString(),
          };
          await channel.track(presencePayload);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, journalOwnerUid]);

  return { onlineUsers };
}
