import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Sheet } from '../ui/Sheet';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../icons/Icon';
import { helpTypeLabel, type RescueHelpOffer } from '../../utils/rescueHelpOffers';
import { formatRelativeTime } from '../../utils/time';

type Props = {
  visible: boolean;
  onClose: () => void;
  offers: RescueHelpOffer[];
  onSelectOffer: (offer: RescueHelpOffer) => void;
  onMarkViewed?: (offerIds: string[]) => void;
};

function offerStatusLabel(status: RescueHelpOffer['status']): string {
  switch (status) {
    case 'offered': return 'New';
    case 'viewed': return 'New';
    case 'accepted': return 'Accepted';
    default: return '';
  }
}

function OfferRow({
  offer,
  showDivider,
  onPress,
}: {
  offer: RescueHelpOffer;
  showDivider: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const displayName = offer.helperName ?? 'Community member';
  const statusLabel = offerStatusLabel(offer.status);
  const isNew = offer.status === 'offered' || offer.status === 'viewed';
  const isAccepted = offer.status === 'accepted';

  return (
    <View>
      {showDivider ? (
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
      ) : null}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          Platform.OS === 'web' && styles.rowWeb,
          pressed && styles.rowPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`View help offer from ${displayName}`}
      >
        <Avatar
          user={{
            id: offer.helperUserId,
            name: displayName,
            handle: offer.helperHandle,
            tint: colors.primary,
          }}
          size={44}
        />
        <View style={styles.rowCopy}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={[styles.typeLine, { color: colors.textSecondary }]} numberOfLines={1}>
            {helpTypeLabel(offer.type)}
            {offer.message ? ` · ${offer.message}` : ''}
          </Text>
          <Text style={[
            styles.sub,
            { color: isAccepted ? colors.success : isNew ? colors.primary : colors.textTertiary },
          ]}>
            {statusLabel || formatRelativeTime(offer.createdAt)}
            {statusLabel ? ` · ${formatRelativeTime(offer.createdAt)}` : ''}
          </Text>
        </View>
        <Icon name="chevronRight" size={18} color={colors.textTertiary} />
      </Pressable>
    </View>
  );
}

export function RescueHelpOffersListSheet({
  visible,
  onClose,
  offers,
  onSelectOffer,
  onMarkViewed,
}: Props) {
  const { colors } = useTheme();
  const markedRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      markedRef.current = false;
      return;
    }
    if (markedRef.current || !onMarkViewed) return;
    const offeredIds = offers.filter(o => o.status === 'offered').map(o => o.id);
    if (offeredIds.length === 0) return;
    markedRef.current = true;
    onMarkViewed(offeredIds);
  }, [visible, offers, onMarkViewed]);

  return (
    <Sheet visible={visible} onClose={onClose} title="Help offers">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {offers.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            No active help offers yet.
          </Text>
        ) : offers.map((offer, index) => (
          <OfferRow
            key={offer.id}
            offer={offer}
            showDivider={index > 0}
            onPress={() => onSelectOffer(offer)}
          />
        ))}
      </ScrollView>
    </Sheet>
  );
}

export function RescueHelpOffersBanner({
  count,
  onPress,
}: {
  count: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  if (count <= 0) return null;

  return (
    <Text
      onPress={onPress}
      style={[styles.banner, { color: colors.primary, backgroundColor: colors.primary + '12' }]}
    >
      {count} {count === 1 ? 'person offered help' : 'people offered help'} · Tap to view
    </Text>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 420 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 16 },
  empty: { fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 56 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  rowWeb: { cursor: 'pointer' as const },
  rowPressed: { opacity: 0.85 },
  rowCopy: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 14.5, fontWeight: '700' },
  typeLine: { fontSize: 13, lineHeight: 18 },
  sub: { fontSize: 12, fontWeight: '600' },
  banner: {
    fontSize: 13.5,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
});
