import { useEffect } from 'react';
import { Platform } from 'react-native';

const STYLE_ID = 'paw-web-input-focus-reset-v2';
const VIEWPORT_META_SELECTOR = 'meta[name="viewport"]';

function ensureMobileWebViewportMeta() {
  if (typeof document === 'undefined') return;

  let meta = document.querySelector(VIEWPORT_META_SELECTOR) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'viewport';
    document.head.appendChild(meta);
  }

  const required = [
    'width=device-width',
    'initial-scale=1',
    'viewport-fit=cover',
    'interactive-widget=resizes-content',
  ];
  const parts = new Set(
    (meta.content || 'width=device-width, initial-scale=1')
      .split(',')
      .map(part => part.trim())
      .filter(Boolean),
  );
  for (const token of required) parts.add(token);
  meta.content = [...parts].join(', ');
}

export function WebInputFocusFix() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    ensureMobileWebViewportMeta();

    if (document.getElementById(STYLE_ID)) return;

    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = `
      html, body, #root {
        max-width: 100%;
        overflow-x: clip;
      }
      textarea:focus,
      input:focus,
      textarea:focus-visible,
      input:focus-visible {
        outline: none !important;
        box-shadow: none !important;
      }
      @supports (-webkit-touch-callout: none) {
        textarea, input, select {
          font-size: max(16px, 1em) !important;
        }
      }
      div[aria-modal="true"] {
        background-color: transparent !important;
      }
      [data-mention-scroll="true"]::-webkit-scrollbar {
        display: none;
        width: 0;
        height: 0;
      }
      [data-sheet-body-dimmed="true"]::-webkit-scrollbar {
        display: none;
        width: 0;
        height: 0;
      }
    `;
    document.head.appendChild(el);
  }, []);

  return null;
}
