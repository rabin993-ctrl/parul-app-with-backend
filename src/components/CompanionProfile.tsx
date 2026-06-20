import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, useWindowDimensions,
  Animated, Platform, ActivityIndicator, Image, Modal, FlatList, PanResponder,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';
import { CompanionAvatar } from './ui/Avatar';
import { Button } from './ui/Button';
import { AppCenteredHeader, AppHeaderIconButton, APP_CENTERED_HEADER_SIDE, PROFILE_HANDLE_HEADER_WRAP } from './ui/AppSubHeader';
import { Sheet } from './ui/Sheet';
import { Icon } from './icons/Icon';
import { ToastData } from './ui/Toast';
import { useTreatWallet } from '../context/TreatWalletContext';
import { useFeedPosts } from '../context/FeedPostContext';
import { PROFILE_TAB_ICON_SIZE } from './profile/ProfileChrome';
import type { Companion, Post } from '../data/mockData';
import { useCompanions } from '../context/CompanionContext';
import { useResolvedCompanion } from '../hooks/useResolvedCompanion';
import { useAuth } from '../context/AuthContext';
import { useMediaPicker } from '../hooks/useMediaPicker';
import { getCachedProfile } from '../hooks/useUserProfile';
import { usePostsByCompanion } from '../hooks/usePostsByCompanion';
import { splitCompanionPosts, type CompanionContentStyle } from '../utils/companionPostContent';
import { CompanionProfileHero } from './companion/CompanionProfileHero';
import { CompanionStatsBar } from './companion/CompanionStatsBar';
import { CompanionOptionsSheet } from './companion/CompanionOptionsSheet';
import { CompanionProfileBioSection } from './companion/CompanionProfileBioSection';
import { CompanionProfileEditFields } from './companion/CompanionProfileEditFields';
import { useCompanionProfileEdit } from '../hooks/useCompanionProfileEdit';

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
              Photo-first moment with an optional short caption.
            </Text>
          </View>
        </Pressable>
      </View>
    </Sheet>
  );
}

function useCompanionAddPost(
  companion: Companion | null | undefined,
  onPostCreated?: () => void,
) {
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
      onSuccess: onPostCreated,
    });
  }, [companion, onPostCreated, openComposer]);

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
    { id: 'updates', icon: 'comment', label: 'Updates', count: updateCount },
    { id: 'gallery', icon: 'grid', label: 'Photos', count: galleryCount },
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
  onPress,
}: {
  post: Post;
  tint: string;
  textColor: string;
  secondaryColor: string;
  onPress?: () => void;
}) {
  const imageUrl = post.mediaUrls?.[0];
  const hasMedia = !!imageUrl;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.updateCard,
        { backgroundColor: tint + '14' },
        onPress && Platform.OS === 'web' && styles.updateCardWeb,
        pressed && onPress && { opacity: 0.82 },
      ]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={post.text ? `Update: ${post.text}` : 'Companion update'}
    >
      {post.text ? (
        <Text style={[styles.updateCardText, { color: textColor }]} numberOfLines={6}>{post.text}</Text>
      ) : null}
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.updateCardImage}
          resizeMode="cover"
        />
      ) : null}
      <View style={styles.updateCardMeta}>
        <View style={styles.updateCardMetaLeft}>
          <Icon name="paw" size={12} color={secondaryColor} sw={2} />
          <Text style={[styles.updateCardMetaText, { color: secondaryColor }]}>
            {post.paws > 0 ? `${post.paws} · ` : ''}{post.time}
          </Text>
        </View>
        {hasMedia ? (
          <Icon name="image" size={12} color={secondaryColor} sw={2} />
        ) : null}
      </View>
    </Pressable>
  );
}

function CompanionUpdatesList({
  posts,
  tint,
  colors,
  ownPet,
  onPostPress,
  onAddPost,
}: {
  posts: Post[];
  tint: string;
  colors: ReturnType<typeof useTheme>['colors'];
  ownPet?: boolean;
  onPostPress?: (post: Post) => void;
  onAddPost?: () => void;
}) {
  if (posts.length === 0) {
    return (
      <View style={styles.emptyPosts}>
        <View style={[styles.emptyUpdateSkeleton, { backgroundColor: tint + '12', borderColor: colors.border }]}>
          <View style={[styles.emptyUpdateSkeletonLine, { backgroundColor: colors.border }]} />
          <View style={[styles.emptyUpdateSkeletonLine, styles.emptyUpdateSkeletonLineShort, { backgroundColor: colors.border }]} />
          <View style={[styles.emptyUpdateSkeletonMeta, { backgroundColor: colors.border }]} />
        </View>
        <Text style={[styles.emptyPostsText, { color: colors.textTertiary }]}>
          No updates yet
        </Text>
        {ownPet && onAddPost ? (
          <Pressable
            onPress={onAddPost}
            style={({ pressed }) => [
              styles.emptyPostsAction,
              { backgroundColor: tint + '18', borderColor: tint + '35' },
              pressed && { opacity: 0.82 },
            ]}
          >
            <Icon name="plus" size={14} color={tint} sw={2.2} />
            <Text style={[styles.emptyPostsActionText, { color: tint }]}>Write an update</Text>
          </Pressable>
        ) : null}
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
          onPress={onPostPress ? () => onPostPress(post) : undefined}
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


// ── Shared profile blocks ─────────────────────────────────────────────────────

function ActionButtons({
  onFollow,
  onTreat,
  onEdit,
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
  compact = false,
}: {
  onFollow?: () => void;
  onTreat?: () => void;
  onEdit?: () => void;
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
  compact?: boolean;
}) {
  const buttonStyle = compact ? undefined : { flex: 1 as const };

  return (
    <View style={[styles.actionRow, compact && styles.actionRowCompact]}>
      {onSecondary ? (
        <Button
          variant="outline"
          size="sm"
          icon={secondaryIcon}
          style={buttonStyle}
          onPress={onSecondary}
        >
          {secondaryLabel}
        </Button>
      ) : null}
      {onEdit ? (
        <Button
          variant="outline"
          size="sm"
          icon="edit"
          style={buttonStyle}
          onPress={onEdit}
        >
          Edit
        </Button>
      ) : onFollow ? (
        <Button
          variant={following ? 'soft' : 'outline'}
          size="sm"
          icon="user"
          style={buttonStyle}
          onPress={onFollow}
        >
          {following ? 'Following' : followLabel}
        </Button>
      ) : null}
      {!hideTreat && onTreat ? (
        <Button
          variant="primary"
          size="sm"
          icon={treatIcon}
          style={buttonStyle}
          onPress={onTreat}
          disabled={treatDisabled}
          loading={treatLoading}
        >
          {treatLabel}
        </Button>
      ) : null}
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
  companionName?: string;
  time?: string;
  paws?: number;
  galleryPosts: Post[];
}

function PostImageViewer({
  images,
  caption,
  postIndex,
  totalPosts,
  companionName,
  time,
  paws,
  galleryPosts,
  onClose,
}: PostViewerState & { onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const [current, setCurrent] = useState(0);
  const [activePostIndex, setActivePostIndex] = useState(postIndex);
  const slideY = useRef(new Animated.Value(0)).current;

  const activePost = galleryPosts[activePostIndex];
  const activeImages = activePost?.mediaUrls?.length ? activePost.mediaUrls : images;
  const displayName = activePost?.companionAuthorName ?? companionName;
  const displayTime = activePost?.time ?? time;
  const displayPaws = activePost?.paws ?? paws ?? 0;
  const displayCaption = activePost?.text ?? caption;

  useEffect(() => {
    setCurrent(0);
  }, [activePostIndex]);

  const goToPost = useCallback((nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= totalPosts) return;
    setActivePostIndex(nextIndex);
  }, [totalPosts]);

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
            <Text style={viewerStyles.postPillText}>Post {activePostIndex + 1} of {totalPosts}</Text>
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
          data={activeImages}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => `${activePostIndex}-${i}`}
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

        {totalPosts > 1 ? (
          <>
            {activePostIndex > 0 ? (
              <Pressable
                style={[viewerStyles.navBtn, viewerStyles.navBtnLeft]}
                onPress={() => goToPost(activePostIndex - 1)}
                hitSlop={12}
              >
                <Icon name="chevronLeft" size={22} color="#fff" />
              </Pressable>
            ) : null}
            {activePostIndex < totalPosts - 1 ? (
              <Pressable
                style={[viewerStyles.navBtn, viewerStyles.navBtnRight]}
                onPress={() => goToPost(activePostIndex + 1)}
                hitSlop={12}
              >
                <Icon name="chevronRight" size={22} color="#fff" />
              </Pressable>
            ) : null}
          </>
        ) : null}

        {/* Footer: dots + caption + metadata */}
        <View style={viewerStyles.footer}>
          {activeImages.length > 1 && (
            <View style={viewerStyles.dots}>
              {activeImages.map((_, i) => (
                <View
                  key={i}
                  style={[viewerStyles.dot, i === current && viewerStyles.dotActive]}
                />
              ))}
            </View>
          )}
          {(displayName || displayTime) ? (
            <View style={viewerStyles.metaRow}>
              {displayName ? (
                <Text style={viewerStyles.metaName} numberOfLines={1}>{displayName}</Text>
              ) : null}
              {displayTime ? (
                <Text style={viewerStyles.metaTime}>{displayTime}</Text>
              ) : null}
            </View>
          ) : null}
          {displayPaws > 0 ? (
            <View style={viewerStyles.statsStrip}>
              <Icon name="paw" size={12} color="rgba(255,255,255,0.7)" sw={2} />
              <Text style={viewerStyles.statsText}>{displayPaws}</Text>
            </View>
          ) : null}
          {!!displayCaption && (
            <Text style={viewerStyles.caption} numberOfLines={4}>{displayCaption}</Text>
          )}
          {totalPosts > 1 ? (
            <Text style={viewerStyles.swipeHint}>Swipe between posts · swipe down to close</Text>
          ) : (
            <Text style={viewerStyles.swipeHint}>Swipe down to close</Text>
          )}
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  metaTime: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '500',
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statsText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  navBtn: {
    position: 'absolute',
    top: '42%',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnLeft: { left: 8 },
  navBtnRight: { right: 8 },
});

function ProfilePostsGrid({
  companionId,
  ownPet,
  onPostPress,
  onAddPost,
  onAddGalleryPhoto,
  postsRefreshToken,
}: {
  companionId: string;
  ownPet?: boolean;
  onPostPress?: (post: Post) => void;
  onAddPost?: () => void;
  onAddGalleryPhoto?: () => void;
  postsRefreshToken?: number;
}) {
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { cellSize, onGridLayout } = useGridCellSize();
  const { getCompanion } = useCompanions();
  const companion = getCompanion(companionId);
  const tint = companion?.tint ?? colors.primary;
  const { posts: dbPosts, refresh } = usePostsByCompanion(companionId);
  const { updates, gallery } = useMemo(() => splitCompanionPosts(dbPosts), [dbPosts]);
  const [tab, setTab] = useState<CompanionPostsTab>('updates');
  const [viewer, setViewer] = useState<PostViewerState | null>(null);

  useEffect(() => {
    if (!postsRefreshToken) return;
    refresh();
    const timer = setTimeout(refresh, 2500);
    return () => clearTimeout(timer);
  }, [postsRefreshToken, refresh]);

  const handleCellPress = useCallback((post: Post) => {
    if (!post.mediaUrls?.length) return;
    const postIndex = gallery.findIndex(p => p.id === post.id);
    setViewer({
      images: post.mediaUrls,
      caption: post.text,
      postIndex: postIndex >= 0 ? postIndex : 0,
      totalPosts: gallery.length,
      companionName: companion?.name,
      time: post.time,
      paws: post.paws,
      galleryPosts: gallery,
    });
  }, [companion?.name, gallery]);

  return (
    <View
      style={styles.postsSection}
      onLayout={e => onGridLayout(e.nativeEvent.layout.width)}
    >
      <CompanionPostsTabBar
        tab={tab}
        onChange={setTab}
        updateCount={updates.length}
        galleryCount={gallery.length}
        windowWidth={windowWidth}
        colors={colors}
      />

      {tab === 'updates' ? (
        <CompanionUpdatesList
          posts={updates}
          tint={tint}
          colors={colors}
          ownPet={ownPet}
          onPostPress={onPostPress}
          onAddPost={onAddPost}
        />
      ) : gallery.length === 0 ? (
        <View style={styles.emptyPosts}>
          <View style={styles.emptyPhotoGridPreview}>
            {[0, 1, 2].map(i => (
              <View
                key={i}
                style={[styles.emptyPhotoGridCell, { backgroundColor: colors.border + '55' }]}
              />
            ))}
          </View>
          <Text style={[styles.emptyPostsText, { color: colors.textTertiary }]}>
            No photos yet
          </Text>
          {ownPet && onAddGalleryPhoto ? (
            <Pressable
              onPress={onAddGalleryPhoto}
              style={({ pressed }) => [
                styles.emptyPostsAction,
                { backgroundColor: tint + '18', borderColor: tint + '35' },
                pressed && { opacity: 0.82 },
              ]}
            >
              <Icon name="plus" size={14} color={tint} sw={2.2} />
              <Text style={[styles.emptyPostsActionText, { color: tint }]}>Add a photo</Text>
            </Pressable>
          ) : null}
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
                  {
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: tint + '18',
                    borderRadius: radius.sm,
                    opacity: pressed ? 0.75 : 1,
                  },
                  Platform.OS === 'web' && styles.postGridCellWeb,
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
          <CompanionProfileHero
            companion={companion}
            giftBurstKey={burstKey}
            compact
            onAvatarPress={onViewProfile}
            onOwnerPress={onOwnerPress}
          />
          <CompanionStatsBar
            followers={liveStats.followerCount ?? companion.followers ?? 0}
            pawprints={liveStats.pawprints}
            treats={liveStats.treatCount}
          />
          <ActionButtons
            compact
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
  onOpenPostDetail?: (postId: string, companionId: string) => void;
}

export function CompanionFullProfile({
  companionId,
  visible,
  onClose,
  onSwitchCompanion,
  onOwnerPress,
  onToast,
  onOpenPostDetail,
}: CompanionFullProfileProps) {
  const { colors } = useTheme();
  const { updateCompanionAvatar, removeCompanion } = useCompanions();
  const { removePostsForCompanion } = useFeedPosts();
  const { pickImage, takePhoto } = useMediaPicker();
  const { companion, loading, failed } = useResolvedCompanion(companionId);
  const {
    burstKey, giving, ownPet, canGiveTreat, treatLabel, handleGiveTreat,
  } = useCompanionTreatActions(companion, onToast);
  const liveStats = useCompanionLiveStats(companionId, ownPet);
  const {
    draft, patchDraft, isDirty, saving, save, reset,
  } = useCompanionProfileEdit(companion);
  const [editing, setEditing] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [postsRefreshToken, setPostsRefreshToken] = useState(0);

  useEffect(() => {
    setEditing(false);
  }, [companionId, visible]);

  const handleCancelEdit = useCallback(() => {
    reset();
    setEditing(false);
  }, [reset]);

  const handleSaveEdit = useCallback(async () => {
    if (!isDirty) {
      setEditing(false);
      return;
    }
    const ok = await save();
    if (ok) {
      setEditing(false);
      onToast({ msg: 'Profile updated', icon: 'check', tone: 'success' });
      return;
    }
    onToast({ msg: 'Could not save profile', icon: 'close', tone: 'danger' });
  }, [isDirty, onToast, save]);

  const displayCompanion = useMemo(() => {
    if (!companion) return companion;
    if (!editing) return companion;
    return {
      ...companion,
      about: draft.about,
      gender: draft.gender.trim() || '—',
    };
  }, [companion, draft.about, draft.gender, editing]);

  const handlePostCreated = useCallback(() => {
    setPostsRefreshToken(t => t + 1);
  }, []);

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
  } = useCompanionAddPost(companion, handlePostCreated);

  const handleAddPost = useCallback(() => {
    promptAddPost();
  }, [promptAddPost]);

  const handleAddGalleryPhoto = useCallback(() => {
    openWithMode('gallery');
  }, [openWithMode]);

  const handlePostPress = useCallback((post: Post) => {
    if (onOpenPostDetail) {
      onOpenPostDetail(post.id, companionId);
    }
  }, [companionId, onOpenPostDetail]);

  const handleRemoveCompanion = useCallback(async () => {
    if (!companion) return;
    const removed = await removeCompanion(companion.id);
    if (removed) {
      removePostsForCompanion(companion.id);
      onToast({ msg: `${companion.name} removed`, icon: 'check', tone: 'success' });
      onClose();
    } else {
      onToast({ msg: 'Could not remove companion', icon: 'close', tone: 'danger' });
    }
  }, [companion, onClose, onToast, removeCompanion, removePostsForCompanion]);

  const handleOptionsFollow = useCallback(async () => {
    if (!companion) return;
    const wasFollowing = liveStats.following;
    await liveStats.toggleFollow();
    onToast({
      msg: wasFollowing ? `Unfollowed ${companion.name}` : `Now following ${companion.name}!`,
      icon: 'user',
      tone: 'primary',
    });
  }, [companion, liveStats, onToast]);

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
        <View style={PROFILE_HANDLE_HEADER_WRAP}>
          <AppCenteredHeader
            title={`@${companion.handle ?? companion.id}`}
            onBack={editing ? handleCancelEdit : onClose}
            backAccessibilityLabel={editing ? 'Cancel editing' : 'Back'}
            compact
            trailing={editing ? (
            <Pressable
              onPress={() => { void handleSaveEdit(); }}
              disabled={saving}
              style={({ pressed }) => [
                styles.headerTextBtn,
                pressed && styles.headerTextBtnPressed,
                saving && styles.headerTextBtnDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Save profile"
            >
              <Text style={[
                styles.headerTextBtnLabel,
                { color: saving ? colors.textTertiary : colors.primary },
              ]}>
                {saving ? 'Saving…' : 'Save'}
              </Text>
            </Pressable>
          ) : (
            <AppHeaderIconButton
              name="more"
              onPress={() => setOptionsOpen(true)}
              accessibilityLabel="More options"
            />
          )}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.fullScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heroStatsBlock}>
            <CompanionProfileHero
              companion={displayCompanion ?? companion}
              giftBurstKey={burstKey}
              onOwnerPress={onOwnerPress}
              onAvatarPress={ownPet ? openAvatarPicker : undefined}
              onEditPress={ownPet ? () => setEditing(true) : undefined}
              ownPet={ownPet}
              editing={editing}
              showBioInHero={false}
              avatarEditable={ownPet}
              avatarUploading={avatarUploading}
            />
            <CompanionStatsBar
              followers={liveStats.followerCount ?? companion.followers ?? 0}
              pawprints={liveStats.pawprints}
              treats={liveStats.treatCount}
              style={styles.fullProfileStatsBar}
            />
          </View>
          <CompanionProfileBioSection
            companionName={companion.name}
            bio={editing ? draft.about : (displayCompanion ?? companion).about}
            editing={editing}
            onBioChange={value => patchDraft({ about: value })}
            vaccinated={companion.vaccinated}
            neutered={companion.neutered}
            gender={editing ? draft.gender : (displayCompanion ?? companion).gender}
          />
          {!editing && !ownPet ? (
            <ActionButtons
              compact
              following={liveStats.following}
              onFollow={async () => {
                const wasFollowing = liveStats.following;
                await liveStats.toggleFollow();
                onToast({
                  msg: wasFollowing ? `Unfollowed ${companion.name}` : `Now following ${companion.name}!`,
                  icon: 'user',
                  tone: 'primary',
                });
              }}
              onTreat={handleGiveTreat}
              treatLabel={treatLabel}
              treatIcon="paw"
              treatDisabled={!canGiveTreat}
              treatLoading={giving}
            />
          ) : null}
          {editing ? (
            <CompanionProfileEditFields
              draft={draft}
              onChange={patchDraft}
              onToggleHealth={key => patchDraft({ [key]: !draft[key] })}
            />
          ) : null}
          <View style={styles.profileLower}>
            <SiblingsRow companion={companion} onOpen={id => onSwitchCompanion?.(id)} />
            <ProfilePostsGrid
              companionId={companionId}
              ownPet={ownPet}
              onPostPress={handlePostPress}
              onAddPost={ownPet ? handleAddPost : undefined}
              onAddGalleryPhoto={ownPet ? handleAddGalleryPhoto : undefined}
              postsRefreshToken={postsRefreshToken}
            />
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
    <CompanionOptionsSheet
      visible={optionsOpen}
      companion={companion}
      ownPet={ownPet}
      following={liveStats.following}
      onClose={() => setOptionsOpen(false)}
      onEdit={() => {
        setOptionsOpen(false);
        setEditing(true);
      }}
      onRemove={() => { void handleRemoveCompanion(); }}
      onToggleFollow={() => { void handleOptionsFollow(); }}
      onReport={() => onToast({ msg: 'Report submitted — thanks for helping keep Parul safe', icon: 'flag', tone: 'primary' })}
      onShareSuccess={() => onToast({ msg: 'Profile link copied', icon: 'check', tone: 'success' })}
      onShareError={() => onToast({ msg: 'Could not share profile link', icon: 'close', tone: 'danger' })}
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
  bio: { fontSize: 14, lineHeight: 21 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionRowCompact: { alignSelf: 'flex-start' },
  fullOverlay: { zIndex: 99 },
  fullRoot: { flex: 1 },
  fullScroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 44,
    gap: 16,
  },
  heroStatsBlock: {
    gap: 0,
  },
  fullProfileStatsBar: {
    marginTop: 8,
    paddingTop: 4,
  },
  headerTextBtn: {
    minWidth: APP_CENTERED_HEADER_SIDE,
    height: 46,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 4,
  },
  headerTextBtnPressed: { opacity: 0.65 },
  headerTextBtnDisabled: { opacity: 0.45 },
  headerTextBtnLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  profileLower: { gap: 8, marginTop: 0 },
  siblingsSection: { gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  siblingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  siblingItem: { alignItems: 'center', gap: 4, width: 56 },
  siblingName: { fontSize: 11.5, fontWeight: '600', textAlign: 'center' },
  postsSection: {
    marginTop: 0,
  },
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
    paddingTop: 6,
    paddingBottom: 10 + POSTS_TAB_INDICATOR_H,
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
  postGridCellWeb: Platform.select({
    web: { cursor: 'pointer' },
    default: {},
  }),
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
    paddingVertical: 28,
    gap: 8,
  },
  emptyUpdateSkeleton: {
    width: '100%',
    maxWidth: 280,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
    marginBottom: 4,
  },
  emptyUpdateSkeletonLine: {
    height: 10,
    borderRadius: 5,
    width: '100%',
  },
  emptyUpdateSkeletonLineShort: {
    width: '62%',
  },
  emptyUpdateSkeletonMeta: {
    height: 8,
    borderRadius: 4,
    width: '28%',
    marginTop: 4,
  },
  emptyPhotoGridPreview: {
    flexDirection: 'row',
    gap: GRID_GAP,
    marginBottom: 4,
  },
  emptyPhotoGridCell: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
  },
  emptyPostsText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyPostsAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyPostsActionText: {
    fontSize: 13,
    fontWeight: '700',
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
  updateCardWeb: Platform.select({
    web: { cursor: 'pointer' },
    default: {},
  }),
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
  updateCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  updateCardMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  updateCardMetaText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
});
