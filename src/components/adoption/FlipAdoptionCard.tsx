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
import type { AdoptionRequest, AdoptionRequestStatus } from '../../context/AdoptionFeedContext';
import { users } from '../../data/mockData';

const IMAGE_H = 188;
const FLIP_MS = 420;

type Props = {
  listing: AdoptionListing;
  saved: boolean;
  myRequest?: AdoptionRequest;
  onViewDetails: () => void;
  onRequest: () => void;
  onSave: () => void;
  onShare: () => void;
  onOpenThread?: () => void;
};

function requestStatusLabel(status: AdoptionRequestStatus): string {
  switch (status) {
    case 'queued': return 'In queue';
    case 'approved': return 'Approved';
    case 'rejected': return 'Passed';
    case 'adopted': return 'Adopted';
    default: return 'Pending';
  }
}

export function FlipAdoptionCard({
  listing,
  saved,
  myRequest,
  onViewDetails,
  onRequest,
  onSave,
  onShare,
  onOpenThread,
}: Props) {
  const { colors } = useTheme();
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [showBack, setShowBack] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const adopted = listing.status === 'Adopted';
  const poster = users[listing.userId as keyof typeof users];
  const isOwner = listing.userId === 'you';
  const statusLabel = adopted ? 'Successfully Adopted' : listing.status;
  const useNativeDriver = Platform.OS !== 'web';

  const shellShadow = Platform.select({
    ios: shadows.md,
    android: shadows.md,
    default: { borderWidth: 1 },
  });

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

  const shellStyle = [
    styles.shell,
    shellShadow,
    { backgroundColor: colors.surface, borderColor: colors.border },
  ];

  const backFace = (
    <>
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
          <BackFact icon="vaccine" label="Vaccines" value={listing.vacc} colors={colors} />
          <BackFact icon="shield" label="Health" value={listing.healthNotes.split('·')[0].trim()} colors={colors} />
          <BackFact icon="alert" label="Urgency" value={listing.urgent ? 'High' : 'Normal'} colors={colors} />
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
        {!adopted && !isOwner && !myRequest ? (
          <Button size="sm" variant="primary" onPress={onRequest} style={{ flex: 1 }}>
            Request
          </Button>
        ) : (
          <Button size="sm" variant="outline" onPress={() => flipTo(false)} style={{ flex: 1 }}>
            Front
          </Button>
        )}
      </View>
    </>
  );

  const frontFace = (
    <>
      <View style={styles.imageWrap}>
        <PhotoSlot
          height={IMAGE_H}
          tint={listing.tint}
          borderRadius={0}
          label={listing.name}
          icon={listing.icon}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.6)']}
          style={styles.imageGradient}
        />
        <View style={styles.imageTopRow}>
          {poster && (
            <View style={styles.posterChip}>
              <Avatar user={poster} size={22} />
              <Text style={styles.posterChipText}>@{poster.handle}</Text>
            </View>
          )}
          <View style={styles.imageActions}>
            <Pressable
              onPress={onSave}
              style={[styles.roundBtn, { backgroundColor: saved ? colors.accent + 'EE' : 'rgba(0,0,0,0.45)' }]}
            >
              <Icon name="heart" size={16} color="#fff" fill={saved ? '#fff' : 'none'} />
            </Pressable>
            <Pressable onPress={onShare} style={[styles.roundBtn, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
              <Icon name="forward" size={16} color="#fff" />
            </Pressable>
          </View>
        </View>
        {adopted && (
          <View style={[styles.adoptedRibbon, { backgroundColor: colors.success + 'EE' }]}>
            <Icon name="adoption" size={14} color="#fff" />
            <Text style={styles.adoptedRibbonText}>Successfully Adopted</Text>
          </View>
        )}
        <View style={styles.imageCaption}>
          <View style={styles.nameRow}>
            <Text style={styles.heroName}>{listing.name}</Text>
            <Icon name={listing.icon} size={20} color="#fff" fill="#fff" />
          </View>
          <Text style={styles.heroBreed}>
            {listing.breed} · {listing.age} · {listing.gender}
          </Text>
        </View>
        <Badge tone={statusBadgeTone(listing.status)} style={styles.statusBadge}>
          {statusLabel}
        </Badge>
      </View>

      <View style={styles.body}>
        <View style={styles.metaRow}>
          <MetaChip icon="mapPin" label={listing.loc} colors={colors} />
          <MetaChip icon="vaccine" label={listing.vacc} colors={colors} />
          {listing.urgent && !adopted && (
            <MetaChip icon="alert" label="Urgent" colors={colors} urgent />
          )}
        </View>

        <Text style={[styles.personality, { color: colors.text }]} numberOfLines={expanded ? 4 : 2}>
          “{listing.personality}”
        </Text>

        {expanded && (
          <Text style={[styles.storyPeek, { color: colors.textSecondary }]} numberOfLines={2}>
            {listing.story}
          </Text>
        )}

        {myRequest && !isOwner && (
          <Pressable
            onPress={onOpenThread}
            style={[styles.requestPill, { backgroundColor: colors.warningBg, borderColor: colors.warning + '44' }]}
          >
            <Icon name="comment" size={14} color={colors.warning} />
            <Text style={[styles.requestPillText, { color: colors.warning }]}>
              {requestStatusLabel(myRequest.status)}
              {myRequest.queuePosition ? ` · #${myRequest.queuePosition}` : ''}
            </Text>
            <Icon name="chevronRight" size={14} color={colors.warning} />
          </Pressable>
        )}

        <View style={styles.actionRow}>
          <Pressable
            onPress={() => setExpanded(v => !v)}
            style={({ pressed }) => [
              styles.ghostAction,
              { borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Icon name={expanded ? 'chevronLeft' : 'chevronDown'} size={16} color={colors.primary} />
            <Text style={[styles.ghostActionText, { color: colors.primary }]}>
              {expanded ? 'Less' : 'More'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => flipTo(true)}
            style={({ pressed }) => [
              styles.ghostAction,
              { borderColor: colors.primary + '30', backgroundColor: colors.primary + '08', opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Icon name="sparkle" size={16} color={colors.primary} />
            <Text style={[styles.ghostActionText, { color: colors.primary }]}>Details</Text>
          </Pressable>
        </View>

        <View style={styles.ctaRow}>
          <Button size="sm" variant="soft" onPress={onViewDetails} style={{ flex: 1 }}>
            Profile
          </Button>
          {!adopted && !isOwner && !myRequest && (
            <Button size="sm" variant="primary" onPress={onRequest} style={{ flex: 1.2 }}>
              Request
            </Button>
          )}
          {!adopted && myRequest && (
            <Button size="sm" variant="outline" onPress={onOpenThread ?? onViewDetails} style={{ flex: 1.2 }}>
              Thread
            </Button>
          )}
        </View>
      </View>
    </>
  );

  return (
    <View style={shellStyle}>
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
        {showBack ? backFace : frontFace}
      </Animated.View>
    </View>
  );
}

function MetaChip({
  icon, label, colors, urgent,
}: {
  icon: string; label: string;
  colors: ReturnType<typeof useTheme>['colors'];
  urgent?: boolean;
}) {
  return (
    <View style={[styles.metaChip, { backgroundColor: urgent ? colors.lostBg : colors.surface2 }]}>
      <Icon name={icon} size={12} color={urgent ? colors.lost : colors.textSecondary} />
      <Text style={[styles.metaChipText, { color: urgent ? colors.lost : colors.textSecondary }]}>{label}</Text>
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
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: 12,
  },
  flipStage: {
    backfaceVisibility: 'hidden',
    ...Platform.select({
      web: { transformStyle: 'preserve-3d' as const },
      default: {},
    }),
  },
  imageWrap: { position: 'relative' },
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: IMAGE_H * 0.55,
  },
  imageTopRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  posterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  posterChipText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  imageActions: { flexDirection: 'row', gap: 8 },
  roundBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageCaption: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 34,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroName: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
  heroBreed: { color: 'rgba(255,255,255,0.92)', fontSize: 13, marginTop: 2, fontWeight: '600' },
  statusBadge: { position: 'absolute', bottom: 10, left: 10 },
  adoptedRibbon: {
    position: 'absolute',
    top: 48,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  adoptedRibbonText: { color: '#fff', fontSize: 11.5, fontWeight: '700' },
  body: { padding: 14, gap: 10 },
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
  personality: { fontSize: 14, lineHeight: 21, fontStyle: 'italic' },
  storyPeek: { fontSize: 13, lineHeight: 19 },
  requestPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  requestPillText: { flex: 1, fontSize: 12.5, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 8 },
  ghostAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  ghostActionText: { fontSize: 12.5, fontWeight: '700' },
  ctaRow: { flexDirection: 'row', gap: 8 },
  backHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  backScroll: { maxHeight: 280 },
  backScrollContent: { padding: 14, gap: 10, paddingBottom: 4 },
  backGrid: { flexDirection: 'row', gap: 8 },
  fact: {
    flex: 1,
    padding: 10,
    borderRadius: radius.md,
    gap: 3,
    alignItems: 'flex-start',
    minHeight: 72,
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
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
