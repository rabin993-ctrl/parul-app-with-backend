import { useEffect, useState } from 'react';
import { Dimensions, Platform } from 'react-native';

export type WebViewportMetrics = {
  /** Space obscured at the bottom (keyboard and/or browser chrome). */
  bottomInset: number;
  /** Visible viewport height from the top of the layout viewport. */
  visibleHeight: number;
  /** Visual viewport offset from the top of the layout viewport (iOS Safari scroll shift). */
  offsetTop: number;
};

function readWebViewportMetrics(): WebViewportMetrics {
  if (typeof window === 'undefined') {
    const h = Dimensions.get('window').height;
    return { bottomInset: 0, visibleHeight: h, offsetTop: 0 };
  }

  const vv = window.visualViewport;
  if (!vv) {
    return { bottomInset: 0, visibleHeight: window.innerHeight, offsetTop: 0 };
  }

  const bottomInset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
  const visibleHeight = Math.round(vv.offsetTop + vv.height);
  const offsetTop = Math.round(vv.offsetTop);

  return { bottomInset, visibleHeight, offsetTop };
}

/** Bottom inset when the mobile browser keyboard shrinks the visual viewport (web only). */
export function useVisualViewportInset(active = true): number {
  return useWebViewportMetrics(active).bottomInset;
}

/** Visual viewport size and bottom obstruction for mobile web sheets. */
export function useWebViewportMetrics(active = true): WebViewportMetrics {
  const fallback = Dimensions.get('window').height;
  const [metrics, setMetrics] = useState<WebViewportMetrics>(() => (
    Platform.OS === 'web' ? readWebViewportMetrics() : { bottomInset: 0, visibleHeight: fallback, offsetTop: 0 }
  ));

  useEffect(() => {
    if (Platform.OS !== 'web' || !active || typeof window === 'undefined') {
      setMetrics({ bottomInset: 0, visibleHeight: fallback, offsetTop: 0 });
      return;
    }

    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => setMetrics(readWebViewportMetrics());

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('resize', update);

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [active, fallback]);

  return metrics;
}
