import React, { useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, ScrollView, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows } from '../../theme/tokens';
import { PhotoSlot } from '../ui/PhotoSlot';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Icon } from '../icons/Icon';
import { Avatar } from '../ui/Avatar';
import { AdoptionListing, statusBadgeTone } from '../../data/adoptionData';
import {
  isActiveAdoptionRequest,
  type AdoptionRequest,
} from '../../context/AdoptionFeedContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useAuth } from '../../context/AuthContext';
import { successfulPlacementLabel } from '../../utils/chatThreadMeta';

const IMAGE_H = 200;
const FLIP_MS = 420;

type Props = {
  listing: AdoptionListing;
  myRequest?: AdoptionRequest;
  onViewDetails: () => void;
  onEditPost?: () => void;
  onRequest: () => void;
  onCancelRequest?: () => void;
  onShare: () => void;
  onOpenThread?: () => void;
  ownerRequestCount?: number;
  onManageRequests?: () => void;
  onRelist?: () => void;
};

function speciesLabel(species: AdoptionListing['species']) {
  if (species === 'dog') return 'Dog';
  if (species === 'cat') return 'Cat';
  return 'Other';
}

function speciesIcon(species: AdoptionListing['species']) {
  if (species === 'dog') return 'dog';
  if (species === 'cat') return 'cat';
  return 'paw';
}

export function FlipAdoptionCard({
  listing,
  myRequest,
  onViewDetails,
  onEditPost,
  onRequest,
  onCancelRequest,
  onShare,
  onOpenThread,
  ownerRequestCount = 0,
  onManageRequests,
  onRelist,
}: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [showBack, setShowBack] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const adopted = listing.status === 'Adopted';
  const poster = useUserProfile(listing.userId);
  const isOwner = listing.userId === user?.id;
  const hasActiveRequest = !!myRequest && isActiveAdoptionRequest(myRequest);
  const hasOwnerRequests = isOwner && !adopted && ownerRequestCount > 0 && !!onManageRequests;
  const canOwnerRelist = isOwner && adopted && !!onRelist;
  const statusLabel = adopted ? 'Adopted' : listing.status;
  const useNativeDriver = Platform.OS !== 'web';

  const ownerPrimaryLabel = canOwnerRelist ? 'Re-list' : 'Edit profile';

  const ownerPrimaryAction = canOwnerRelist
    ? onRelist
    : onEditPost ?? onViewDetails;

  const shellShadow = Platform.OS === 'ios' || Platform.OS === 'android'
    ? shadows.md
    : { borderWidth: StyleSheet.hairlineWidth };

  const flipTo = (toBack: boolean) => {
    if (flipping) return;
    setFlipping(true);
    flipAnim.setValue(0);
    Animated.timing(flipAnim, {
      toValue: 1,
      duration: FLIP_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver,
    }).start(({ finished }) => {
      if (finished) {
        setShowBack(toBack);
        flipAnim.setValue(0);
      }
      setFlipping(false);
    });
    setTimeout(() => setShowBack(toBack), FLIP_MS / 2);
  };

  const rotateY = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '88deg', '0deg'],
  });
  const scale = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.94, 1],
  });
  const faceOpacity = flipAnim.interpolate({
    inputRange: [0, 0.42, 0.5, 0.58, 1],
    outputRange: [1, 0.35, 0, 0.35, 1],
  });

  // ─── Back face ───────────────────────────────────────────────────────────

  const backFace = (
    <View style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <View style={[styles.backHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.backHeaderLeft}>
          <View style={[styles.flipBadge, { backgroundColor: colors.primary + '18' }]}>
            <Icon name="sparkle" size={14} color={colors.primary} />
          </View>
          <Text style={[styles.backTitle, { color: colors.text }]}>About {listing.name}</Text>
        </View>
        <Pressable onPress={() => flipTo(false)} hitSlop={10} style={styles.closeBtn}>
          <Icon name="close" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.backScroll}
        contentContainerStyle={styles.backScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.backGrid}>
          <BackFact icon="vaccine" label="Vaccination" value={listing.vacc} colors={colors} />
          <BackFact icon="medical" label="Sterilization" value={listing.neutered ? 'Yes' : 'No'} colors={colors} />
          <BackFact icon={speciesIcon(listing.species)} label="Species" value={speciesLabel(listing.species)} colors={colors} />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Story</Text>
        <Text style={[styles.backStory, { color: colors.text }]}>{listing.story}</Text>

        {listing.requirements.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Requirements</Text>
            <View style={styles.backReqList}>
              {listing.requirements.map((req, i) => (
                <View key={i} style={styles.backReqRow}>
                  <Icon name="check" size={14} color={colors.success} />
                  <Text style={[styles.backReqText, { color: colors.text }]}>{req}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={[styles.postedBy, { color: colors.textTertiary }]}>
          Posted {listing.postedAt}
          {poster ? ` · @${poster.handle}` : ''}
        </Text>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Button size="sm" variant="soft" onPress={onViewDetails} style={{ flex: 1 }}>
          Full profile
        </Button>
        {isOwner ? (
          <Button
            size="sm"
            variant={canOwnerRelist ? 'primary' : 'soft'}
            onPress={ownerPrimaryAction}
            style={{ flex: 1 }}
          >
            {ownerPrimaryLabel}
          </Button>
        ) : !adopted && !hasActiveRequest ? (
          <Button size="sm" variant="primary" onPress={onRequest} style={{ flex: 1 }}>
            Request
          </Button>
        ) : !adopted && hasActiveRequest ? (
          <Button size="sm" variant="danger" onPress={onCancelRequest} style={{ flex: 1 }}>
            Cancel
          </Button>
        ) : (
          <Button size="sm" variant="outline" onPress={() => flipTo(false)} style={{ flex: 1 }}>
            Back
          </Button>
        )}
      </View>
    </View>
  );

  // ─── Front face ──────────────────────────────────────────────────────────

  const frontFace = (
    <View>
      {/* Photo */}
      <View style={styles.imageWrap}>
        <PhotoSlot
          height={IMAGE_H}
          uri={listing.mediaUrls?.[0]}
          imageKey={listing.id}
          borderRadius={0}
          label=""
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.22)', 'transparent', 'rgba(0,0,0,0.64)']}
          style={StyleSheet.absoluteFill}
        />

        {/* Poster chip + icon actions */}
        <View style={styles.imageTopRow}>
          {poster && !isOwner && (
            <View style={styles.posterChip}>
              <Avatar user={poster} size={20} />
              <Text style={styles.posterChipText}>@{poster.handle}</Text>
            </View>
          )}
          <Pressable
            onPress={onShare}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Share listing"
            style={({ pressed }) => [
              styles.roundBtn,
              {
                backgroundColor: 'rgba(0,0,0,0.36)',
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Icon name="forward" size={15} color="#fff" />
          </Pressable>
        </View>

        {/* Adopted ribbon */}
        {adopted && (
          <View style={[styles.adoptedRibbon, { backgroundColor: colors.success + 'EE' }]}>
            <Icon name="adoption" size={13} color="#fff" />
            <Text style={styles.adoptedRibbonText}>
              {successfulPlacementLabel(isOwner)}
            </Text>
          </View>
        )}

        {/* Name / breed / status overlay — single block to avoid overlap */}
        <View style={styles.imageCaption}>
          <View style={styles.nameRow}>
            <Text style={styles.heroName}>{listing.name}</Text>
            <Icon name={listing.icon} size={18} color="rgba(255,255,255,0.8)" fill="rgba(255,255,255,0.8)" />
          </View>
          <Text style={styles.heroBreed}>
            {listing.breed} · {listing.age} · {listing.gender}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.metaBlock}>
          <View style={styles.metaTopRow}>
            <Badge tone={statusBadgeTone(listing.status)}>
              {statusLabel}
            </Badge>
            <Text style={[styles.metaDot, { color: colors.textTertiary }]}>·</Text>
            <Icon name="mapPin" size={11} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
              {listing.loc}
            </Text>
          </View>

          <Text style={[styles.personality, { color: colors.text }]} numberOfLines={2}>
            {listing.personality}
          </Text>
          {hasOwnerRequests ? (
            <Pressable
              onPress={onManageRequests}
              accessibilityRole="button"
              accessibilityLabel="Review adoption requests"
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.ownerHint, { color: colors.primary }]}>
                Tap to review adoption requests
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Single action row: Details flip + primary CTA */}
        <View style={styles.actionRow}>
          <Pressable
            onPress={() => flipTo(true)}
            style={({ pressed }) => [
              styles.detailsBtn,
              {
                borderColor: colors.primary + '40',
                backgroundColor: colors.primary + '0A',
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Icon name="sparkle" size={18} color={colors.primary} />
            <Text style={[styles.detailsBtnText, { color: colors.primary }]}>Details</Text>
          </Pressable>

          {isOwner ? (
            <Button
              size="sm"
              variant={canOwnerRelist ? 'primary' : 'soft'}
              onPress={ownerPrimaryAction}
              style={{ flex: 1 }}
            >
              {ownerPrimaryLabel}
            </Button>
          ) : !adopted && !hasActiveRequest ? (
            <Button size="sm" variant="primary" onPress={onRequest} style={{ flex: 1 }}>
              Request
            </Button>
          ) : !adopted && hasActiveRequest ? (
            <Button size="sm" variant="danger" onPress={onCancelRequest} style={{ flex: 1 }}>
              Cancel
            </Button>
          ) : (
            <Button size="sm" variant="soft" onPress={onViewDetails} style={{ flex: 1 }}>
              Profile
            </Button>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.shell, shellShadow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Animated.View
        style={[
          styles.flipStage,
          {
            opacity: flipping ? faceOpacity : 1,
            transform: [
              { perspective: 1200 },
              { rotateY },
              { scale },
            ],
          },
        ]}
      >
        {/* Both faces always rendered; inactive one hidden via opacity (stays in layout for height) */}
        <View style={[styles.faceContainer, showBack && { opacity: 0 } as any]} pointerEvents={showBack ? 'none' : 'auto'}>
          {frontFace}
        </View>
        <View
          style={[styles.faceContainer, styles.faceOverlay, !showBack && { opacity: 0 } as any]}
          pointerEvents={showBack ? 'auto' : 'none'}
        >
          {backFace}
        </View>
      </Animated.View>
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
      <Text style={[styles.factValue, { color: colors.text }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: 14,
  },
  flipStage: {
    backfaceVisibility: 'hidden',
    ...Platform.select({
      web: { transformStyle: 'preserve-3d' as const },
      default: {},
    }),
  },
  faceContainer: {},
  faceOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'column',
  },

  // ── Photo ──────────────────────────────────────────────────────────────
  imageWrap: { position: 'relative' },
  imageTopRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 2,
  },
  posterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.42)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  posterChipText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  roundBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adoptedRibbon: {
    position: 'absolute',
    top: 46,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  adoptedRibbonText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  imageCaption: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  heroName: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  heroBreed: { color: 'rgba(255,255,255,0.88)', fontSize: 12.5, marginTop: 2, fontWeight: '500' },

  // ── Body ───────────────────────────────────────────────────────────────
  body: { padding: 14, paddingTop: 12, gap: 9 },
  metaBlock: { gap: 6 },
  metaTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  metaDot: { fontSize: 12, fontWeight: '600' },
  metaText: { fontSize: 12.5, fontWeight: '500', flexShrink: 1 },
  personality: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  ownerHint: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  detailsBtnText: { fontSize: 13, fontWeight: '700' },

  // ── Back face ──────────────────────────────────────────────────────────
  backHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  backHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  flipBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  closeBtn: { padding: 4 },
  backScroll: { flex: 1 },
  backScrollContent: { padding: 14, paddingTop: 4, gap: 10, paddingBottom: 4 },
  backGrid: { flexDirection: 'row', gap: 8 },
  fact: {
    flex: 1,
    padding: 10,
    borderRadius: radius.md,
    gap: 3,
    alignItems: 'flex-start',
    minHeight: 70,
  },
  factLabel: { fontSize: 10, fontWeight: '600' },
  factValue: { fontSize: 11.5, fontWeight: '700', lineHeight: 15 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  backStory: { fontSize: 14, lineHeight: 21 },
  backReqList: { gap: 8 },
  backReqRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  backReqText: { flex: 1, fontSize: 13, lineHeight: 19 },
  postedBy: { fontSize: 12, marginTop: 4 },
  footer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 4,
  },
});
