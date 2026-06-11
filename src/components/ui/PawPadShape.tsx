import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '../icons/Icon';

/**
 * Pet avatar — same main circle as humans, plus 5 toe circles arcing above.
 * `size` is the main circle diameter (matches Avatar size).
 */
type PawPadShapeProps = {
  size: number;
  tint: string;
  tintDark?: string;
  icon?: string;
  iconColor?: string;
  toeTint?: string;
};

const TOE_ANGLES_DEG = [-58, -29, 0, 29, 58];

const FRAME_INSET = { top: 5, side: 4, bottom: 4 };

export function getPetAvatarFrameSize(mainSize: number): { width: number; height: number } {
  const R = mainSize / 2;
  const toeR = mainToeRadius(mainSize);
  const orbit = R + mainGap(mainSize) + toeR;
  const spread = orbit * Math.sin((58 * Math.PI) / 180) + toeR;
  const contentW = Math.ceil(Math.max(mainSize, spread * 2 + 2));
  const contentH = Math.ceil(mainSize + orbit - R + toeR * 0.6);
  return {
    width: contentW + FRAME_INSET.side * 2,
    height: contentH + FRAME_INSET.top + FRAME_INSET.bottom,
  };
}

function mainGap(size: number) {
  return size * 0.09;
}

function mainToeRadius(size: number) {
  return Math.max(2, Math.round(size * 0.1));
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
  const iconSize = Math.round(size * 0.42);

  const layout = useMemo(() => {
    const frame = getPetAvatarFrameSize(size);
    const R = size / 2;
    const toeR = mainToeRadius(size);
    const orbit = R + mainGap(size) + toeR;
    const cx = frame.width / 2;
    const cy = frame.height - FRAME_INSET.bottom - R;

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

    return { frame, toes };
  }, [size]);

  return (
    <View style={[styles.frame, { width: layout.frame.width, height: layout.frame.height }]}>
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

      <View
        style={[
          styles.mainWrap,
          {
            width: size,
            height: size,
            left: (layout.frame.width - size) / 2,
            bottom: FRAME_INSET.bottom,
          },
        ]}
      >
        <LinearGradient
          colors={[from, to]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.mainCircle, { width: size, height: size, borderRadius: size / 2 }]}
        >
          <Icon name={icon} size={iconSize} color={iconColor} />
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'relative',
    flexShrink: 0,
    overflow: 'visible',
  },
  toe: {
    position: 'absolute',
  },
  mainWrap: {
    position: 'absolute',
  },
  mainCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
