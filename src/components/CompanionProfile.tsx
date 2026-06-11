import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal, ScrollView, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { radius, shadows } from '../theme/tokens';
import { CompanionAvatar } from './ui/Avatar';
import { getPetAvatarFrameSize, getPetInnerCircleSize } from './ui/PawPadShape';
import { Button, IconButton } from './ui/Button';
import { Sheet } from './ui/Sheet';
import { PhotoSlot } from './ui/PhotoSlot';
import { Icon } from './icons/Icon';
import { ToastData } from './ui/Toast';
import { TreatGiftBurst } from './TreatGiftBurst';
import { useTreatWallet } from '../context/TreatWalletContext';
import { useFeedPosts } from '../context/FeedPostContext';
import { companions, posts as seedPosts, users, Companion } from '../data/mockData';

const GRID_GAP = 2;
const GRID_COLS = 3;
const GRID_ROWS = 3;
const PROFILE_HORIZONTAL_PADDING = 32;

function gridSlotCount(displayCount: number): number {
  const minSlots = GRID_COLS * GRID_ROWS;
  const needed = Math.max(displayCount, minSlots);
  return Math.ceil(needed / GRID_COLS) * GRID_COLS;
}

function useGridCellSize(horizontalPadding = PROFILE_HORIZONTAL_PADDING) {
  const { width: windowWidth } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  const availableWidth = measuredWidth ?? Math.max(0, windowWidth - horizontalPadding);

  const cellSize = useMemo(() => {
    if (availableWidth <= 0) return 0;
    return Math.floor((availableWidth - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS);
  }, [availableWidth]);

  return {
    cellSize,
    onGridLayout: (width: number) => {
      if (width > 0) setMeasuredWidth(width);
    },
  };
}

function formatCount(n: number): string {
  if (n >= 1000) {
    const v = n / 1000;
    return (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10).toString().replace(/\.0$/, '') + 'K';
  }
  return String(n);
}

function resolveCompanion(id: string): Companion | null {
  return companions[id] ?? null;
}

function seedCompanionPosts(id: string) {
  return seedPosts.filter(p => p.companions.includes(id));
}

function getCompanionSiblings(companion: Companion): Companion[] {
  const explicit = (companion.siblings ?? [])
    .map(id => companions[id])
    .filter((c): c is Companion => !!c);
  if (explicit.length) return explicit;

  return Object.values(companions).filter(
    c => c.ownerId === companion.ownerId && c.id !== companion.id,
  );
}

// ── Shared profile blocks ─────────────────────────────────────────────────────

function BorderedAvatar({
  companion,
  size,
  giftBurstKey = 0,
}: {
  companion: Companion;
  size: number;
  giftBurstKey?: number;
}) {
  const { colors } = useTheme();
  const online = companion.online !== false;
  const dot = Math.max(9, Math.round(size * 0.14));
  const frame = getPetAvatarFrameSize(size);
  const inner = getPetInnerCircleSize(size);

  return (
    <View style={[styles.avatarSlot, { width: frame.width, minHeight: frame.height }]}>
      <CompanionAvatar companion={companion} size={size} />
      <TreatGiftBurst
        trigger={giftBurstKey}
        avatarSize={size}
        frameWidth={frame.width}
        frameHeight={frame.height}
      />
      {online && (
        <View style={[styles.onlineDot, {
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          backgroundColor: colors.success,
          borderColor: colors.surface,
          right: Math.max(0, (frame.width - inner) / 2) - 1,
          bottom: 4,
        }]} />
      )}
    </View>
  );
}

function ProfileIdentity({
  companion,
  giftBurstKey = 0,
  spacious = false,
}: {
  companion: Companion;
  giftBurstKey?: number;
  spacious?: boolean;
}) {
  const { colors } = useTheme();
  const handle = companion.handle ?? companion.id;
  const avatarSize = spacious ? 88 : 72;

  return (
    <View style={styles.identityRow}>
      <BorderedAvatar
        companion={companion}
        size={avatarSize}
        giftBurstKey={giftBurstKey}
      />
      <View style={styles.identityMeta}>
        <View style={styles.nameRow}>
          <Text style={[
            styles.identityName,
            spacious && styles.identityNameLg,
            { color: colors.text },
          ]}>
            {companion.name}
          </Text>
          {companion.verified && (
            <View style={[styles.verifiedBadge, { backgroundColor: colors.primary }]}>
              <Icon name="check" size={spacious ? 10 : 9} color="#fff" />
            </View>
          )}
        </View>
        {spacious ? (
          <Text style={[styles.bio, { color: colors.textSecondary }]}>{companion.about}</Text>
        ) : (
          <View style={[styles.handlePill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.handlePillText, { color: colors.primary }]}>@{handle}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function StatsGrid({ companion }: { companion: Companion }) {
  const { colors } = useTheme();
  const { getCompanionReceivedTreats } = useTreatWallet();
  const treatsReceived = getCompanionReceivedTreats(companion.id);

  const stats = [
    { icon: 'user', label: 'Followers', value: formatCount(companion.followers ?? 0) },
    { icon: 'paw', label: 'Pawprints', value: formatCount(companion.pawprints ?? 0) },
    { icon: 'bone', label: 'Treats', value: formatCount(treatsReceived) },
  ];

  return (
    <View style={styles.statsGrid}>
      {stats.map(s => (
        <View key={s.label} style={styles.statsCell}>
          <Icon name={s.icon} size={16} color={colors.primary} />
          <Text style={[styles.statsValue, { color: colors.text }]}>{s.value}</Text>
          <Text style={[styles.statsLabel, { color: colors.textTertiary }]}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

function MoodLine({ companion }: { companion: Companion }) {
  const { colors } = useTheme();
  const mood = companion.mood ?? 'Happy and playful 🐾';

  return (
    <View style={styles.moodLine}>
      <Icon name="moon" size={13} color={colors.textTertiary} />
      <Text style={[styles.moodInline, { color: colors.textSecondary }]}>
        <Text style={[styles.moodEyebrow, { color: colors.textTertiary }]}>Current Mood · </Text>
        {mood}
      </Text>
    </View>
  );
}

function ActionButtons({
  onFollow,
  onTreat,
  following,
  followLabel = 'Follow',
  secondaryLabel = 'View Profile',
  onSecondary,
  secondaryIcon = 'user',
  hideTreat = false,
  treatDisabled = false,
  treatLoading = false,
  treatLabel = 'Give Treat',
  treatIcon = 'paw',
  large = false,
}: {
  onFollow?: () => void;
  onTreat?: () => void;
  following?: boolean;
  followLabel?: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryIcon?: string;
  hideTreat?: boolean;
  treatDisabled?: boolean;
  treatLoading?: boolean;
  treatLabel?: string;
  treatIcon?: string;
  large?: boolean;
}) {
  return (
    <View style={styles.actionRow}>
      {onSecondary ? (
        <Button
          variant="outline"
          size={large ? 'md' : 'sm'}
          icon={secondaryIcon}
          style={{ flex: 1 }}
          onPress={onSecondary}
        >
          {secondaryLabel}
        </Button>
      ) : onFollow ? (
        <Button
          variant={following ? 'soft' : 'outline'}
          size={large ? 'md' : 'sm'}
          icon="user"
          style={{ flex: 1 }}
          onPress={onFollow}
        >
          {following ? 'Following' : followLabel}
        </Button>
      ) : null}
      {!hideTreat && onTreat && (
        <Button
          variant="primary"
          size={large ? 'md' : 'sm'}
          icon={treatIcon}
          style={{ flex: 1 }}
          onPress={onTreat}
          disabled={treatDisabled}
          loading={treatLoading}
        >
          {treatLabel}
        </Button>
      )}
    </View>
  );
}

function useCompanionTreatActions(
  companion: Companion | null,
  onToast: (t: ToastData) => void,
) {
  const { giveTreat, canGive, isOwnPet, remaining } = useTreatWallet();
  const [burstKey, setBurstKey] = useState(0);
  const [giving, setGiving] = useState(false);

  const ownPet = companion ? isOwnPet(companion.id) : false;
  const canGiveTreat = companion ? canGive(companion.id) : false;

  const handleGiveTreat = useCallback(async () => {
    if (!companion || giving || !canGiveTreat) {
      if (!canGiveTreat && remaining <= 0) {
        onToast({ msg: 'No treats left to give this month', icon: 'bone', tone: 'warning' });
      }
      return;
    }

    setGiving(true);
    const result = await giveTreat(companion.id);
    setGiving(false);

    if (result.ok) {
      setBurstKey(k => k + 1);
      const owner = users[result.ownerId];
      const ownerLabel = owner ? `@${owner.handle}` : 'their owner';
      onToast({
        msg: `Treat sent to ${companion.name}! Added to ${ownerLabel} · ${result.remaining} left to give`,
        icon: 'bone',
        tone: 'accent',
      });
    } else if (result.reason === 'empty') {
      onToast({ msg: 'No treats left to give this month', icon: 'bone', tone: 'warning' });
    }
  }, [companion, giving, canGiveTreat, remaining, giveTreat, onToast]);

  return {
    burstKey,
    giving,
    ownPet,
    canGiveTreat,
    treatLabel: remaining <= 0 ? 'Out of treats' : 'Give Treat',
    handleGiveTreat,
  };
}

function SiblingsRow({
  companion,
  onOpen,
}: {
  companion: Companion;
  onOpen?: (id: string) => void;
}) {
  const { colors } = useTheme();
  const siblings = getCompanionSiblings(companion);
  if (!siblings.length) return null;

  return (
    <View style={styles.siblingsSection}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Siblings</Text>
      <View style={styles.siblingsRow}>
        {siblings.map(sib => (
          <Pressable key={sib.id} onPress={() => onOpen?.(sib.id)} style={styles.siblingItem}>
            <CompanionAvatar companion={sib} size={48} />
            <Text style={[styles.siblingName, { color: colors.textSecondary }]} numberOfLines={1}>
              {sib.name}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function PhotoGrid({
  slotCount,
  cellSize,
  tint,
}: {
  slotCount: number;
  cellSize: number;
  tint: string;
}) {
  if (cellSize <= 0) return null;

  return (
    <View style={[styles.photoGrid, { gap: GRID_GAP }]}>
      {Array.from({ length: slotCount }).map((_, i) => (
        <View key={i} style={{ width: cellSize, height: cellSize }}>
          <PhotoSlot
            height={cellSize}
            tint={tint}
            label=""
            icon="image"
            borderRadius={radius.sm}
            style={{ width: cellSize, height: cellSize }}
          />
        </View>
      ))}
    </View>
  );
}

function ProfilePostsGrid({ companionId }: { companionId: string }) {
  const { colors } = useTheme();
  const { getCompanionPostCount } = useFeedPosts();
  const { cellSize, onGridLayout } = useGridCellSize();
  const companion = resolveCompanion(companionId);
  const tint = companion?.tint ?? colors.primary;
  const baseCount = companion?.postsCount ?? seedCompanionPosts(companionId).length;
  const postsTotal = getCompanionPostCount(companionId, baseCount);
  const postsSlots = gridSlotCount(postsTotal);

  return (
    <View style={styles.postsSection} onLayout={e => onGridLayout(e.nativeEvent.layout.width)}>
      <View style={[styles.postsTabBar, { borderBottomColor: colors.border }]}>
        <View style={styles.postsTabActive}>
          <Icon name="grid" size={15} color={colors.primary} />
          <Text style={[styles.postsTabLabel, { color: colors.text }]}>Posts</Text>
          <Text style={[styles.postsTabCount, { color: colors.primary }]}>{postsTotal}</Text>
          <View style={[styles.postsTabUnderline, { backgroundColor: colors.primary }]} />
        </View>
      </View>
      <PhotoGrid slotCount={postsSlots} cellSize={cellSize} tint={tint} />
    </View>
  );
}

// ── Mini sheet ────────────────────────────────────────────────────────────────

interface CompanionMiniSheetProps {
  companionId: string;
  visible: boolean;
  onClose: () => void;
  onViewProfile: () => void;
  onToast: (t: ToastData) => void;
}

export function CompanionMiniSheet({
  companionId,
  visible,
  onClose,
  onViewProfile,
  onToast,
}: CompanionMiniSheetProps) {
  const { colors } = useTheme();
  const { openComposer } = useFeedPosts();
  const companion = resolveCompanion(companionId);
  const {
    burstKey, giving, ownPet, canGiveTreat, treatLabel, handleGiveTreat,
  } = useCompanionTreatActions(companion, onToast);

  const handleAddPost = useCallback(() => {
    if (!companion) return;
    openComposer({ initialCompanionIds: [companion.id], postAsCompanionId: companion.id });
  }, [companion, openComposer]);

  if (!companion) return null;

  return (
    <Sheet visible={visible} onClose={onClose} backgroundColor={colors.surface}>
      <View style={styles.sheetBody}>
        <ProfileIdentity companion={companion} giftBurstKey={burstKey} />
        <Text style={[styles.bio, { color: colors.textSecondary }]}>{companion.about}</Text>
        <StatsGrid companion={companion} />
        <MoodLine companion={companion} />
        <ActionButtons
          onSecondary={onViewProfile}
          secondaryLabel="View Profile"
          secondaryIcon="user"
          onTreat={ownPet ? handleAddPost : handleGiveTreat}
          treatLabel={ownPet ? 'Add post' : treatLabel}
          treatIcon={ownPet ? 'plus' : 'paw'}
          treatDisabled={!ownPet && !canGiveTreat}
          treatLoading={ownPet ? false : giving}
        />
      </View>
    </Sheet>
  );
}

// ── Full profile ──────────────────────────────────────────────────────────────

interface CompanionFullProfileProps {
  companionId: string;
  visible: boolean;
  onClose: () => void;
  onSwitchCompanion?: (id: string) => void;
  onToast: (t: ToastData) => void;
}

export function CompanionFullProfile({
  companionId,
  visible,
  onClose,
  onSwitchCompanion,
  onToast,
}: CompanionFullProfileProps) {
  const { colors } = useTheme();
  const { openComposer } = useFeedPosts();
  const [following, setFollowing] = useState(false);
  const companion = useMemo(() => resolveCompanion(companionId), [companionId]);
  const {
    burstKey, giving, ownPet, canGiveTreat, treatLabel, handleGiveTreat,
  } = useCompanionTreatActions(companion, onToast);

  const handleAddPost = useCallback(() => {
    if (!companion) return;
    openComposer({ initialCompanionIds: [companion.id], postAsCompanionId: companion.id });
  }, [companion, openComposer]);

  useEffect(() => {
    setFollowing(false);
  }, [companionId]);

  if (!companion) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={[styles.fullRoot, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
        <View style={[styles.fullNav, { borderBottomColor: colors.border }]}>
          <View style={[styles.navIconBtn, { backgroundColor: colors.surface }, shadows.sm]}>
            <IconButton name="back" size={40} color={colors.text} onPress={onClose} />
          </View>
          <View style={styles.navCenter}>
            <Text style={[styles.navHandle, { color: colors.primary }]} numberOfLines={1}>
              @{companion.handle ?? companion.id}
            </Text>
          </View>
          <View style={[styles.navIconBtn, { backgroundColor: colors.surface }, shadows.sm]}>
            <IconButton
              name="more"
              size={40}
              color={colors.textSecondary}
              onPress={() => onToast({ msg: 'More options coming soon', icon: 'more', tone: 'info' })}
            />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.fullScroll}
          showsVerticalScrollIndicator={false}
        >
          <ProfileIdentity companion={companion} giftBurstKey={burstKey} spacious />
          <StatsGrid companion={companion} />
          <MoodLine companion={companion} />
          <ActionButtons
            large
            following={following}
            onFollow={ownPet ? undefined : () => {
              setFollowing(f => !f);
              onToast({
                msg: following ? `Unfollowed ${companion.name}` : `Now following ${companion.name}!`,
                icon: 'user',
                tone: 'primary',
              });
            }}
            onTreat={ownPet ? handleAddPost : handleGiveTreat}
            treatLabel={ownPet ? 'Add post' : treatLabel}
            treatIcon={ownPet ? 'plus' : 'paw'}
            treatDisabled={!ownPet && !canGiveTreat}
            treatLoading={ownPet ? false : giving}
          />
          <View style={styles.profileLower}>
            <SiblingsRow companion={companion} onOpen={id => onSwitchCompanion?.(id)} />
            <ProfilePostsGrid companionId={companionId} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetBody: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 28,
    gap: 14,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  identityMeta: { flex: 1, gap: 4 },
  avatarSlot: {
    position: 'relative',
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'visible',
    flexShrink: 0,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  identityName: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  identityNameLg: { fontSize: 22 },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handlePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 2,
  },
  handlePillText: { fontSize: 12.5, fontWeight: '600' },
  bio: { fontSize: 14, lineHeight: 21 },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statsCell: { flex: 1, alignItems: 'center', gap: 4 },
  statsValue: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  statsLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  moodLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  moodInline: { flex: 1, fontSize: 13, lineHeight: 19 },
  moodEyebrow: { fontSize: 13, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10 },
  onlineDot: {
    position: 'absolute',
    borderWidth: 2,
  },
  fullRoot: { flex: 1 },
  fullNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navIconBtn: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  navCenter: { flex: 1, alignItems: 'center' },
  navHandle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.1 },
  fullScroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 44, gap: 14 },
  profileLower: { gap: 4 },
  siblingsSection: { gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  siblingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  siblingItem: { alignItems: 'center', gap: 4, width: 56 },
  siblingName: { fontSize: 11.5, fontWeight: '600', textAlign: 'center' },
  postsSection: { marginTop: 0 },
  postsTabBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  postsTabActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    position: 'relative',
  },
  postsTabLabel: { fontSize: 14, fontWeight: '700' },
  postsTabCount: { fontSize: 14, fontWeight: '700' },
  postsTabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
});
