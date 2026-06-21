type CircleDbId = string;

type CirclePreviewSyncListener = (circleDbId: CircleDbId) => void;
type InvalidateListener = () => void;

const readListeners = new Set<CirclePreviewSyncListener>();
const invalidateListeners = new Set<InvalidateListener>();
let activeCircleChatDbId: CircleDbId | null = null;

/** Circle chat currently open — suppress unread for that circle in previews. */
export function setActiveCircleChatDbId(circleDbId: CircleDbId | null) {
  activeCircleChatDbId = circleDbId;
}

export function getActiveCircleChatDbId(): CircleDbId | null {
  return activeCircleChatDbId;
}

/** Optimistically clear unread for a circle preview. */
export function onCircleMarkedRead(listener: CirclePreviewSyncListener): () => void {
  readListeners.add(listener);
  return () => readListeners.delete(listener);
}

export function emitCircleMarkedRead(circleDbId: CircleDbId) {
  for (const listener of readListeners) {
    listener(circleDbId);
  }
}

export function onCircleReadInvalidate(listener: InvalidateListener): () => void {
  invalidateListeners.add(listener);
  return () => invalidateListeners.delete(listener);
}

export function emitCircleReadInvalidate() {
  for (const listener of invalidateListeners) {
    listener();
  }
}
