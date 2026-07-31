import { useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export function useRealtime(
  table: 'trades' | 'comments',
  onInsert?: (payload: any) => void,
  onUpdate?: (payload: any) => void,
  onDelete?: (payload: any) => void
) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const supabase = getSupabase();
    
    const channel = supabase.channel(`realtime_${table}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: table },
        (payload) => {
          if (onInsert) onInsert(payload.new);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: table },
        (payload) => {
          if (onUpdate) onUpdate(payload.new);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: table },
        (payload) => {
          if (onDelete) onDelete(payload.old);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, table, onInsert, onUpdate, onDelete]);
}
