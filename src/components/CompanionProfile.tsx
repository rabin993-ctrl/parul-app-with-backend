import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, useWindowDimensions,
  Animated, Platform, ActivityIndicator, Image, Modal, FlatList, PanResponder,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { radius, shadows } from '../theme/tokens';
import { CompanionAvatar } from './ui/Avatar';
import { getPetAvatarFrameSize } from './ui/PawPadShape';
import { Button, IconButton } from './ui/Button';
import { Sheet } from './ui/Sheet';
import { Icon } from './icons/Icon';
import { ToastData } from './ui/Toast';
import { TreatGiftBurst } from './TreatGiftBurst';
import { useTreatWallet } from '../context/TreatWalletContext';
import { useFeedPosts } from '../context/FeedPostContext';
import { PROFILE_TAB_ICON_SIZE } from './profile/ProfileChrome';
import type { Companion, Post } from '../data/mockData';
import { useCompanions } from '../context/CompanionContext';
import { useResolvedCompanion } from '../hooks/useResolvedCompanion';
import { useAuth } from '../context/AuthContext';
import { useMediaPicker } from '../hooks/useMediaPicker';
import { useUserProfile, getCachedProfile } from '../hooks/useUserProfile';
import { usePostsByCompanion } from '../hooks/usePostsByCompanion';
import { splitCompanionPosts, type CompanionContentStyle } from '../utils/companionPostContent';

const GRID_GAP = 2;
const GRID_COLS = 3;
const PROFILE_HORIZONTAL_PADDING = 32;
const POSTS_TAB_TRACK_H = 1;
const POSTS_TAB_INDICATOR_H = 3;
const PROFILE_SCROLL_INSET = 16;

type CompanionPostsTab = 'updates' | 'gallery';

function CompanionAddPostSheet({
  visible,
  companionName,
  onClose,
  onSelectMode,
}: {
  visible: boolean;
  companionName: string;
  onClose: () => void;
  onSelectMode: (mode: CompanionContentStyle) => void;
}) {
  const { colors } = useTheme();

  return (
    <Sheet visible={visible} onClose={onClose} title={`Add to ${companionName}'s profile`}>
      <View style={styles.addPostModeSheet}>
        <Pressable
          onPress={() => onSelectMode('update')}
          style={({ pressed }) => [
            styles.addPostModeOption,
            { backgroundColor: colors.surface2, borderColor: colors.border },
            pressed && { opacity: 0.82 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Write an update"
        >
          <View style={[styles.addPostModeIcon, { backgroundColor: colors.infoBg }]}>
            <Icon name="comment" size={20} color={colors.primary} sw={2.2} />
          </View>
          <View style={styles.addPostModeCopy}>
            <Text style={[styles.addPostModeTitle, { color: colors.text }]}>Write an update</Text>
            <Text style={[styles.addPostModeBody, { color: colors.textSecondary }]}>
              Share what {companionName} is up to — text with an optional photo.
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => onSelectMode('gallery')}
          style={({ pressed }) => [
            styles.addPostModeOption,
            { backgroundColor: colors.surface2, borderColor: colors.border },
            pressed && { opacity: 0.82 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Add a gallery photo"
        >
          <View style={[styles.addPostModeIcon, { backgroundColor: colors.infoBg }]}>
            <Icon name="grid" size={20} color={colors.primary} sw={2.2} />
          </View>
          <View style={styles.addPostModeCopy}>
            <Text style={[styles.addPostModeTitle, { color: colors.text }]}>Add a photo</Text>
            <Text style={[styles.addPostModeBody, { color: colors.textSecondary }]}>
              Gallery moment — photo first with an optional short caption.
            </Text>
          </View>
        </Pressable>
      </View>
    </Sheet>
  );
}

function useCompanionAddPost(companion: Companion | null | undefined) {
  const { openComposer } = useFeedPosts();
  const [modeSheetOpen, setModeSheetOpen] = useState(false);

  const promptAddPost = useCallback(() => {
    if (!companion) return;
    setModeSheetOpen(true);
  }, [companion]);

  const openWithMode = useCallback((mode: CompanionContentStyle) => {
    if (!companion) return;
    setModeSheetOpen(false);
    openComposer({
      initialCompanionIds: [companion.id],
      postAsCompanionId: companion.id,
      companionContentMode: mode,
    });
  }, [companion, openComposer]);

  return {
    modeSheetOpen,
    setModeSheetOpen,
    promptAddPost,
    openWithMode,
  };
}

function CompanionPostsTabBar({
  tab,
  onChange,
  updateCount,
  galleryCount,
  windowWidth,
  colors,
}: {
  tab: CompanionPostsTab;
  onChange: (tab: CompanionPostsTab) => void;
  updateCount: number;
  galleryCount: number;
  windowWidth: number;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const tabs: { id: CompanionPostsTab; icon: string; label: string; count: number }[] = [
    { id: 'updates', icon: 'comment', label: 'Posts', count: updateCount },
    { id: 'gallery', icon: 'grid', label: 'Gallery', count: galleryCount },
  ];

  return (
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
      <View style={styles.postsTabRow}>
        {tabs.map(item => {
          const active = tab === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => onChange(item.id)}
              style={styles.postsTabCell}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${item.label}, ${item.count}`}
            >
              <View style={styles.postsTabActive}>
                <Icon
                  name={item.icon}
                  size={PROFILE_TAB_ICON_SIZE}
                  color={active ? colors.primary : colors.textTertiary}
                  sw={2.2}
                />
                <Text style={[styles.postsTabLabel, { color: active ? colors.text : colors.textSecondary }]}>
                  {item.label}
                </Text>
                <Text style={[styles.postsTabCount, { color: active ? colors.primary : colors.textTertiary }]}>
                  {item.count}
                </Text>
                {active ? (
                  <View
                    pointerEvents="none"
                    style={[styles.postsTabIndicator, { backgroundColor: colors.primary }]}
                  />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function CompanionUpdateCard({
  post,
  tint,
  textColor,
  secondaryColor,
}: {
  post: Post;
  tint: string;
  textColor: string;
  secondaryColor: string;
}) {
  const imageUrl = post.mediaUrls?.[0];

  return (
    <View style={[styles.updateCard, { backgroundColor: tint + '14' }]}>
      {post.text ? (
        <Text style={[styles.updateCardText, { color: textColor }]}>{post.text}</Text>
      ) : null}
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.updateCardImage}
          resizeMode="cover"
        />
      ) : null}
      {post.time ? (
        <Text style={[styles.updateCardTime, { color: secondaryColor }]}>{post.time}</Text>
      ) : null}
    </View>
  );
}

function CompanionUpdatesList({
  posts,
  tint,
  colors,
}: {
  posts: Post[];
  tint: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  if (posts.length === 0) {
    return (
      <View style={styles.emptyPosts}>
        <Icon name="comment" size={28} color={colors.border} />
        <Text style={[styles.emptyPostsText, { color: colors.textTertiary }]}>No updates yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.updatesList}>
      {posts.map(post => (
        <CompanionUpdateCard
          key={post.id}
          post={post}
          tint={tint}
          textColor={colors.text}
          secondaryColor={colors.textTertiary}
        />
      ))}
    </View>
  );
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
  onEditPress,
}: {
  companion: Companion;
  size: number;
  giftBurstKey?: number;
  editable?: boolean;
  uploading?: boolean;
  onEditPress?: () => void;
}) {
  const { colors } = useTheme();
  const frame = getPetAvatarFrameSize(size);

  const inner = (
    <>
      <CompanionAvatar companion={companion} size={size} />
      {editable && uploading && (
        <View style={[StyleSheet.absoluteFill, styles.avatarUploadingOverlay]}>
          <ActivityIndicator color="#fff" />
        </View>
      )}
      <TreatGiftBurst
        trigger={giftBurstKey}
        avatarSize={size}
        frameWidth={frame.width}
        frameHeight={frame.height}
      />
    </>
  );

  if (editable) {
    return (
      <Pressable
        onPress={onEditPress}
        disabled={uploading || !onEditPress}
        accessibilityRole="button"
        accessibilityLabel={`Change ${companion.name}'s profile photo`}
        style={({ pressed }) => [
          styles.avatarSlot,
          { width: frame.width, minHeight: frame.height, opacity: pressed ? 0.75 : 1 },
        ]}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View style={[styles.avatarSlot, { width: frame.width, minHeight: frame.height }]}>
      {inner}
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

  // Editable: BorderedAvatar itself is the Pressable (tapping avatar opens photo picker).
  // Non-editable with onAvatarPress: wrap the whole avatar in a Pressable (opens full profile).
  const avatar = avatarEditable ? (
    <BorderedAvatar
      companion={companion}
      size={avatarSize}
      giftBurstKey={giftBurstKey}
      editable
      uploading={avatarUploading}
      onEditPress={onAvatarPress}
    />
  ) : onAvatarPress ? (
    <Pressable
      onPress={onAvatarPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`View ${companion.name}'s profile`}
      style={({ pressed }) => [styles.avatarPressable, pressed && styles.pressed]}
    >
      <BorderedAvatar
        companion={companion}
        size={avatarSize}
        giftBurstKey={giftBurstKey}
      />
    </Pressable>
  ) : (
    <BorderedAvatar
      companion={companion}
      size={avatarSize}
      giftBurstKey={giftBurstKey}
    />
  );

  return (
    <View style={styles.identityRow}>
      {avatar}
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

function StatsGrid({
  companion,
  liveStats,
}: {
  companion: Companion;
  liveStats: ReturnType<typeof useCompanionLiveStats>;
}) {
  const { colors } = useTheme();
  const displayFollowers = liveStats.followerCount ?? companion.followers ?? 0;

  const stats = [
    { icon: 'user', label: 'Followers', value: formatCount(displayFollowers) },
    { icon: 'paw', label: 'Pawprints', value: formatCount(liveStats.pawprints) },
    { icon: 'bone', label: 'Treats', value: formatCount(liveStats.treatCount) },
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

async function fetchCompanionPawprintCount(companionId: string): Promise<number> {
  const { data: authoredRows, error: authoredErr } = await supabase
    .from('posts')
    .select('id')
    .eq('companion_author_id', companionId);

  if (authoredErr || !authoredRows?.length) return 0;

  const postIds = authoredRows.map(row => row.id);

  const { count, error } = await supabase
    .from('post_reactions')
    .select('*', { count: 'exact', head: true })
    .in('post_id', postIds)
    .eq('kind', 'paw');

  return error ? 0 : (count ?? 0);
}

function useCompanionLiveStats(companionId: string, ownPet: boolean) {
  const { followerCount, following, toggleFollow } = useCompanionFollow(companionId, ownPet);
  const { getCompanionReceivedTreats } = useTreatWallet();
  const [treatCount, setTreatCount] = useState(0);
  const [pawprints, setPawprints] = useState(0);
  const treatsFromWallet = getCompanionReceivedTreats(companionId);

  const refreshCounts = useCallback(async () => {
    if (!companionId) return;
    const [treatsRes, pawCount] = await Promise.all([
      supabase
        .from('treat_gifts')
        .select('*', { count: 'exact', head: true })
        .eq('companion_id', companionId),
      fetchCompanionPawprintCount(companionId),
    ]);
    setTreatCount(treatsRes.count ?? 0);
    setPawprints(pawCount);
  }, [companionId]);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts, treatsFromWallet]);

  return {
    followerCount,
    following,
    toggleFollow,
    treatCount: Math.max(treatCount, treatsFromWallet),
    pawprints,
    refreshCounts,
  };
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

interface PostViewerState {
  images: string[];
  caption: string;
  postIndex: number;
  totalPosts: number;
}

function PostImageViewer({
  images,
  caption,
  postIndex,
  totalPosts,
  onClose,
}: PostViewerState & { onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const [current, setCurrent] = useState(0);
  const slideY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      // Only claim the gesture when movement is clearly downward (not horizontal scroll).
      onMoveShouldSetPanResponder: (_, gs) =>
        gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx) * 2,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) slideY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 90 || gs.vy > 0.6) {
          Animated.timing(slideY, {
            toValue: height,
            duration: 220,
            useNativeDriver: true,
          }).start(onClose);
        } else {
          Animated.spring(slideY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  const imageAreaH = height * 0.68;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View
        style={[viewerStyles.overlay, { transform: [{ translateY: slideY }] }]}
        {...panResponder.panHandlers}
      >
        {/* Drag handle */}
        <View style={viewerStyles.dragHandle} />

        {/* Post counter pill */}
        {totalPosts > 1 && (
          <View style={viewerStyles.postPill}>
            <Text style={viewerStyles.postPillText}>Post {postIndex + 1} of {totalPosts}</Text>
          </View>
        )}

        {/* Close button */}
        <Pressable style={viewerStyles.closeBtn} onPress={onClose} hitSlop={12}>
          <View style={viewerStyles.closePill}>
            <Icon name="close" size={18} color="#fff" />
          </View>
        </Pressable>

        {/* Image carousel */}
        <FlatList
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onMomentumScrollEnd={e => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / width);
            setCurrent(idx);
          }}
          renderItem={({ item }) => (
            <View style={{ width, height: imageAreaH, justifyContent: 'center', alignItems: 'center' }}>
              <Image
                source={{ uri: item }}
                style={{ width, height: imageAreaH }}
                resizeMode="contain"
              />
            </View>
          )}
          style={{ flexGrow: 0 }}
        />

        {/* Footer: dots + caption */}
        <View style={viewerStyles.footer}>
          {images.length > 1 && (
            <View style={viewerStyles.dots}>
              {images.map((_, i) => (
                <View
                  key={i}
                  style={[viewerStyles.dot, i === current && viewerStyles.dotActive]}
                />
              ))}
            </View>
          )}
          {!!caption && (
            <Text style={viewerStyles.caption} numberOfLines={4}>{caption}</Text>
          )}
          <Text style={viewerStyles.swipeHint}>Swipe down to close</Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

const viewerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
  },
  dragHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginBottom: 12,
  },
  postPill: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 44,
    left: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  postPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    right: 20,
    zIndex: 10,
  },
  closePill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 8,
  },
  footer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    gap: 12,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 18,
    borderRadius: 3,
  },
  caption: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  swipeHint: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 'auto',
  },
});

function ProfilePostsGrid({ companionId }: { companionId: string }) {
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { cellSize, onGridLayout } = useGridCellSize();
  const { getCompanion } = useCompanions();
  const companion = getCompanion(companionId);
  const tint = companion?.tint ?? colors.primary;
  const dbPosts = usePostsByCompanion(companionId);
  const { updates, gallery } = useMemo(() => splitCompanionPosts(dbPosts), [dbPosts]);
  const [tab, setTab] = useState<CompanionPostsTab>('updates');
  const [viewer, setViewer] = useState<PostViewerState | null>(null);

  const handleCellPress = useCallback((post: Post) => {
    if (!post.mediaUrls?.length) return;
    const postIndex = gallery.findIndex(p => p.id === post.id);
    setViewer({
      images: post.mediaUrls,
      caption: post.text,
      postIndex: postIndex >= 0 ? postIndex : 0,
      totalPosts: gallery.length,
    });
  }, [gallery]);

  return (
    <View style={styles.postsSection} onLayout={e => onGridLayout(e.nativeEvent.layout.width)}>
      <CompanionPostsTabBar
        tab={tab}
        onChange={setTab}
        updateCount={updates.length}
        galleryCount={gallery.length}
        windowWidth={windowWidth}
        colors={colors}
      />

      {tab === 'updates' ? (
        <CompanionUpdatesList posts={updates} tint={tint} colors={colors} />
      ) : gallery.length === 0 ? (
        <View style={styles.emptyPosts}>
          <Icon name="grid" size={28} color={colors.border} />
          <Text style={[styles.emptyPostsText, { color: colors.textTertiary }]}>No photos yet</Text>
        </View>
      ) : cellSize > 0 ? (
        <View style={[styles.photoGrid, { gap: GRID_GAP }]}>
          {gallery.map(post => {
            const imageUrl = post.mediaUrls?.[0];
            if (!imageUrl) return null;
            return (
              <Pressable
                key={post.id}
                onPress={() => handleCellPress(post)}
                style={({ pressed }) => [
                  styles.postGridCell,
                  { width: cellSize, height: cellSize, backgroundColor: tint + '18', borderRadius: radius.sm, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Image
                  source={{ uri: imageUrl }}
                  style={{ width: cellSize, height: cellSize, borderRadius: radius.sm }}
                  resizeMode="cover"
                />
                {(post.mediaUrls?.length ?? 0) > 1 && (
                  <View style={styles.multiImageBadge}>
                    <Icon name="grid" size={10} color="#fff" />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {viewer && (
        <PostImageViewer
          {...viewer}
          onClose={() => setViewer(null)}
        />
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
  const { companion, loading, failed } = useResolvedCompanion(companionId);
  const {
    burstKey, giving, ownPet, canGiveTreat, treatLabel, handleGiveTreat,
  } = useCompanionTreatActions(companion, onToast);
  const liveStats = useCompanionLiveStats(companionId, ownPet);

  useEffect(() => {
    if (visible) liveStats.refreshCounts();
  }, [visible, companionId, liveStats.refreshCounts]);

  const {
    modeSheetOpen,
    setModeSheetOpen,
    promptAddPost,
    openWithMode,
  } = useCompanionAddPost(companion);

  const handleAddPost = useCallback(() => {
    promptAddPost();
  }, [promptAddPost]);

  if (!visible) return null;

  if (loading || !companion) {
    return (
      <Sheet visible onClose={onClose} backgroundColor={colors.surface}>
        <View style={[styles.sheetBody, styles.sheetLoading]}>
          {failed ? (
            <Text style={[styles.bio, { color: colors.textSecondary }]}>
              Could not load this companion profile.
            </Text>
          ) : (
            <ActivityIndicator color={colors.primary} />
          )}
        </View>
      </Sheet>
    );
  }

  return (
    <>
      <Sheet visible={visible} onClose={onClose} backgroundColor={colors.surface}>
        <View style={styles.sheetBody}>
          <ProfileIdentity
            companion={companion}
            giftBurstKey={burstKey}
            onAvatarPress={onViewProfile}
            onOwnerPress={onOwnerPress}
          />
          <Text style={[styles.bio, { color: colors.textSecondary }]}>{companion.about}</Text>
          <StatsGrid companion={companion} liveStats={liveStats} />
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
      <CompanionAddPostSheet
        visible={modeSheetOpen}
        companionName={companion.name}
        onClose={() => setModeSheetOpen(false)}
        onSelectMode={openWithMode}
      />
    </>
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
  const { updateCompanionAvatar } = useCompanions();
  const { pickImage, takePhoto } = useMediaPicker();
  const { companion, loading, failed } = useResolvedCompanion(companionId);
  const {
    burstKey, giving, ownPet, canGiveTreat, treatLabel, handleGiveTreat,
  } = useCompanionTreatActions(companion, onToast);
  const liveStats = useCompanionLiveStats(companionId, ownPet);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (visible) liveStats.refreshCounts();
  }, [visible, companionId, liveStats.refreshCounts]);

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
    void uploadCompanionPhoto('library');
  }, [uploadCompanionPhoto]);

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

  const {
    modeSheetOpen,
    setModeSheetOpen,
    promptAddPost,
    openWithMode,
  } = useCompanionAddPost(companion);

  const handleAddPost = useCallback(() => {
    promptAddPost();
  }, [promptAddPost]);

  if (!visible) return null;

  if (loading || !companion) {
    return (
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.fullOverlay,
          { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        {failed ? (
          <Text style={[styles.bio, { color: colors.textSecondary }]}>
            Could not load this companion profile.
          </Text>
        ) : (
          <ActivityIndicator color={colors.primary} size="large" />
        )}
      </Animated.View>
    );
  }

  return (
    <>
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

        {/* Avatar/identity lives outside the ScrollView so taps register reliably */}
        <View style={[styles.fullIdentityHeader, { paddingHorizontal: 16, paddingTop: 8 }]}>
          <ProfileIdentity
            companion={companion}
            giftBurstKey={burstKey}
            spacious
            onOwnerPress={onOwnerPress}
            onAvatarPress={ownPet ? openAvatarPicker : undefined}
            avatarEditable={ownPet}
            avatarUploading={avatarUploading}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.fullScroll}
          showsVerticalScrollIndicator={false}
        >
          <StatsGrid companion={companion} liveStats={liveStats} />
          <MoodLine companion={companion} />
          <ActionButtons
            large
            following={liveStats.following}
            onFollow={ownPet ? undefined : async () => {
              const wasFollowing = liveStats.following;
              await liveStats.toggleFollow();
              onToast({
                msg: wasFollowing ? `Unfollowed ${companion.name}` : `Now following ${companion.name}!`,
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
    <CompanionAddPostSheet
      visible={modeSheetOpen}
      companionName={companion.name}
      onClose={() => setModeSheetOpen(false)}
      onSelectMode={openWithMode}
    />
    </>
  );
}

const styles = StyleSheet.create({
  sheetBody: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 28,
    gap: 14,
  },
  sheetLoading: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
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
  avatarUploadingOverlay: {
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
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
  fullIdentityHeader: { paddingBottom: 8 },
  fullScroll: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 44, gap: 14 },
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
  postsTabRow: {
    flexDirection: 'row',
    width: '100%',
  },
  postsTabCell: {
    flex: 1,
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
    justifyContent: 'center',
    gap: 6,
    paddingTop: 12,
    paddingBottom: 12 + POSTS_TAB_INDICATOR_H,
    paddingHorizontal: 8,
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
  multiImageBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 4,
    padding: 3,
  },
  emptyPosts: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyPostsText: {
    fontSize: 13,
    fontWeight: '500',
  },
  addPostModeSheet: {
    paddingHorizontal: 18,
    paddingBottom: 8,
    gap: 10,
  },
  addPostModeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  addPostModeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  addPostModeCopy: {
    flex: 1,
    gap: 3,
  },
  addPostModeTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  addPostModeBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  updatesList: {
    gap: 10,
    width: '100%',
  },
  updateCard: {
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    width: '100%',
  },
  updateCardText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    textAlign: 'left',
  },
  updateCardImage: {
    width: '100%',
    height: 180,
    borderRadius: radius.sm,
  },
  updateCardTime: {
    fontSize: 11.5,
    fontWeight: '500',
  },
});
