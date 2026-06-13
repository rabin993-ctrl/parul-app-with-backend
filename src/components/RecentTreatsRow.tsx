import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';
import { Avatar } from './ui/Avatar';
import { Icon } from './icons/Icon';
import { useTreatWallet } from '../context/TreatWalletContext';

interface RecentTreatsRowProps {
  companionId: string;
  showTitle?: boolean;
}

export function RecentTreatsRow({ companionId, showTitle = true }: RecentTreatsRowProps) {
  const { colors } = useTheme();
  const { getRecentGifts, lastGiftBanner } = useTreatWallet();
  const gifts = getRecentGifts(companionId, 8);
  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const bannerTranslate = useRef(new Animated.Value(6)).current;

  const showBanner = lastGiftBanner?.companionId === companionId;

  useEffect(() => {
    if (!showBanner) {
      bannerOpacity.setValue(0);
      bannerTranslate.setValue(6);
      return;
    }

    Animated.parallel([
      Animated.timing(bannerOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(bannerTranslate, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
    ]).start();

    const fadeOut = setTimeout(() => {
      Animated.timing(bannerOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }, 2200);

    return () => clearTimeout(fadeOut);
  }, [showBanner, lastGiftBanner?.fromUserId, bannerOpacity, bannerTranslate]);

  if (!gifts.length && !showBanner) return null;

  const uniqueGifters = [...new Map(gifts.map(g => [g.fromUserId, g])).values()];

  return (
    <View style={styles.wrap}>
      {showBanner && lastGiftBanner && (
        <Animated.View style={[
          styles.banner,
          {
            backgroundColor: colors.accent + '18',
            borderColor: colors.accent + '35',
            opacity: bannerOpacity,
            transform: [{ translateY: bannerTranslate }],
          },
        ]}>
          <Icon name="bone" size={13} color={colors.accent} />
          <Text style={[styles.bannerText, { color: colors.text }]}>
            <Text style={{ fontWeight: '700', color: colors.accent }}>@{lastGiftBanner.handle}</Text>
            {' '}sent a treat
          </Text>
        </Animated.View>
      )}

      {uniqueGifters.length > 0 && (
        <>
          {showTitle && (
            <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>Recent love</Text>
          )}
          <View style={styles.chipRow}>
            {uniqueGifters.map(gift => {
              const displayHandle = gift.gifterHandle ?? gift.fromUserId.slice(0, 8);
              const displayTint = gift.gifterTint ?? '#F2972E';
              const displayName = gift.gifterName ?? displayHandle;
              return (
                <View
                  key={gift.fromUserId}
                  style={[styles.chip, { backgroundColor: colors.surface2, borderColor: colors.border }]}
                >
                  <View style={styles.avatarWrap}>
                    <Avatar user={{ id: gift.fromUserId, name: displayName, tint: displayTint }} size={26} />
                    <View style={[styles.boneBadge, { backgroundColor: colors.accent, borderColor: colors.surface2 }]}>
                      <Icon name="bone" size={7} color="#fff" />
                    </View>
                  </View>
                  <Text style={[styles.handle, { color: colors.text }]} numberOfLines={1}>
                    @{displayHandle}
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bannerText: { fontSize: 13, fontWeight: '500', flex: 1 },
  eyebrow: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingLeft: 5,
    paddingRight: 11,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatarWrap: { position: 'relative' },
  boneBadge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  handle: { fontSize: 12, fontWeight: '600', maxWidth: 120 },
});
