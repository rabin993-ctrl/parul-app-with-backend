// Parul icon set — exact paths from icons.jsx, translated to react-native-svg
import React from 'react';
import { Platform } from 'react-native';
import Svg, { Path, Circle, Ellipse, Rect } from 'react-native-svg';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  fill?: string;
  sw?: number;
}

type P = {
  color: string;
  sw: number;
  vb?: string;
};

const S = ({ size, color, sw, children, vb = '0 0 24 24' }: {
  size: number; color: string; sw: number; children: React.ReactNode; vb?: string;
}) => (
  <Svg
    width={size}
    height={size}
    viewBox={vb}
    fill="none"
    style={Platform.select({
      web: { width: size, height: size, minWidth: size, minHeight: size, flexShrink: 0 },
      default: { flexShrink: 0 },
    })}
  >
    {children}
  </Svg>
);

function stroke(color: string, sw: number) {
  return { stroke: color, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
}

function renderIcon(name: string, color: string, sw: number): React.ReactNode {
  const s = stroke(color, sw);
  switch (name) {

    // ── Brand ──────────────────────────────────────────────────────────────
    case 'paw':
      return <>
        <Ellipse cx="6.2" cy="9.4" rx="2.1" ry="2.7" transform="rotate(-18 6.2 9.4)" fill={color}/>
        <Ellipse cx="10" cy="6.4" rx="2.1" ry="2.8" fill={color}/>
        <Ellipse cx="14" cy="6.4" rx="2.1" ry="2.8" fill={color}/>
        <Ellipse cx="17.8" cy="9.4" rx="2.1" ry="2.7" transform="rotate(18 17.8 9.4)" fill={color}/>
        <Path d="M12 11.4c2.7 0 5 1.9 5 4.3 0 2-1.7 3.1-3.4 3.1-0.7 0-1.1-.3-1.6-.3s-.9.3-1.6.3C8.7 18.8 7 17.7 7 15.7c0-2.4 2.3-4.3 5-4.3Z" fill={color}/>
      </>;

    case 'paw-line':
      return <>
        <Ellipse cx="6.4" cy="9.6" rx="1.8" ry="2.3" transform="rotate(-18 6.4 9.6)" {...s}/>
        <Ellipse cx="10" cy="6.8" rx="1.8" ry="2.4" {...s}/>
        <Ellipse cx="14" cy="6.8" rx="1.8" ry="2.4" {...s}/>
        <Ellipse cx="17.6" cy="9.6" rx="1.8" ry="2.3" transform="rotate(18 17.6 9.6)" {...s}/>
        <Path d="M12 11.6c2.4 0 4.5 1.7 4.5 3.9 0 1.8-1.5 2.8-3 2.8-.7 0-1-.3-1.5-.3s-.8.3-1.5.3c-1.5 0-3-1-3-2.8 0-2.2 2.1-3.9 4.5-3.9Z" {...s}/>
      </>;

    // ── Nav ────────────────────────────────────────────────────────────────
    case 'home':
      return <>
        <Path d="M4 11.4 12 4.5l8 6.9" {...s}/>
        <Path d="M5.6 10v8.2c0 .7.5 1.3 1.2 1.3h10.4c.7 0 1.2-.6 1.2-1.3V10" {...s}/>
        <Circle cx="12" cy="14.6" r="1.5" fill={color} stroke="none"/>
      </>;

    case 'circles':
      return <>
        <Circle cx="9" cy="9.2" r="3.1" {...s}/>
        <Path d="M3.5 19c.4-2.8 2.7-4.6 5.5-4.6s5.1 1.8 5.5 4.6" {...s}/>
        <Path d="M16 7.2a3 3 0 0 1 0 5.8" {...s}/>
        <Path d="M17.4 14.6c1.9.5 3.3 2 3.6 4" {...s}/>
      </>;

    case 'adoption':
      return <>
        <Path d="M4 11 12 4.5 20 11" {...s}/>
        <Path d="M6 9.6V19h12V9.6" {...s}/>
        <Path d="M12 17.6c-1.8-1.2-3.2-2.4-3.2-3.9 0-1 .8-1.7 1.7-1.7.7 0 1.2.4 1.5.9.3-.5.8-.9 1.5-.9.9 0 1.7.7 1.7 1.7 0 1.5-1.4 2.7-3.2 3.9Z" fill={color} stroke="none"/>
      </>;

    case 'communities':
      return <>
        <Circle cx="12" cy="8" r="2.5" {...s}/>
        <Circle cx="5.5" cy="15" r="2.2" {...s}/>
        <Circle cx="18.5" cy="15" r="2.2" {...s}/>
        <Path d="M12 10.6v3M9.7 9.4 6.8 13.4M14.3 9.4l2.9 4" {...s}/>
      </>;

    case 'bell':
      return <>
        <Path d="M6.5 10.5a5.5 5.5 0 0 1 11 0c0 4 1.3 5.2 1.8 5.7.3.3.1.8-.3.8H5c-.4 0-.6-.5-.3-.8.5-.5 1.8-1.7 1.8-5.7Z" {...s}/>
        <Path d="M10.2 19.4a2 2 0 0 0 3.6 0" {...s}/>
      </>;

    case 'bell-slash':
      return <>
        <Path d="M6.5 10.5a5.5 5.5 0 0 1 11 0c0 4 1.3 5.2 1.8 5.7.3.3.1.8-.3.8H5c-.4 0-.6-.5-.3-.8.5-.5 1.8-1.7 1.8-5.7Z" {...s}/>
        <Path d="M10.2 19.4a2 2 0 0 0 3.6 0" {...s}/>
        <Path d="M4 4L20 20" {...s}/>
      </>;

    case 'user':
      return <>
        <Circle cx="12" cy="8.4" r="3.4" {...s}/>
        <Path d="M5.5 19.5c.5-3.4 3.2-5.4 6.5-5.4s6 2 6.5 5.4" {...s}/>
      </>;

    case 'users':
      return <>
        <Circle cx="9" cy="9" r="3" {...s}/>
        <Path d="M3.5 19c.4-2.8 2.7-4.6 5.5-4.6s5.1 1.8 5.5 4.6" {...s}/>
        <Circle cx="16" cy="9" r="2.8" {...s}/>
        <Path d="M12.5 19c.3-2.4 2.2-4 4.5-4s4.2 1.6 4.5 4" {...s}/>
      </>;

    case 'user-plus':
      return <>
        <Circle cx="9" cy="8.2" r="3" {...s}/>
        <Path d="M4 19.5c.5-3 2.8-5 5-5s4.5 2 5 5" {...s}/>
        <Path d="M17 8v6M14 11h6" {...s}/>
      </>;

    // ── Actions ───────────────────────────────────────────────────────────
    case 'comment':
      return <Path d="M4.5 11.4c0-3.6 3.2-6.2 7.5-6.2s7.5 2.6 7.5 6.2-3.2 6.2-7.5 6.2c-.9 0-1.7-.1-2.5-.3l-3.6 1.5.9-3A5.7 5.7 0 0 1 4.5 11.4Z" {...s}/>;

    case 'at':
      return <>
        <Circle cx="12" cy="12" r="7.2" {...s}/>
        <Path d="M12 8.4c-1.6 0-2.8 1.1-2.8 2.6 0 1.4 1.2 2.5 2.8 2.5 1 0 1.8-.4 2.3-1.1v3.2" {...s}/>
        <Path d="M15.2 12.4c0 2.2-1.8 3.8-4 3.8-2.4 0-4.2-1.9-4.2-4.4S8.8 7.4 11.2 7.4c1.3 0 2.4.5 3.1 1.3" {...s}/>
      </>;

    case 'forward':
      return <Path d="M13 5.5 20 11l-7 5.5v-3c-4.5 0-7.2 1.4-8.5 4 0-5.5 2.8-8.4 8.5-8.6V5.5Z" {...s}/>;

    case 'bookmark-line':
      return <Path d="M6.5 4.8h11a.8.8 0 0 1 .8.8v13.1c0 .6-.7 1-1.2.6L12 16.4l-5.1 3.9c-.5.4-1.2 0-1.2-.6V5.6a.8.8 0 0 1 .8-.8Z" {...s}/>;

    case 'bookmark':
      return <Path d="M6.5 4.8h11a.8.8 0 0 1 .8.8v13.1c0 .6-.7 1-1.2.6L12 16.4l-5.1 3.9c-.5.4-1.2 0-1.2-.6V5.6a.8.8 0 0 1 .8-.8Z" fill={color} stroke="none"/>;

    case 'more':
    case 'more-horizontal':
      return <>
        <Circle cx="5.5" cy="12" r="1.4" fill={color} stroke="none"/>
        <Circle cx="12" cy="12" r="1.4" fill={color} stroke="none"/>
        <Circle cx="18.5" cy="12" r="1.4" fill={color} stroke="none"/>
      </>;

    case 'plus':
      return <Path d="M12 5v14M5 12h14" {...s}/>;

    case 'search':
      return <>
        <Circle cx="10.6" cy="10.6" r="5.6" {...s}/>
        <Path d="m15 15 4 4" {...s}/>
      </>;

    case 'filter':
      return <Path d="M4.5 6.5h15M7 12h10M10 17.5h4" {...s}/>;

    case 'sliders':
      return <>
        <Path d="M4 7h16" {...s}/>
        <Circle cx="8" cy="7" r="2" fill={color} stroke="none"/>
        <Path d="M4 12h16" {...s}/>
        <Circle cx="14" cy="12" r="2" fill={color} stroke="none"/>
        <Path d="M4 17h16" {...s}/>
        <Circle cx="10" cy="17" r="2" fill={color} stroke="none"/>
      </>;

    case 'close':
      return <Path d="m6.5 6.5 11 11M17.5 6.5l-11 11" {...s}/>;

    case 'check':
      return <Path d="m5 12.5 4.5 4.5L19 7" {...s}/>;

    case 'check-circle':
      return <>
        <Circle cx="12" cy="12" r="8.2" {...s}/>
        <Path d="m8.5 12.2 2.4 2.4 4.6-4.8" {...s}/>
      </>;

    case 'chevronRight':
      return <Path d="m9.5 5.5 6.5 6.5-6.5 6.5" {...s}/>;

    case 'chevronLeft':
      return <Path d="m14.5 5.5-6.5 6.5 6.5 6.5" {...s}/>;

    case 'chevronDown':
      return <Path d="m5.5 9 6.5 6.5L18.5 9" {...s}/>;

    case 'arrowRight':
      return <>
        <Path d="M4.5 12h14" {...s}/>
        <Path d="M13 6.5 18.5 12 13 17.5" {...s}/>
      </>;

    case 'back':
      return <>
        <Path d="M19 12H5.5" {...s}/>
        <Path d="M11 5.5 5 12l6 6.5" {...s}/>
      </>;

    // ── Content ───────────────────────────────────────────────────────────
    case 'camera':
      return <>
        <Path d="M4.5 8.8h2.7l1.2-1.9h7.2l1.2 1.9h2.7c.6 0 1 .5 1 1v7.5c0 .6-.4 1-1 1H4.5c-.6 0-1-.4-1-1V9.8c0-.5.4-1 1-1Z" {...s}/>
        <Circle cx="12" cy="13" r="2.9" {...s}/>
      </>;

    case 'image':
      return <>
        <Rect x="4" y="5" width="16" height="14" rx="2.4" {...s}/>
        <Circle cx="9" cy="10" r="1.6" {...s}/>
        <Path d="m5 16.5 4-3.6 3.4 3 2.6-2.3L19 16.4" {...s}/>
      </>;

    case 'paperclip':
      return <Path d="M8.5 14.2a3.6 3.6 0 0 0 5.1-5.1l4.8-4.8a2.4 2.4 0 0 0-3.4-3.4l-5.2 5.2a1.8 1.8 0 1 0 2.5 2.5l4.8-4.8" {...s}/>;

    case 'mic':
      return <>
        <Rect x="9.2" y="4.5" width="5.6" height="9.2" rx="2.8" {...s}/>
        <Path d="M7 11.5a5 5 0 0 0 10 0M12 16.5V19" {...s}/>
      </>;

    case 'pause':
      return <>
        <Rect x="7.5" y="6" width="3.2" height="12" rx="1" fill={color} stroke="none"/>
        <Rect x="13.3" y="6" width="3.2" height="12" rx="1" fill={color} stroke="none"/>
      </>;

    case 'mapPin':
      return <>
        <Path d="M12 21c4-3.6 6-6.7 6-9.6A6 6 0 0 0 6 11.4C6 14.3 8 17.4 12 21Z" {...s}/>
        <Circle cx="12" cy="11.2" r="2.2" {...s}/>
      </>;

    case 'clock':
      return <>
        <Circle cx="12" cy="12" r="8" {...s}/>
        <Path d="M12 7.6V12l3 1.8" {...s}/>
      </>;

    case 'calendar':
      return <>
        <Rect x="4.5" y="5.5" width="15" height="14" rx="2.2" {...s}/>
        <Path d="M4.5 9.5h15M8.5 3.8v3.4M15.5 3.8v3.4" {...s}/>
      </>;

    case 'send':
      return <>
        <Path d="M20 4 4 11l6 2.4M20 4l-5 16-4.9-6.6M20 4 10.1 13.4" {...s}/>
      </>;

    case 'edit':
      return <>
        <Path d="M15.5 5.5 18.5 8.5 9 18l-3.6.8L6 15.2 15.5 5.5Z" {...s}/>
        <Path d="M14 7 17 10" {...s}/>
      </>;

    case 'trash':
      return <>
        <Path d="M3 6h18" {...s}/>
        <Path d="M8 6V4h8v2M19 6l-1 14H6L5 6" {...s}/>
        <Path d="M10 11v6M14 11v6" {...s}/>
      </>;

    case 'heart':
      return <Path d="M12 19.5c-4.8-3-7.5-5.9-7.5-9.2A4 4 0 0 1 12 7.6a4 4 0 0 1 7.5 2.7c0 3.3-2.7 6.2-7.5 9.2Z" {...s}/>;

    case 'star':
      return <Path d="m12 4.5 2.3 4.7 5.2.7-3.8 3.6.9 5.1L12 16.9l-4.6 2.4.9-5.1-3.8-3.6 5.2-.7L12 4.5Z" {...s}/>;

    case 'menu':
      return <>
        <Path d="M4 7h16" {...s}/>
        <Path d="M4 12h16" {...s}/>
        <Path d="M4 17h16" {...s}/>
      </>;

    case 'settings':
      return <>
        <Path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" {...s}/>
        <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0-.33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" {...s}/>
      </>;

    case 'lock':
      return <>
        <Rect x="5" y="11" width="14" height="10" rx="2" {...s}/>
        <Path d="M8 11V7.5a4 4 0 1 1 8 0V11" {...s}/>
      </>;

    case 'sun':
      return <>
        <Circle cx="12" cy="12" r="4" {...s}/>
        <Path d="M12 2.8v2.2M12 19v2.2M21.2 12H19M5 12H2.8M18.4 5.6 16.9 7.1M7.1 16.9 5.6 18.4M18.4 18.4 16.9 16.9M7.1 7.1 5.6 5.6" {...s}/>
      </>;

    case 'moon':
      return <Path d="M19.5 14.3A7.5 7.5 0 0 1 9.7 4.5 7.5 7.5 0 1 0 19.5 14.3Z" {...s}/>;

    case 'sparkle':
      return <>
        <Path d="M12 4.5c.4 3.4 1.6 4.6 5 5-3.4.4-4.6 1.6-5 5-.4-3.4-1.6-4.6-5-5 3.4-.4 4.6-1.6 5-5Z" {...s}/>
        <Path d="M18.5 13c.2 1.4.7 1.9 2 2-1.3.2-1.8.7-2 2-.2-1.3-.7-1.8-2-2 1.3-.1 1.8-.6 2-2Z" {...s}/>
      </>;

    // ── Pet / health ──────────────────────────────────────────────────────
    case 'shield':
      return <>
        <Path d="M12 4.2 18.5 6v5c0 4-2.7 7-6.5 8.6C8.2 18 5.5 15 5.5 11V6L12 4.2Z" {...s}/>
        <Path d="m9 11.6 2.2 2.2L15 9.8" {...s}/>
      </>;

    case 'vaccine':
      return <>
        <Path d="m14.5 4.5 5 5M16.8 6.8 9.5 14.1l-2.7.6-.6 2.7-1.5 1.5M9 9.3l3 3M7 11.3l3 3" {...s}/>
      </>;

    case 'syringe':
      return <>
        <Path d="M16.8 1.6h5.4c.6 0 1.1.5 1.1 1.1v2.4c0 .6-.5 1.1-1.1 1.1h-5.4c-.6 0-1.1-.5-1.1-1.1V2.7c0-.6.5-1.1 1.1-1.1Z" fill={color} stroke="none"/>
        <Path d="M17.2 6.2h2.6l-7.4 7.8-1.2 3.6h-2.3l1.4-4.2 6.9-7.2Z" fill={color} stroke="none"/>
        <Path d="M8.3 13.8 5.4 16.7l1.1 1.1 2.9-2.9-1.1-1.1Z" fill={color} stroke="none"/>
        <Path d="M9.2 14.9 7.8 16.3l1.1 1.1 1.4-1.4-1.1-1.1Z" fill={color} stroke="none"/>
        <Path d="M6.8 16.8 1.2 22.4l1.2 1.2 5.6-5.6-1.2-1.2Z" fill={color} stroke="none"/>
      </>;

    case 'stethoscope':
      return <>
        <Path d="M9.2 3.2v2.4M14.8 3.2v2.4" {...s}/>
        <Path d="M16.4 6.2h.9a3.6 3.6 0 0 1 3.6 3.6v1.6a7.2 7.2 0 0 1-14.4 0V9.8a3.6 3.6 0 0 1 3.6-3.6h.9" {...s}/>
        <Path d="M12 13.4v4.2" {...s}/>
        <Path d="M9.4 18.8h5.2" {...s}/>
        <Circle cx="12" cy="20.2" r="1.7" fill={color} stroke="none"/>
      </>;

    case 'firstAid':
      return <>
        <Path d="M9.5 5.8h5" {...s}/>
        <Path d="M12 5.8V8.4" {...s}/>
        <Path d="M6.8 8.4h10.4a1.8 1.8 0 0 1 1.8 1.8v7.4a1.8 1.8 0 0 1-1.8 1.8H6.8a1.8 1.8 0 0 1-1.8-1.8v-7.4a1.8 1.8 0 0 1 1.8-1.8Z" {...s}/>
        <Rect x="11.2" y="12.6" width="1.6" height="4.6" rx="0.8" fill={color} stroke="none"/>
        <Rect x="9.7" y="14.1" width="4.6" height="1.6" rx="0.8" fill={color} stroke="none"/>
      </>;

    case 'medical':
      return <>
        <Rect x="10.2" y="5" width="3.6" height="14" rx="1.8" fill={color} stroke="none" />
        <Rect x="5" y="10.2" width="14" height="3.6" rx="1.8" fill={color} stroke="none" />
      </>;

    case 'microchip':
      return <>
        <Rect x="7.5" y="7.5" width="9" height="9" rx="1.6" {...s}/>
        <Path d="M10.5 10.5h3v3h-3z" fill={color} stroke="none"/>
        <Path d="M9.5 4.5v2M14.5 4.5v2M9.5 17.5v2M14.5 17.5v2M4.5 9.5h2M4.5 14.5h2M17.5 9.5h2M17.5 14.5h2" {...s}/>
      </>;

    case 'bone':
      return <>
        <Path d="M7.5 8.5a2 2 0 1 0-2.2 2.2L11 16.4a2 2 0 1 0 2.2-2.2" {...s}/>
        <Path d="M16.5 15.5a2 2 0 1 0 2.2-2.2L13 7.6a2 2 0 1 0-2.2 2.2" {...s}/>
      </>;

    case 'cat':
      return <>
        <Path d="M5 9 5.5 5l3 2.4a7.5 7.5 0 0 1 7 0L18.5 5 19 9v5.5c0 2.8-3.1 5-7 5s-7-2.2-7-5V9Z" {...s}/>
        <Path d="M9.5 12.5h.01M14.5 12.5h.01M11 15h2" {...s}/>
      </>;

    case 'dog':
      return <>
        <Path d="M5.5 8.5 4 6.5C5.5 5 7 5.5 8 6.8a7 7 0 0 1 8 0C17 5.5 18.5 5 20 6.5l-1.5 2V14c0 3-2.9 5-6.5 5S5.5 17 5.5 14V8.5Z" {...s}/>
        <Path d="M10 13.5h.01M14 13.5h.01M11 15.5h2" {...s}/>
      </>;

    case 'phone':
      return <Path d="M6 4.5h3l1.4 4-2 1.5a9 9 0 0 0 4.6 4.6l1.5-2 4 1.4v3c0 .9-.7 1.6-1.6 1.5C12.7 18.4 5.6 11.3 4.5 6.1 4.4 5.2 5.1 4.5 6 4.5Z" {...s}/>;

    case 'mail':
      return <>
        <Rect x="4" y="6" width="16" height="12" rx="2.2" {...s}/>
        <Path d="m4.8 7.5 7.2 5 7.2-5" {...s}/>
      </>;

    case 'alert':
      return <>
        <Path d="M12 5 3.5 19.2h17L12 5Z" {...s}/>
        <Path d="M12 10.5v4M12 17h.01" {...s}/>
      </>;

    case 'megaphone':
      return <>
        <Path d="M4.5 10v4l11 4.5V5.5L4.5 10Z" {...s}/>
        <Path d="M4.5 10H3.5v4h1M15.5 9c1.6.3 2.7 1.5 2.7 3s-1.1 2.7-2.7 3M7 14.5v2.7c0 .6.5 1 1 1h1.5" {...s}/>
      </>;

    case 'flag':
      return <>
        <Path d="M6 4v16M6 5h10l-2 3 2 3H6" {...s}/>
      </>;

    case 'block':
      return <>
        <Circle cx="12" cy="12" r="8" {...s}/>
        <Path d="m6.4 6.4 11.2 11.2" {...s}/>
      </>;

    case 'logout':
      return <>
        <Path d="M14 7.5V5.5H5.5v13H14v-2M10 12h9M16 9l3 3-3 3" {...s}/>
      </>;

    case 'crown':
      return <>
        <Path d="M4.5 17.5h15M5 8l3 3 4-5.5 4 5.5 3-3-1.2 8.5H6.2L5 8Z" {...s}/>
      </>;

    case 'eye':
      return <>
        <Path d="M3.5 12S6.5 6.5 12 6.5 20.5 12 20.5 12 17.5 17.5 12 17.5 3.5 12 3.5 12Z" {...s}/>
        <Circle cx="12" cy="12" r="2.4" {...s}/>
      </>;

    case 'grid':
      return <>
        <Rect x="4.5" y="4.5" width="6" height="6" rx="1.4" {...s}/>
        <Rect x="13.5" y="4.5" width="6" height="6" rx="1.4" {...s}/>
        <Rect x="4.5" y="13.5" width="6" height="6" rx="1.4" {...s}/>
        <Rect x="13.5" y="13.5" width="6" height="6" rx="1.4" {...s}/>
      </>;

    case 'play-square':
      return <>
        <Rect x="5" y="5" width="14" height="14" rx="3.2" {...s}/>
        <Path d="M10.2 9.2v5.6l4.8-2.8-4.8-2.8Z" fill={color} stroke="none"/>
      </>;

    case 'repeat':
      return <>
        <Path d="M7.5 7.5A5.5 5.5 0 0 1 17 9.5" {...s}/>
        <Path d="M17 6.5V9.5H14" {...s}/>
        <Path d="M16.5 16.5A5.5 5.5 0 0 1 7 14.5" {...s}/>
        <Path d="M7 17.5V14.5H10" {...s}/>
      </>;

    case 'user-square':
      return <>
        <Rect x="5" y="5" width="14" height="14" rx="3.2" {...s}/>
        <Circle cx="12" cy="10.6" r="2.2" {...s}/>
        <Path d="M8.2 17.2c.4-2.2 2-3.4 3.8-3.4s3.4 1.2 3.8 3.4" {...s}/>
      </>;

    case 'gender':
      return <>
        <Circle cx="10" cy="14" r="4" {...s}/>
        <Path d="M13 11l5-5M14.5 6H18v3.5" {...s}/>
      </>;

    default:
      return <Circle cx="12" cy="12" r="7" {...s}/>;
  }
}

export function Icon({ name, size = 22, color = '#000', sw = 1.8 }: IconProps) {
  return (
    <S size={size} color={color} sw={sw}>
      {renderIcon(name, color, sw)}
    </S>
  );
}
