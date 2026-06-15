import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '../icons/Icon';
import { useTheme } from '../../theme/ThemeContext';
import { CachedAvatarImage } from './CachedAvatarImage';

/** Black toe pads — realistic paw-pad look on light backgrounds. */
const TOE_PAD_LIGHT = '#1A1A1A';
/** Vibrant coral-rose — lively on dark UI, still reads as a paw pad. */
const TOE_PAD_DARK = '#FF8FA8';

/**
 * Pet avatar whose total bounding box is exactly `size × size` —
 * same footprint as a human Avatar at the same size.
 *
 * Main circle = 70 % of `size` — compact palm leaves room for toe pads above.
 * 5 toe pads at equal 28° steps arc above it symmetrically.
 * All toes land fully inside the frame so the layout box is strictly size × size.
 */
type PawPadShapeProps = {
  size: number;
  tint: string;
  tintDark?: string;
  icon?: string;
  iconColor?: string;
  toeTint?: string;
  imageUri?: string;
  fallbackUri?: string;
  originalUri?: string;
  imageLabel?: string;
};

/**
 * Main circle is 70 % of the outer frame. Toes orbit with gap=9% of inner diameter and
 * radius (10%) so they all land within the size×size bounding box.
 */
const INNER_SCALE = 0.70;

/**
 * 5 toe pads at equal 28° steps — [-56°, -28°, 0°, +28°, +56°].
 * Equal angular steps → equal chord distances → perfectly uniform gaps.
 * Centre toe (0°) is at the top; outermost toes (±56°) fan out at the sides.
 * Width fits within size×size at all used sizes (verified ±56° at size=30+).
 */
const TOE_ANGLES_DEG = [-56, -28, 0, 28, 56] as const;

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

/**
 * Y offset from the top of the paw frame to the center of the main palm circle.
 * The palm is bottom-anchored with toe pads above, so this is below the frame midpoint.
 */
export function getPetMainCircleCenterY(size: number): number {
  const inner = getPetInnerCircleSize(size);
  return size - inner / 2;
}

// ─── Private helpers ───────────────────────────────────────────────────────────

function mainToeRadius(inner: number) {
  return Math.max(2, Math.round(inner * 0.10));
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

function PalmCircle({
  inner,
  left,
  top,
  from,
  to,
  icon,
  iconSize,
  iconColor,
  imageUri,
  fallbackUri,
  originalUri,
  imageLabel,
}: {
  inner: number;
  left: number;
  top: number;
  from: string;
  to: string;
  icon: string;
  iconSize: number;
  iconColor: string;
  imageUri?: string;
  fallbackUri?: string;
  originalUri?: string;
  imageLabel?: string;
}) {
  const [showIcon, setShowIcon] = useState(!imageUri);

  useEffect(() => {
    setShowIcon(!imageUri);
  }, [imageUri]);

  const circleStyle = {
    width: inner,
    height: inner,
    borderRadius: inner / 2,
    left,
    top,
  };

  if (showIcon || !imageUri) {
    return (
      <LinearGradient
        colors={[from, to]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.mainCircle, circleStyle]}
        accessibilityLabel={imageLabel}
      >
        <Icon name={icon} size={iconSize} color={iconColor} />
      </LinearGradient>
    );
  }

  return (
    <View
      style={[styles.mainCircle, circleStyle, styles.palmPhoto, { backgroundColor: from }]}
      accessibilityLabel={imageLabel}
    >
      <CachedAvatarImage
        avatarUrl={imageUri}
        avatarFallbackUrl={fallbackUri}
        avatarOriginalUrl={originalUri}
        width={inner}
        height={inner}
        label={imageLabel ?? 'Pet profile photo'}
        onFailed={() => setShowIcon(true)}
      />
    </View>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function PawPadShape({
  size,
  tint,
  tintDark,
  icon = 'paw',
  iconColor = '#fff',
  toeTint,
  imageUri,
  fallbackUri,
  originalUri,
  imageLabel,
}: PawPadShapeProps) {
  const { isDark } = useTheme();
  const from = tint;
  const to = tintDark ?? shade(tint, -14);
  const toeColor = toeTint ?? (isDark ? TOE_PAD_DARK : TOE_PAD_LIGHT);
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

      <PalmCircle
        inner={inner}
        left={mainLeft}
        top={mainTop}
        from={from}
        to={to}
        icon={icon}
        iconSize={iconSize}
        iconColor={iconColor}
        imageUri={imageUri}
        fallbackUri={fallbackUri}
        originalUri={originalUri}
        imageLabel={imageLabel}
      />
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
  palmPhoto: {
    overflow: 'hidden',
  },
});
