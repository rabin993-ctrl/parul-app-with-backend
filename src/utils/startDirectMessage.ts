import { supabase } from '../lib/supabase';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseStartDmError(error: { message?: string } | null): string {
  const message = error?.message ?? '';
  if (message.includes('yourself')) return "You can't message yourself";
  if (message.includes('only accepts messages from circle members')) {
    return 'This user only accepts messages from circle members';
  }
  if (message.includes('does not accept')) return 'This user does not accept messages';
  if (message.includes('blocked')) return 'Unable to message this user';
  return 'Could not open message thread';
}

export async function startDirectMessage(
  recipientUserId: string,
): Promise<{ threadId: string } | { error: string }> {
  if (!UUID_RE.test(recipientUserId)) {
    return { error: 'Could not open message thread' };
  }

  const { data: threadId, error } = await supabase.rpc('start_dm', {
    p_other_user_id: recipientUserId,
  });

  if (error || !threadId) {
    return { error: parseStartDmError(error) };
  }

  return { threadId: threadId as string };
}
