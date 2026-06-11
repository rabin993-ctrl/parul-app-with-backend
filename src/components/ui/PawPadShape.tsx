import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '../icons/Icon';

/**
 * Pet avatar whose total bounding box is exactly `size × size` —
 * same footprint as a human Avatar at the same size.
 *
 * Main circle = 76 % of `size`.
 * 5 toe pads at equal 20° steps arc above it symmetrically.
 * All toes land fully inside the frame so the layout box is strictly size × size.
 */
type PawPadShapeProps = {
  size: number;
  tint: string;
  tintDark?: string;
  icon?: string;
  iconColor?: string;
  toeTint?: string;
};

/**
 * Main circle is 76 % of the outer frame size.
 * With a centre toe at 0°, the constraint is inner ≤ size / 1.29 ≈ size × 0.775.
 * 0.76 gives a comfortable margin so the centre toe lands fully inside the frame.
 */
const INNER_SCALE = 0.76;

/**
 * 5 toe pads at equal 27° steps — [-54°, -27°, 0°, +27°, +54°].
 * Equal angular steps → equal chord distances → perfectly uniform gaps.
 * Centre toe (0°) is at the top; outermost toes (±54°) fan out at the sides.
 * Width fits within size×size at all used sizes (verified ±54° at size=28+).
 */
const TOE_ANGLES_DEG = [-54, -27, 0, 27, 54] as const;

// ─── Public helpers ────────────────────────────────────────────────────────────

/**
 * Returns the bounding box that the paw component occupies in layout.
 * Equals `size × size` — identical to a human Avatar at the same size.
 */
export function getPetAvatarFrameSize(size: number): { width: number; height: number } {
  return { width: size, height: size };
}

/**
 * Diameter of the main (palm) circle inside the paw frame.
 * Useful when other components need to draw rings or badges around it.
 */
export function getPetInnerCircleSize(size: number): number {
  return Math.round(size * INNER_SCALE);
}

// ─── Private helpers ───────────────────────────────────────────────────────────

function mainToeRadius(inner: number) {
  return Math.max(2, Math.round(inner * 0.1));
}

function shade(hex: string, pct: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const f = pct < 0 ? 0 : 255;
  const t = Math.abs(pct) / 100;
  r = Math.round((f - r) * t) + r;
  g = Math.round((f - g) * t) + g;
  b = Math.round((f - b) * t) + b;
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function PawPadShape({
  size,
  tint,
  tintDark,
  icon = 'paw',
  iconColor = '#fff',
  toeTint,
}: PawPadShapeProps) {
  const from = tint;
  const to = tintDark ?? shade(tint, -14);
  const toeColor = toeTint ?? shade(tint, 12);
  const inner = getPetInnerCircleSize(size);
  const iconSize = Math.round(inner * 0.42);

  const layout = useMemo(() => {
    const R = inner / 2;
    const toeR = mainToeRadius(inner);
    const gap = inner * 0.09;
    const orbit = R + gap + toeR;

    // Main circle bottom-anchored; toes arc upward above it.
    const cx = size / 2;
    const cy = size - R;

    const toes = TOE_ANGLES_DEG.map((deg, i) => {
      const rad = (deg * Math.PI) / 180;
      const tx = cx + orbit * Math.sin(rad);
      const ty = cy - orbit * Math.cos(rad);
      return {
        key: i,
        left: tx - toeR,
        top: ty - toeR,
        diameter: toeR * 2,
      };
    });

    return { R, inner, toes };
  }, [size, inner]);

  const mainLeft = (size - inner) / 2;
  const mainTop = size - inner;

  return (
    <View style={[styles.frame, { width: size, height: size }]}>
      {layout.toes.map(t => (
        <View
          key={t.key}
          style={[
            styles.toe,
            {
              left: t.left,
              top: t.top,
              width: t.diameter,
              height: t.diameter,
              borderRadius: t.diameter / 2,
              backgroundColor: toeColor,
            },
          ]}
        />
      ))}

      <LinearGradient
        colors={[from, to]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.mainCircle,
          {
            width: inner,
            height: inner,
            borderRadius: inner / 2,
            left: mainLeft,
            top: mainTop,
          },
        ]}
      >
        <Icon name={icon} size={iconSize} color={iconColor} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'relative',
    flexShrink: 0,
    overflow: 'hidden',
  },
  toe: {
    position: 'absolute',
  },
  mainCircle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
