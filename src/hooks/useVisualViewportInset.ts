import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

function readKeyboardInset(): number {
  if (typeof window === 'undefined') return 0;
  const vv = window.visualViewport;
  if (!vv) return 0;
  return Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
}

/** Bottom inset when the mobile browser keyboard shrinks the visual viewport (web only). */
export function useVisualViewportInset(active = true): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'web' || !active || typeof window === 'undefined') {
      setInset(0);
      return;
    }

    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => setInset(readKeyboardInset());

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('resize', update);

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [active]);

  return inset;
}
