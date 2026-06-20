import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/** True on narrow/coarse-pointer mobile browsers (not desktop web). */
export function useMobileWeb(): boolean {
  const [mobileWeb, setMobileWeb] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const check = () => {
      const width = window.visualViewport?.width ?? window.innerWidth;
      const narrow = width < 768;
      const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
      setMobileWeb(narrow || coarse);
    };

    check();
    window.visualViewport?.addEventListener('resize', check);
    window.addEventListener('resize', check);
    const coarseQuery = window.matchMedia?.('(pointer: coarse)');
    coarseQuery?.addEventListener?.('change', check);

    return () => {
      window.visualViewport?.removeEventListener('resize', check);
      window.removeEventListener('resize', check);
      coarseQuery?.removeEventListener?.('change', check);
    };
  }, []);

  return mobileWeb;
}
