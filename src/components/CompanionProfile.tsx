import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, useWindowDimensions,
  Animated, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { radius, shadows } from '../theme/tokens';
import { CompanionAvatar } from './ui/Avatar';
import { getPetAvatarFrameSize } from './ui/PawPadShape';
import { Button, IconButton } from './ui/Button';
import { Sheet } from './ui/Sheet';
import { PhotoSlot } from './ui/PhotoSlot';
import { Icon } from './icons/Icon';
import { ToastData } from './ui/Toast';
import { TreatGiftBurst } from './TreatGiftBurst';
import { useTreatWallet } from '../context/TreatWalletContext';
import { useFeedPosts } from '../context/FeedPostContext';
import { PROFILE_TAB_ICON_SIZE } from './profile/ProfileChrome';
import type { Companion } from '../data/mockData';
import { useCompanions } from '../context/CompanionContext';
import { useAuth } from '../context/AuthContext';
import { useMediaPicker } from '../hooks/useMediaPicker';
import { useUserProfile, getCachedProfile } from '../hooks/useUserProfile';
import { usePostsByCompanion } from '../hooks/usePostsByCompanion';

const GRID_GAP = 2;
const GRID_COLS = 3;
const GRID_ROWS = 3;
const PROFILE_HORIZONTAL_PADDING = 32;
const POSTS_TAB_TRACK_H = 1;
const POSTS_TAB_INDICATOR_H = 3;
const PROFILE_SCROLL_INSET = 16;

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


// ── Shared profile blocks ─────────────────────────────────────────────────────

function BorderedAvatar({
  companion,
  size,
  giftBurstKey = 0,
  editable = false,
  uploading = false,
}: {
  companion: Companion;
  size: number;
  giftBurstKey?: number;
  editable?: boolean;
  uploading?: boolean;
}) {
  const { colors } = useTheme();
  const frame = getPetAvatarFrameSize(size);

  return (
    <View style={[styles.avatarSlot, { width: frame.width, minHeight: frame.height }]}>
      <CompanionAvatar companion={companion} size={size} />
      {editable ? (
        <View style={[styles.avatarBadge, { backgroundColor: colors.primary, borderColor: colors.bg }]}>
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Icon name="camera" size={12} color="#fff" sw={2.2} />
          )}
        </View>
      ) : null}
      <TreatGiftBurst
        trigger={giftBurstKey}
        avatarSize={size}
        frameWidth={frame.width}
        frameHeight={frame.height}
      />
    </View>
  );
}

function OwnerAssociation({
  companion,
  onOwnerPress,
}: {
  companion: Companion;
  onOwnerPress?: (ownerId: string) => void;
}) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const owner = useUserProfile(companion.ownerId);

  const isYou = companion.ownerId === user?.id;
  const ownerLabel = isYou ? 'you' : (owner?.name ?? '…');
  const pressable = !!onOwnerPress && !isYou;

  const handlePress = () => {
    if (pressable) onOwnerPress?.(companion.ownerId);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!pressable}
      hitSlop={pressable ? 6 : 0}
      accessibilityRole={pressable ? 'button' : 'text'}
      accessibilityLabel={`${companion.name} with ${ownerLabel}`}
      style={({ pressed }) => [
        styles.ownerInline,
        pressable && styles.ownerPressable,
        pressed && pressable && styles.pressed,
      ]}
    >
      <Text style={styles.ownerLine} numberOfLines={1}>
        <Text style={{ color: colors.textTertiary, fontWeight: '400' }}>with </Text>
        <Text
          style={{ color: colors.text, fontWeight: '600' }}
          onPress={pressable ? handlePress : undefined}
          suppressHighlighting
        >
          {ownerLabel}
        </Text>
      </Text>
    </Pressable>
  );
}

function ProfileIdentity({
  companion,
  giftBurstKey = 0,
  spacious = false,
  onAvatarPress,
  onOwnerPress,
  avatarEditable = false,
  avatarUploading = false,
}: {
  companion: Companion;
  giftBurstKey?: number;
  spacious?: boolean;
  onAvatarPress?: () => void;
  onOwnerPress?: (ownerId: string) => void;
  avatarEditable?: boolean;
  avatarUploading?: boolean;
}) {
  const { colors } = useTheme();
  const handle = companion.handle ?? companion.id;
  const avatarSize = spacious ? 88 : 72;

  const avatar = (
    <BorderedAvatar
      companion={companion}
      size={avatarSize}
      giftBurstKey={giftBurstKey}
      editable={avatarEditable}
      uploading={avatarUploading}
    />
  );

  return (
    <View style={styles.identityRow}>
      {onAvatarPress ? (
        <Pressable
          onPress={onAvatarPress}
          disabled={avatarUploading}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={
            avatarEditable
              ? `Change ${companion.name}'s profile photo`
              : `View ${companion.name}'s profile`
          }
          style={({ pressed }) => [
            styles.avatarPressable,
            pressed && styles.pressed,
          ]}
        >
          {avatar}
        </Pressable>
      ) : (
        avatar
      )}
      <View style={styles.identityMeta}>
        <View style={styles.nameRow}>
          <Text style={[
            styles.identityName,
            spacious && styles.identityNameLg,
            { color: colors.text },
          ]}>
            {companion.name}
          </Text>
        </View>
        <OwnerAssociation companion={companion} onOwnerPress={onOwnerPress} />
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

function StatsGrid({ companion, followerCount }: { companion: Companion; followerCount?: number | null }) {
  const { colors } = useTheme();
  const { getCompanionReceivedTreats } = useTreatWallet();
  const treatsReceived = getCompanionReceivedTreats(companion.id);
  const displayFollowers = followerCount ?? companion.followers ?? 0;

  const stats = [
    { icon: 'user', label: 'Followers', value: formatCount(displayFollowers) },
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

function useCompanionFollow(companionId: string, ownPet: boolean) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    setFollowing(false);
    setFollowerCount(null);
    if (!companionId) return;
    let cancelled = false;
    const load = async () => {
      const [countRes, myRes] = await Promise.all([
        supabase
          .from('companion_followers')
          .select('*', { count: 'exact', head: true })
          .eq('companion_id', companionId),
        user && !ownPet
          ? supabase
              .from('companion_followers')
              .select('user_id')
              .eq('companion_id', companionId)
              .eq('user_id', user.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (cancelled) return;
      setFollowerCount(countRes.count ?? 0);
      setFollowing(!!(myRes as any).data);
    };
    load();
    return () => { cancelled = true; };
  }, [companionId, user?.id, ownPet]);

  const toggleFollow = useCallback(async () => {
    if (!user || toggling) return;
    const next = !following;
    setFollowing(next);
    setFollowerCount(c => (c ?? 0) + (next ? 1 : -1));
    setToggling(true);
    let error: any;
    if (next) {
      ({ error } = await supabase
        .from('companion_followers')
        .insert({ companion_id: companionId, user_id: user.id }));
    } else {
      ({ error } = await supabase
        .from('companion_followers')
        .delete()
        .eq('companion_id', companionId)
        .eq('user_id', user.id));
    }
    setToggling(false);
    if (error) {
      setFollowing(!next);
      setFollowerCount(c => (c ?? 0) + (next ? -1 : 1));
    }
  }, [user, companionId, following, toggling]);

  return { following, followerCount, toggleFollow };
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
      const ownerProfile = getCachedProfile(result.ownerId);
      const ownerLabel = ownerProfile ? `@${ownerProfile.handle}` : 'their owner';
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
  const { getCompanion } = useCompanions();
  const siblings = useMemo(
    () => (companion.siblings ?? []).map(id => getCompanion(id)).filter((c): c is Companion => !!c),
    [companion.siblings, getCompanion],
  );
  if (!siblings.length) return null;

  return (
    <View style={styles.siblingsSection}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Household</Text>
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

function ProfilePostsGrid({ companionId }: { companionId: string }) {
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { getCompanionPostCount } = useFeedPosts();
  const { cellSize, onGridLayout } = useGridCellSize();
  const { getCompanion } = useCompanions();
  const companion = getCompanion(companionId);
  const tint = companion?.tint ?? colors.primary;
  const dbPosts = usePostsByCompanion(companionId);
  const postsTotal = getCompanionPostCount(companionId, dbPosts.length);
  const postsSlots = gridSlotCount(postsTotal);

  return (
    <View style={styles.postsSection} onLayout={e => onGridLayout(e.nativeEvent.layout.width)}>
      <View
        style={[
          styles.postsTabBar,
          { width: windowWidth, marginLeft: -PROFILE_SCROLL_INSET },
        ]}
      >
        <View
          pointerEvents="none"
          style={[styles.postsTabTrack, { backgroundColor: colors.border }]}
        />
        <View style={styles.postsTabActive}>
          <Icon name="grid" size={PROFILE_TAB_ICON_SIZE} color={colors.primary} sw={2.2} />
          <Text style={[styles.postsTabLabel, { color: colors.text }]}>Posts</Text>
          <Text style={[styles.postsTabCount, { color: colors.primary }]}>{postsTotal}</Text>
          <View
            pointerEvents="none"
            style={[styles.postsTabIndicator, { backgroundColor: colors.primary }]}
          />
        </View>
      </View>
      {cellSize > 0 && (
        <View style={[styles.photoGrid, { gap: GRID_GAP }]}>
          {Array.from({ length: postsSlots }).map((_, i) => {
            const post = dbPosts[i];
            if (post) {
              return (
                <View
                  key={post.id}
                  style={[
                    styles.postGridCell,
                    { width: cellSize, height: cellSize, backgroundColor: tint + '18', borderRadius: radius.sm },
                  ]}
                >
                  <Text style={[styles.postGridText, { color: tint }]} numberOfLines={4}>
                    {post.text}
                  </Text>
                </View>
              );
            }
            return (
              <View key={i} style={{ width: cellSize, height: cellSize }}>
                <PhotoSlot
                  height={cellSize}
                  imageKey={`${companionId}-slot-${i}`}
                  label=""
                  borderRadius={radius.sm}
                  style={{ width: cellSize, height: cellSize }}
                />
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ── Mini sheet ────────────────────────────────────────────────────────────────

interface CompanionMiniSheetProps {
  companionId: string;
  visible: boolean;
  onClose: () => void;
  onViewProfile: () => void;
  onOwnerPress?: (ownerId: string) => void;
  onToast: (t: ToastData) => void;
}

export function CompanionMiniSheet({
  companionId,
  visible,
  onClose,
  onViewProfile,
  onOwnerPress,
  onToast,
}: CompanionMiniSheetProps) {
  const { colors } = useTheme();
  const { openComposer } = useFeedPosts();
  const { getCompanion } = useCompanions();
  const companion = getCompanion(companionId);
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
        <ProfileIdentity
          companion={companion}
          giftBurstKey={burstKey}
          onAvatarPress={onViewProfile}
          onOwnerPress={onOwnerPress}
        />
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
  onOwnerPress?: (ownerId: string) => void;
  onToast: (t: ToastData) => void;
}

export function CompanionFullProfile({
  companionId,
  visible,
  onClose,
  onSwitchCompanion,
  onOwnerPress,
  onToast,
}: CompanionFullProfileProps) {
  const { colors } = useTheme();
  const { openComposer } = useFeedPosts();
  const { getCompanion, updateCompanionAvatar } = useCompanions();
  const { pickImage, takePhoto } = useMediaPicker();
  const companion = useMemo(() => getCompanion(companionId), [getCompanion, companionId]);
  const {
    burstKey, giving, ownPet, canGiveTreat, treatLabel, handleGiveTreat,
  } = useCompanionTreatActions(companion, onToast);
  const { following, followerCount, toggleFollow } = useCompanionFollow(companionId, ownPet);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const uploadCompanionPhoto = useCallback(async (source: 'library' | 'camera') => {
    if (!companion || avatarUploading) return;
    setAvatarUploading(true);
    try {
      const asset = source === 'camera'
        ? await takePhoto({ squareCrop: true })
        : await pickImage({ squareCrop: true });
      if (!asset) return;
      await updateCompanionAvatar(companion.id, asset);
      onToast({ msg: `${companion.name}'s photo updated`, icon: 'check', tone: 'success' });
    } catch {
      onToast({ msg: 'Could not update companion photo', icon: 'close', tone: 'danger' });
    } finally {
      setAvatarUploading(false);
    }
  }, [avatarUploading, companion, pickImage, takePhoto, updateCompanionAvatar, onToast]);

  const openAvatarPicker = useCallback(() => {
    if (!companion || avatarUploading) return;
    Alert.alert(`${companion.name}'s photo`, 'Choose a photo for this companion', [
      { text: 'Photo library', onPress: () => { void uploadCompanionPhoto('library'); } },
      { text: 'Take photo', onPress: () => { void uploadCompanionPhoto('camera'); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [avatarUploading, companion, uploadCompanionPhoto]);

  const slideAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(1);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 68,
        friction: 11,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleAddPost = useCallback(() => {
    if (!companion) return;
    openComposer({ initialCompanionIds: [companion.id], postAsCompanionId: companion.id });
  }, [companion, openComposer]);

  if (!companion || !visible) return null;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.fullOverlay,
        { backgroundColor: colors.bg, transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 800] }) }] },
      ]}
    >
      <SafeAreaView style={styles.fullRoot} edges={['top']}>
        <View style={styles.fullNav}>
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
          <ProfileIdentity
            companion={companion}
            giftBurstKey={burstKey}
            spacious
            onOwnerPress={onOwnerPress}
            onAvatarPress={ownPet ? openAvatarPicker : undefined}
            avatarEditable={ownPet}
            avatarUploading={avatarUploading}
          />
          <StatsGrid companion={companion} followerCount={followerCount} />
          <MoodLine companion={companion} />
          <ActionButtons
            large
            following={following}
            onFollow={ownPet ? undefined : async () => {
              await toggleFollow();
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
    </Animated.View>
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
  ownerInline: {
    alignSelf: 'flex-start',
    marginTop: 1,
  },
  avatarPressable: Platform.select({
    web: { cursor: 'pointer' },
    default: {},
  }),
  ownerPressable: Platform.select({
    web: { cursor: 'pointer' },
    default: {},
  }),
  ownerLine: { fontSize: 13.5, lineHeight: 18 },
  pressed: { opacity: 0.7 },
  avatarSlot: {
    position: 'relative',
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'visible',
    flexShrink: 0,
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    zIndex: 2,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  identityName: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  identityNameLg: { fontSize: 22 },
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
  fullOverlay: { zIndex: 99 },
  fullRoot: { flex: 1 },
  fullNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
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
    position: 'relative',
    marginBottom: 8,
  },
  postsTabTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: POSTS_TAB_TRACK_H,
  },
  postsTabActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingTop: 12,
    paddingBottom: 12 + POSTS_TAB_INDICATOR_H,
    paddingHorizontal: 12,
    position: 'relative',
  },
  postsTabLabel: { fontSize: 14, fontWeight: '700' },
  postsTabCount: { fontSize: 14, fontWeight: '700' },
  postsTabIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: POSTS_TAB_INDICATOR_H,
    zIndex: 1,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  postGridCell: {
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 6,
  },
  postGridText: {
    fontSize: 10.5,
    fontWeight: '600',
    lineHeight: 14,
  },
});
