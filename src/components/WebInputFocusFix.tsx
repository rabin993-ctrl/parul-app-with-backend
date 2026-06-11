import { useEffect } from 'react';
import { Platform } from 'react-native';

const STYLE_ID = 'paw-web-input-focus-reset';

export function WebInputFocusFix() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    if (document.getElementById(STYLE_ID)) return;

    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = `
      textarea:focus,
      input:focus,
      textarea:focus-visible,
      input:focus-visible {
        outline: none !important;
        box-shadow: none !important;
      }
    `;
    document.head.appendChild(el);
  }, []);

  return null;
}
