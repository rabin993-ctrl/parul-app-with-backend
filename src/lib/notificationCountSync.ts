type CountAdjustListener = (delta: number) => void;

const listeners = new Set<CountAdjustListener>();

/** Subscribe to optimistic badge count adjustments (negative = read). */
export function onNotificationCountAdjust(listener: CountAdjustListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Apply an optimistic badge delta until realtime/db count catches up. */
export function adjustNotificationCount(delta: number) {
  for (const listener of listeners) {
    listener(delta);
  }
}
