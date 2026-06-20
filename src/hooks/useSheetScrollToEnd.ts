import { useCallback, useEffect, useRef } from 'react';
import { Platform, ScrollView } from 'react-native';
import { useWebViewportMetrics } from './useVisualViewportInset';

type ScrollOptions = { animated?: boolean };

const END_SCROLL_FOLLOW_MS = 600;

function runAfterLayout(fn: () => void) {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => requestAnimationFrame(fn));
    return;
  }
  fn();
}

export function useSheetScrollToEnd(
  scrollRef: React.RefObject<ScrollView | null>,
  active = true,
) {
  const endScrollActiveRef = useRef(false);
  const endScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const webViewport = useWebViewportMetrics(active && Platform.OS === 'web');

  const scrollToY = useCallback((y: number, { animated = true }: ScrollOptions = {}) => {
    runAfterLayout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y), animated });
    });
  }, [scrollRef]);

  const scrollToEnd = useCallback(({ animated = true }: ScrollOptions = {}) => {
    const doScroll = () => scrollRef.current?.scrollToEnd({ animated });
    runAfterLayout(doScroll);

    if (Platform.OS === 'web') {
      endScrollActiveRef.current = true;
      if (endScrollTimerRef.current) clearTimeout(endScrollTimerRef.current);
      endScrollTimerRef.current = setTimeout(() => {
        endScrollActiveRef.current = false;
      }, END_SCROLL_FOLLOW_MS);
    }
  }, [scrollRef]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !active || !endScrollActiveRef.current) return;
    runAfterLayout(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, [active, webViewport.bottomInset, webViewport.visibleHeight, scrollRef]);

  useEffect(() => () => {
    if (endScrollTimerRef.current) clearTimeout(endScrollTimerRef.current);
  }, []);

  return { scrollToEnd, scrollToY };
}
