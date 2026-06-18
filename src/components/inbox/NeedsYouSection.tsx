import React, { useCallback, useEffect, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, Animated, Easing,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import { Avatar, CompanionAvatar } from '../ui/Avatar';
import { getPetAvatarFrameSize } from '../ui/PawPadShape';
import { chatSublineAccentColor } from '../../utils/chatThreadMeta';
import {
  needsYouActionLabel,
  listingRequestsRowLabel,
  type NeedsYouInboxItem,
} from '../../utils/unifiedInbox';
import type { ChatThread } from '../../context/AdoptionContext';
import type { AdoptionListing } from '../../data/adoptionData';
import { chatThreadParticipantUser } from '../../utils/chatParticipant';

const AVATAR = 36;
const PET_FRAME = getPetAvatarFrameSize(AVATAR);
const EXPAND_MS = 280;
const COLLAPSE_MS = 220;

type Props = {
  title: string;
  items: NeedsYouInboxItem[];
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onOpenThread: (thread: ChatThread) => void;
  onReviewListingRequests?: (listing: AdoptionListing) => void;
};

export function NeedsYouSection({
  title,
  items,
  expanded,
  onExpandedChange,
  onOpenThread,
  onReviewListingRequests,
}: Props) {
  const { colors } = useTheme();
  const listHeightRef = useRef(0);
  const hasMeasuredRef = useRef(false);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const chevronAnim = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  const runAnimation = useCallback((toExpanded: boolean, measuredHeight?: number) => {
    const targetHeight = toExpanded ? (measuredHeight ?? listHeightRef.current) : 0;
    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue: targetHeight,
        duration: toExpanded ? EXPAND_MS : COLLAPSE_MS,
        easing: toExpanded
          ? Easing.bezier(0.25, 0.1, 0.25, 1)
          : Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: toExpanded ? 1 : 0,
        duration: toExpanded ? EXPAND_MS - 40 : COLLAPSE_MS - 40,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(chevronAnim, {
        toValue: toExpanded ? 1 : 0,
        duration: EXPAND_MS,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, [heightAnim, opacityAnim, chevronAnim]);

  useEffect(() => {
    runAnimation(expanded);
  }, [expanded, runAnimation]);

  const onListLayout = useCallback((height: number) => {
    if (height <= 0 || height === listHeightRef.current) return;
    listHeightRef.current = height;
    if (!hasMeasuredRef.current && expanded) {
      hasMeasuredRef.current = true;
      heightAnim.setValue(height);
      return;
    }
    if (expanded) {
      heightAnim.setValue(height);
    }
  }, [expanded, heightAnim]);

  const chevronRotate = chevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <View
        style={[
          styles.box,
          { backgroundColor: colors.surface2, borderColor: colors.border },
        ]}
      >
        <Pressable
          onPress={() => onExpandedChange(!expanded)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`${title}, ${items.length} item${items.length !== 1 ? 's' : ''}`}
          style={({ pressed }) => [
            styles.headerRow,
            pressed && styles.headerPressed,
            Platform.OS === 'web' && styles.headerWeb,
          ]}
        >
          <View style={styles.headerLead}>
            <Text style={[styles.heading, { color: colors.textSecondary }]}>{title}</Text>
            <View style={[styles.countPill, { backgroundColor: colors.primary + '14' }]}>
              <Text style={[styles.countText, { color: colors.primary }]}>{items.length}</Text>
            </View>
          </View>
          <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
            <Icon name="chevronRight" size={16} color={colors.textTertiary} />
          </Animated.View>
        </Pressable>
      </View>

      <Animated.View
        style={[styles.listShell, { height: heightAnim }]}
        pointerEvents={expanded ? 'auto' : 'none'}
      >
        <Animated.View style={{ opacity: opacityAnim }}>
          <View
            style={styles.list}
            onLayout={e => onListLayout(e.nativeEvent.layout.height)}
          >
          {items.map((card) => {
            const action = needsYouActionLabel(card.accent);
            const actionColor = chatSublineAccentColor(card.tone, colors);
            const peerUser = card.kind === 'thread'
              ? chatThreadParticipantUser(card.thread)
              : null;
            const actionLabel = card.kind === 'listing_requests'
              ? listingRequestsRowLabel(card.requestCount)
              : action;

            return (
              <Pressable
                key={card.kind === 'listing_requests' ? `listing-req-${card.listing.id}` : card.thread.id}
                onPress={() => {
                  if (card.kind === 'listing_requests') {
                    onReviewListingRequests?.(card.listing);
                  } else {
                    onOpenThread(card.thread);
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={`${card.title}, ${actionLabel}`}
                style={({ pressed }) => [
                  styles.row,
                  card.kind === 'thread' && card.thread.unread > 0 && { backgroundColor: colors.primary + '06' },
                  pressed && styles.rowPressed,
                  Platform.OS === 'web' && styles.rowWeb,
                ]}
              >
                <View style={styles.avatarSlot}>
                  {card.kind === 'listing_requests' ? (
                    <CompanionAvatar
                      pet={{
                        icon: card.listing.icon,
                        tint: card.listing.tint,
                        name: card.listing.name,
                      }}
                      size={AVATAR}
                    />
                  ) : card.usePetAvatar && card.kind === 'thread' && card.group.petVisual ? (
                    <CompanionAvatar
                      pet={{
                        icon: card.group.petVisual.icon,
                        tint: card.group.petVisual.tint,
                        name: card.group.petVisual.petName,
                      }}
                      size={AVATAR}
                    />
                  ) : peerUser ? (
                    <Avatar user={peerUser} size={AVATAR} />
                  ) : null}
                </View>

                <Text style={styles.rowText} numberOfLines={1}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{card.title}</Text>
                  <Text style={{ color: colors.textTertiary }}> · </Text>
                  <Text style={{ color: actionColor, fontWeight: '700' }}>{actionLabel}</Text>
                </Text>

                <Icon name="chevronRight" size={14} color={colors.textTertiary} />
              </Pressable>
            );
          })}
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 0 },
  box: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    minHeight: 32,
  },
  headerWeb: { cursor: 'pointer' as const },
  headerPressed: { opacity: 0.72 },
  headerLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heading: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  countPill: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 10,
    fontWeight: '800',
  },
  listShell: {
    overflow: 'hidden',
  },
  list: {
    paddingTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  rowWeb: { cursor: 'pointer' as const },
  rowPressed: { opacity: 0.82 },
  avatarSlot: {
    width: PET_FRAME.width,
    height: PET_FRAME.height,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.1,
    minWidth: 0,
  },
});
