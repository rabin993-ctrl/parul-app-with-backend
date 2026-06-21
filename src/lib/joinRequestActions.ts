import { supabase } from './supabase';
import type { CircleJoinRequestProfile } from '../hooks/useCircleJoinRequests';

export type JoinRequestActionKind = 'accept' | 'decline';

/** Optimistically dismiss, run RPC, then resync in the background. */
export function runJoinRequestAction(
  kind: JoinRequestActionKind,
  req: CircleJoinRequestProfile,
  onOptimistic: () => void,
  resync: () => Promise<void>,
): void {
  onOptimistic();
  const rpc = kind === 'accept' ? 'accept_circle_request' : 'decline_circle_request';
  void supabase.rpc(rpc, { p_request_id: req.id }).then(({ error }) => {
    if (error) {
      void resync();
      return;
    }
    void resync();
  });
}

export function runJoinRequestActionsBatch(
  kind: JoinRequestActionKind,
  requests: CircleJoinRequestProfile[],
  onOptimistic: () => void,
  resync: () => Promise<void>,
): void {
  if (requests.length === 0) return;
  onOptimistic();
  const rpc = kind === 'accept' ? 'accept_circle_request' : 'decline_circle_request';
  void Promise.all(requests.map(req => supabase.rpc(rpc, { p_request_id: req.id }))).then(results => {
    if (results.some(r => r.error)) {
      void resync();
      return;
    }
    void resync();
  });
}
