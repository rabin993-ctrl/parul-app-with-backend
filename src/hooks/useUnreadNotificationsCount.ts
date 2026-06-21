import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { INBOX_TYPES } from '../utils/notificationDisplay';

export function useUnreadNotificationsCount(): number {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) { setCount(0); return; }

    const fetchCount = () => {
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('read', false)
        .in('type', [...INBOX_TYPES])
        .then(({ count: c }) => setCount(c ?? 0));
    };

    fetchCount();

    const channel = supabase
      .channel(`unread_count:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` },
        fetchCount,
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  return count;
}
