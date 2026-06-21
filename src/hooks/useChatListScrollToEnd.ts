import { useCallback, useEffect, useRef } from 'react';
import { FlatList, Platform } from 'react-native';
import { useWebViewportMetrics } from './useVisualViewportInset';

type ScrollOptions = { animated?: boolean };

const END_SCROLL_FOLLOW_MS = 600;
const OPEN_SCROLL_RETRIES_MS = [0, 50, 150, 400] as const;

function runAfterLayout(fn: () => void) {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => requestAnimationFrame(fn));
    return;
  }
  fn();
}

export function useChatListScrollToEnd<T>(
  listRef: React.RefObject<FlatList<T> | null>,
  active = true,
) {
  const endScrollActiveRef = useRef(false);
  const endScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const webViewport = useWebViewportMetrics(active && Platform.OS === 'web');

  const scrollToLatest = useCallback(({ animated = false }: ScrollOptions = {}) => {
    const doScroll = () => listRef.current?.scrollToEnd({ animated });
    runAfterLayout(doScroll);

    if (Platform.OS === 'web') {
      endScrollActiveRef.current = true;
      if (endScrollTimerRef.current) clearTimeout(endScrollTimerRef.current);
      endScrollTimerRef.current = setTimeout(() => {
        endScrollActiveRef.current = false;
      }, END_SCROLL_FOLLOW_MS);
    }
  }, [listRef]);

  const scrollToLatestWithRetries = useCallback(({ animated = false }: ScrollOptions = {}) => {
    for (const delay of OPEN_SCROLL_RETRIES_MS) {
      if (delay === 0) {
        scrollToLatest({ animated });
      } else {
        setTimeout(() => scrollToLatest({ animated }), delay);
      }
    }
  }, [scrollToLatest]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !active || !endScrollActiveRef.current) return;
    runAfterLayout(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [active, webViewport.bottomInset, webViewport.visibleHeight, listRef]);

  useEffect(() => () => {
    if (endScrollTimerRef.current) clearTimeout(endScrollTimerRef.current);
  }, []);

  return { scrollToLatest, scrollToLatestWithRetries };
}
