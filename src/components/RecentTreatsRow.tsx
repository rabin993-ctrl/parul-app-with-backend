import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ScrollView } from 'react-native';
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
      {showBanner && lastGiftBanner ? (
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
      ) : null}

      {uniqueGifters.length > 0 ? (
        <>
          {showTitle ? (
            <Text style={[styles.title, { color: colors.textTertiary }]}>Recent love</Text>
          ) : null}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.strip}
          >
            {uniqueGifters.map(gift => {
              const displayHandle = gift.gifterHandle ?? gift.fromUserId.slice(0, 8);
              const displayTint = gift.gifterTint ?? '#F2972E';
              const displayName = gift.gifterName ?? displayHandle;
              return (
                <View
                  key={gift.fromUserId}
                  style={styles.gifterItem}
                  accessible
                  accessibilityLabel={`@${displayHandle} sent a treat`}
                >
                  <Avatar user={{ id: gift.fromUserId, name: displayName, tint: displayTint }} size={44} />
                  <Text style={[styles.handle, { color: colors.textSecondary }]} numberOfLines={1}>
                    @{displayHandle}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
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
  title: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  strip: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 2,
  },
  gifterItem: {
    alignItems: 'center',
    gap: 5,
    width: 56,
  },
  handle: {
    fontSize: 10.5,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 56,
  },
});
