import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';
import { Avatar } from './ui/Avatar';
import { Icon } from './icons/Icon';
import { TreatWalletPill } from './TreatWalletPill';
import { useTreatWallet } from '../context/TreatWalletContext';
import { useCompanions } from '../context/CompanionContext';

function formatCount(n: number): string {
  if (n >= 1000) {
    const v = n / 1000;
    return (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10).toString().replace(/\.0$/, '') + 'K';
  }
  return String(n);
}

interface OwnerTreatsSectionProps {
  ownerId: string;
  showVisibilityToggle?: boolean;
}

export function OwnerTreatsSection({ ownerId, showVisibilityToggle = false }: OwnerTreatsSectionProps) {
  const { colors } = useTheme();
  const { getCompanion } = useCompanions();
  const {
    getOwnerReceivedTreats,
    getRecentGiftsForOwner,
    showTreatsOnProfile,
    setShowTreatsOnProfile,
    lastGiftBanner,
  } = useTreatWallet();

  const received = getOwnerReceivedTreats(ownerId);
  const recentGifts = getRecentGiftsForOwner(ownerId, 10);
  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const bannerTranslate = useRef(new Animated.Value(6)).current;

  const showBanner = lastGiftBanner?.ownerId === ownerId;

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

  const uniqueGifters = [...new Map(recentGifts.map(g => [g.fromUserId, g])).values()];

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>Treats</Text>
        <TreatWalletPill />
      </View>

      {showTreatsOnProfile ? (
        <View style={[styles.receivedCard, { backgroundColor: colors.infoBg, borderColor: colors.border }]}>
          <Icon name="bone" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.receivedValue, { color: colors.text }]}>{formatCount(received)}</Text>
            <Text style={[styles.receivedLabel, { color: colors.textSecondary }]}>
              received across all your companions
            </Text>
          </View>
        </View>
      ) : (
        <View style={[styles.hiddenCard, { backgroundColor: colors.neutralBg, borderColor: colors.border }]}>
          <Icon name="eye" size={16} color={colors.textTertiary} />
          <Text style={[styles.hiddenText, { color: colors.textTertiary }]}>
            Treat count hidden on your profile
          </Text>
        </View>
      )}

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
            +1 treat from <Text style={{ fontWeight: '700', color: colors.accent }}>@{lastGiftBanner.handle}</Text>
          </Text>
        </Animated.View>
      )}

      {uniqueGifters.length > 0 && (
        <>
          <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>Recent love</Text>
          <View style={styles.chipRow}>
            {uniqueGifters.map(gift => {
              const pet = getCompanion(gift.companionId);
              const displayHandle = gift.gifterHandle ?? gift.fromUserId.slice(0, 8);
              const displayTint = gift.gifterTint ?? '#F2972E';
              const displayName = gift.gifterName ?? displayHandle;
              return (
                <View
                  key={`${gift.fromUserId}-${gift.companionId}`}
                  style={[styles.chip, { backgroundColor: colors.surface2, borderColor: colors.border }]}
                >
                  <View style={styles.avatarWrap}>
                    <Avatar user={{ id: gift.fromUserId, name: displayName, tint: displayTint }} size={26} />
                    <View style={[styles.boneBadge, { backgroundColor: colors.accent, borderColor: colors.surface2 }]}>
                      <Icon name="bone" size={7} color="#fff" />
                    </View>
                  </View>
                  <View style={styles.chipText}>
                    <Text style={[styles.handle, { color: colors.text }]} numberOfLines={1}>
                      @{displayHandle}
                    </Text>
                    {pet && (
                      <Text style={[styles.petName, { color: colors.textTertiary }]} numberOfLines={1}>
                        → {pet.name}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      {showVisibilityToggle && (
        <Pressable
          onPress={() => setShowTreatsOnProfile(!showTreatsOnProfile)}
          style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleLabel, { color: colors.text }]}>Show treat count</Text>
            <Text style={[styles.toggleHint, { color: colors.textTertiary }]}>
              Let others see how many treats you have left to give
            </Text>
          </View>
          <View style={[
            styles.togglePill,
            { backgroundColor: showTreatsOnProfile ? colors.primary : colors.surface2 },
          ]}>
            <Text style={[styles.togglePillText, { color: showTreatsOnProfile ? '#fff' : colors.textTertiary }]}>
              {showTreatsOnProfile ? 'On' : 'Off'}
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: { fontSize: 15, fontWeight: '700' },
  receivedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  receivedValue: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  receivedLabel: { fontSize: 12.5, fontWeight: '500', marginTop: 1 },
  hiddenCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  hiddenText: { fontSize: 13, fontWeight: '500', flex: 1 },
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
  chipText: { gap: 1 },
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
  petName: { fontSize: 10, fontWeight: '500', maxWidth: 120 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  toggleLabel: { fontSize: 14, fontWeight: '600' },
  toggleHint: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  togglePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    minWidth: 40,
    alignItems: 'center',
  },
  togglePillText: { fontSize: 12, fontWeight: '700' },
});
