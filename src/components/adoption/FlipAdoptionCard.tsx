import React, { useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Animated, Easing, Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows } from '../../theme/tokens';
import { PhotoSlot } from '../ui/PhotoSlot';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Icon } from '../icons/Icon';
import { AdoptionListing, statusBadgeTone } from '../../data/adoptionData';

const CARD_HEIGHT = 400;
const FLIP_MS = 420;

type Props = {
  listing: AdoptionListing;
  saved: boolean;
  onViewDetails: () => void;
  onRequest: () => void;
  onSave: () => void;
  onShare: () => void;
};

export function FlipAdoptionCard({
  listing,
  saved,
  onViewDetails,
  onRequest,
  onSave,
  onShare,
}: Props) {
  const { colors } = useTheme();
  const [flipped, setFlipped] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const adopted = listing.status === 'Adopted';

  const flipTo = (next: boolean) => {
    Animated.timing(anim, {
      toValue: next ? 1 : 0,
      duration: FLIP_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    setFlipped(next);
  };

  const rotateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const frontOpacity = anim.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [1, 1, 0, 0],
  });

  const backOpacity = anim.interpolate({
    inputRange: [0, 0.5, 0.51, 1],
    outputRange: [0, 0, 1, 1],
  });

  const statusLabel = adopted ? 'Successfully Adopted' : listing.status;

  return (
    <View style={[styles.shell, shadows.md]}>
      <Animated.View
        style={[
          styles.flipContainer,
          { transform: [{ perspective: 1200 }, { rotateY }] },
        ]}
      >
        {/* Front */}
        <Animated.View
          style={[
            styles.face,
            { backgroundColor: colors.surface, borderColor: colors.border, opacity: frontOpacity },
          ]}
          pointerEvents={flipped ? 'none' : 'auto'}
        >
          <View style={styles.imageWrap}>
            <PhotoSlot
              height={200}
              tint={listing.tint}
              borderRadius={0}
              label={listing.name}
              icon={listing.icon}
            />
            {adopted && (
              <View style={[styles.adoptedRibbon, { backgroundColor: colors.success + 'EE' }]}>
                <Icon name="adoption" size={14} color="#fff" />
                <Text style={styles.adoptedRibbonText}>Successfully Adopted</Text>
              </View>
            )}
            <View style={styles.imageActions}>
              <Pressable
                onPress={(e) => { e.stopPropagation?.(); onSave(); }}
                style={[styles.roundBtn, { backgroundColor: saved ? colors.accent + 'EE' : '#00000055' }]}
              >
                <Icon name="heart" size={16} color="#fff" fill={saved ? '#fff' : 'none'} />
              </Pressable>
              {listing.urgent && !adopted && (
                <Badge tone="danger" icon="alert" style={styles.urgentBadge}>Urgent</Badge>
              )}
            </View>
            <Badge tone={statusBadgeTone(listing.status)} style={styles.statusBadge}>
              {statusLabel}
            </Badge>
          </View>

          <View style={styles.frontBody}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.text }]}>{listing.name}</Text>
              <Icon name={listing.icon} size={18} color={listing.tint} fill={listing.tint} />
            </View>
            <Text style={[styles.breedLine, { color: colors.textSecondary }]}>
              {listing.breed} · {listing.species === 'dog' ? 'Dog' : listing.species === 'cat' ? 'Cat' : 'Pet'}
            </Text>
            <View style={styles.metaRow}>
              <MetaChip icon="calendar" label={listing.age} colors={colors} />
              <MetaChip icon="gender" label={listing.gender} colors={colors} />
              <MetaChip icon="mapPin" label={listing.loc} colors={colors} />
            </View>
            <Text style={[styles.personality, { color: colors.text }]} numberOfLines={2}>
              {listing.personality}
            </Text>

            <Pressable
              onPress={() => flipTo(true)}
              style={({ pressed }) => [
                styles.revealRow,
                { backgroundColor: colors.primary + '10', borderColor: colors.primary + '25', opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.revealText, { color: colors.primary }]}>Tap for quick summary</Text>
              <Icon name="chevronDown" size={16} color={colors.primary} />
            </Pressable>
          </View>
        </Animated.View>

        {/* Back */}
        <Animated.View
          style={[
            styles.face,
            styles.backFace,
            { backgroundColor: colors.surface, borderColor: colors.border, opacity: backOpacity },
          ]}
          pointerEvents={flipped ? 'auto' : 'none'}
        >
          <View style={styles.backHeader}>
            <Text style={[styles.backTitle, { color: colors.text }]}>{listing.name}</Text>
            <Pressable onPress={() => flipTo(false)} hitSlop={10}>
              <Icon name="close" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.backGrid}>
            <BackFact icon="vaccine" label="Vaccines" value={listing.vacc} colors={colors} />
            <BackFact icon="shield" label="Health" value={listing.healthNotes.split('·')[0].trim()} colors={colors} />
            <BackFact icon="alert" label="Urgency" value={listing.urgent ? 'High' : 'Normal'} colors={colors} />
          </View>

          <Text style={[styles.backStory, { color: colors.textSecondary }]} numberOfLines={3}>
            {listing.story}
          </Text>

          {listing.requirements[0] && (
            <Text style={[styles.backReq, { color: colors.textTertiary }]} numberOfLines={1}>
              Requires: {listing.requirements[0]}
            </Text>
          )}

          <Text style={[styles.postedBy, { color: colors.textTertiary }]}>
            Posted by @{listing.owner} · {listing.postedAt}
          </Text>

          <View style={styles.backActions}>
            <Button size="sm" variant="soft" onPress={onViewDetails} style={{ flex: 1 }}>
              View Details
            </Button>
            {!adopted ? (
              <Button size="sm" variant="primary" onPress={onRequest} style={{ flex: 1 }}>
                Request
              </Button>
            ) : (
              <Button size="sm" variant="outline" onPress={onViewDetails} style={{ flex: 1 }}>
                Read Story
              </Button>
            )}
          </View>

          <View style={styles.backSecondary}>
            <Pressable onPress={onSave} style={styles.secondaryBtn}>
              <Icon name="heart" size={16} color={saved ? colors.accent : colors.textSecondary} fill={saved ? colors.accent : 'none'} />
              <Text style={[styles.secondaryLabel, { color: colors.textSecondary }]}>Save</Text>
            </Pressable>
            <Pressable onPress={onShare} style={styles.secondaryBtn}>
              <Icon name="forward" size={16} color={colors.textSecondary} />
              <Text style={[styles.secondaryLabel, { color: colors.textSecondary }]}>Share</Text>
            </Pressable>
            <Pressable onPress={() => flipTo(false)} style={styles.secondaryBtn}>
              <Icon name="chevronLeft" size={16} color={colors.textSecondary} />
              <Text style={[styles.secondaryLabel, { color: colors.textSecondary }]}>Front</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function MetaChip({ icon, label, colors }: { icon: string; label: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={[styles.metaChip, { backgroundColor: colors.surface2 }]}>
      <Icon name={icon} size={12} color={colors.textSecondary} />
      <Text style={[styles.metaChipText, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function BackFact({ icon, label, value, colors }: {
  icon: string; label: string; value: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={[styles.fact, { backgroundColor: colors.surface2 }]}>
      <Icon name={icon} size={14} color={colors.primary} />
      <Text style={[styles.factLabel, { color: colors.textTertiary }]}>{label}</Text>
      <Text style={[styles.factValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginHorizontal: 16,
    height: CARD_HEIGHT,
    borderRadius: radius.xl,
  },
  flipContainer: {
    width: '100%',
    height: CARD_HEIGHT,
  },
  face: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
    ...(Platform.OS === 'web' ? { backfaceVisibility: 'hidden' as const } : {}),
  },
  backFace: {
    transform: [{ rotateY: '180deg' }],
  },
  imageWrap: { position: 'relative' },
  imageActions: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roundBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentBadge: { marginTop: 0 },
  statusBadge: { position: 'absolute', bottom: 10, left: 10 },
  adoptedRibbon: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  adoptedRibbonText: { color: '#fff', fontSize: 11.5, fontWeight: '700' },
  frontBody: { padding: 14, gap: 8, flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 20, fontWeight: '800' },
  breedLine: { fontSize: 13 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  metaChipText: { fontSize: 11.5, fontWeight: '600' },
  personality: { fontSize: 13.5, lineHeight: 20, fontStyle: 'italic' },
  revealRow: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  revealText: { fontSize: 12.5, fontWeight: '700' },
  backHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  backTitle: { fontSize: 17, fontWeight: '800' },
  backGrid: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  fact: {
    flex: 1,
    padding: 10,
    borderRadius: radius.md,
    gap: 3,
    alignItems: 'flex-start',
  },
  factLabel: { fontSize: 10, fontWeight: '600' },
  factValue: { fontSize: 11.5, fontWeight: '700' },
  backStory: { fontSize: 13, lineHeight: 19, paddingHorizontal: 14, marginTop: 10 },
  backReq: { fontSize: 12, paddingHorizontal: 14, marginTop: 6 },
  postedBy: { fontSize: 11.5, paddingHorizontal: 14, marginTop: 8 },
  backActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    marginTop: 12,
  },
  backSecondary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
  },
  secondaryBtn: { alignItems: 'center', gap: 4 },
  secondaryLabel: { fontSize: 11, fontWeight: '600' },
});
