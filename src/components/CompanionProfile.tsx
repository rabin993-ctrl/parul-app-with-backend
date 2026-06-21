import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, useWindowDimensions,
  Animated, Platform, ActivityIndicator,
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
import { filterCompanionAuthoredPosts } from '../utils/postCompanion';
import { CompanionProfileHero } from './companion/CompanionProfileHero';
import { CompanionStatsBar } from './companion/CompanionStatsBar';
import { CompanionOptionsSheet } from './companion/CompanionOptionsSheet';
import { CompanionProfileBioSection } from './companion/CompanionProfileBioSection';
import { CompanionProfileEditFields } from './companion/CompanionProfileEditFields';
import { useCompanionProfileEdit } from '../hooks/useCompanionProfileEdit';
import { FeedPostItem } from './feed/FeedPostItem';
import { confirmDeletePost } from './feed/PostOwnerMenu';
import { PhotoSlot } from './ui/PhotoSlot';
import { getPostImageUrls } from '../utils/postMedia';
import { ForwardSheet, type ForwardDest } from './ForwardSheet';
import { useCurrentUserProfile } from '../context/CurrentUserProfileContext';
import { usePawCircles } from '../context/PawCircleContext';
import { useCommunityGroups } from '../context/CommunityGroupsContext';

const GRID_GAP = 2;
const GRID_COLS = 3;
const PROFILE_HORIZONTAL_PADDING = 32;
const POSTS_TAB_TRACK_H = 1;
const POSTS_TAB_INDICATOR_H = 3;
const PROFILE_SCROLL_INSET = 16;

type CompanionProfileTab = 'gallery' | 'posts';

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

function CompanionProfileContentTabs({
  tab,
  onChange,
  postsCount,
  galleryCount,
  windowWidth,
  colors,
}: {
  tab: CompanionProfileTab;
  onChange: (tab: CompanionProfileTab) => void;
  postsCount: number;
  galleryCount: number;
  windowWidth: number;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const tabs: { id: CompanionProfileTab; icon: string; label: string; count: number }[] = [
    { id: 'gallery', icon: 'grid', label: 'Gallery', count: galleryCount },
    { id: 'posts', icon: 'comment', label: 'Posts', count: postsCount },
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

function CompanionPostsFeedList({
  posts,
  tint,
  colors,
  ownPet,
  onAddPost,
  onPostPress,
  onPostDeleted,
  onToast,
}: {
  posts: Post[];
  tint: string;
  colors: ReturnType<typeof useTheme>['colors'];
  ownPet?: boolean;
  onAddPost?: () => void;
  onPostPress?: (post: Post) => void;
  onPostDeleted?: () => void;
  onToast: (t: ToastData) => void;
}) {
  const { user } = useAuth();
  const { me } = useCurrentUserProfile();
  const {
    togglePaw,
    toggleSaved,
    openComposerForEdit,
    deletePost,
    persistForward,
    setPosts,
  } = useFeedPosts();
  const { createdCircles, joinedCircles } = usePawCircles();
  const { joinedCommunities } = useCommunityGroups();
  const [forwardPost, setForwardPost] = useState<Post | null>(null);
  const currentUserId = me.id || user?.id;

  const handleSave = useCallback((id: string) => {
    const nowSaved = toggleSaved(id);
    onToast({
      msg: nowSaved ? 'Saved to your collection' : 'Removed from saved',
      icon: 'bookmark',
      tone: 'primary',
    });
  }, [onToast, toggleSaved]);

  const completeForward = useCallback((dests: ForwardDest[], note?: string) => {
    if (!forwardPost || dests.length === 0) return;
    setPosts(ps => ps.map(p => (
      p.id === forwardPost.id ? { ...p, forwards: p.forwards + dests.length } : p
    )));
    persistForward(forwardPost.id, dests, forwardPost.text, forwardPost.label, note);
    setForwardPost(null);
    const label = dests.map(d => d.label).join(', ');
    onToast({ msg: `Shared to ${label}`, icon: 'forward', tone: 'success' });
  }, [forwardPost, onToast, persistForward, setPosts]);

  if (posts.length === 0) {
    return (
      <View style={styles.emptyPosts}>
        <View style={[styles.emptyUpdateSkeleton, { backgroundColor: tint + '12', borderColor: colors.border }]}>
          <View style={[styles.emptyUpdateSkeletonLine, { backgroundColor: colors.border }]} />
          <View style={[styles.emptyUpdateSkeletonLine, styles.emptyUpdateSkeletonLineShort, { backgroundColor: colors.border }]} />
          <View style={[styles.emptyUpdateSkeletonMeta, { backgroundColor: colors.border }]} />
        </View>
        <Text style={[styles.emptyPostsText, { color: colors.textTertiary }]}>
          No posts yet
        </Text>
        {ownPet && onAddPost ? (
          <Pressable
            onPress={onAddPost}
            style={({ pressed }) => [
              styles.emptyPostsAction,
              { backgroundColor: tint + '18', borderColor: tint + '35' },
              pressed && { opacity: 0.82 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Write a post"
          >
            <Icon name="plus" size={14} color={tint} sw={2.2} />
            <Text style={[styles.emptyPostsActionText, { color: tint }]}>Write a post</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <>
      <View style={styles.postsFeedList}>
        {ownPet && onAddPost ? (
          <Pressable
            onPress={onAddPost}
            style={({ pressed }) => [
              styles.postsFeedAddRow,
              { backgroundColor: tint + '12', borderColor: tint + '30' },
              pressed && { opacity: 0.82 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Write a post"
          >
            <Icon name="plus" size={14} color={tint} sw={2.2} />
            <Text style={[styles.postsFeedAddRowText, { color: tint }]}>Write a post</Text>
          </Pressable>
        ) : null}
        {posts.map((post, index) => (
          <View key={post.id}>
            {index > 0 ? (
              <View style={[styles.postDivider, { backgroundColor: colors.border }]} />
            ) : null}
            <FeedPostItem
              post={post}
              alertPadding
              compact
              onPaw={() => togglePaw(post.id)}
              onSave={() => handleSave(post.id)}
              onComments={() => onPostPress?.(post)}
              onForward={() => setForwardPost(post)}
              onEdit={() => openComposerForEdit(post)}
              onDelete={() => {
                deletePost(post.id);
                onPostDeleted?.();
                onToast({ msg: 'Post deleted', icon: 'check', tone: 'success' });
              }}
              onToast={onToast}
              currentUserId={currentUserId}
            />
          </View>
        ))}
      </View>
      {forwardPost ? (
        <ForwardSheet
          visible
          createdCircles={createdCircles}
          joinedCircles={joinedCircles}
          joinedCommunities={joinedCommunities}
          onClose={() => setForwardPost(null)}
          onSelect={completeForward}
        />
      ) : null}
    </>
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


function mergeCompanionPostsWithFeed(dbPosts: Post[], feedPosts: Post[], companionId: string): Post[] {
  const feedById = new Map(
    filterCompanionAuthoredPosts(feedPosts, companionId).map(p => [p.id, p]),
  );
  const merged = dbPosts.map(db => {
    const feed = feedById.get(db.id);
    if (!feed) return db;
    feedById.delete(db.id);
    const dbMediaCount = db.mediaUrls?.length ?? 0;
    const feedMediaCount = feed.mediaUrls?.length ?? 0;
    const preferFeedMedia = feedMediaCount > 0 && (
      feedMediaCount >= dbMediaCount || (feed.images ?? 0) > (db.images ?? 0)
    );
    if (!preferFeedMedia) return db;
    return {
      ...db,
      images: Math.max(db.images ?? 0, feed.images ?? 0),
      mediaUrls: feed.mediaUrls ?? db.mediaUrls,
      mediaFallbackUrls: feed.mediaFallbackUrls ?? db.mediaFallbackUrls,
    };
  });
  for (const feed of feedById.values()) merged.unshift(feed);
  return merged;
}

function ProfilePostsGrid({
  companionId,
  ownPet,
  onPostPress,
  onAddPost,
  onAddGalleryPhoto,
  onToast,
  postsRefreshToken,
}: {
  companionId: string;
  ownPet?: boolean;
  onPostPress?: (post: Post) => void;
  onAddPost?: () => void;
  onAddGalleryPhoto?: () => void;
  onToast: (t: ToastData) => void;
  postsRefreshToken?: number;
}) {
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { cellSize, onGridLayout } = useGridCellSize();
  const { getCompanion } = useCompanions();
  const companion = getCompanion(companionId);
  const tint = companion?.tint ?? colors.primary;
  const { posts: dbPosts, refresh } = usePostsByCompanion(companionId);
  const { deletePost, posts: feedPosts } = useFeedPosts();
  const companionPosts = useMemo(
    () => filterCompanionAuthoredPosts(
      mergeCompanionPostsWithFeed(dbPosts, feedPosts, companionId),
      companionId,
    ),
    [companionId, dbPosts, feedPosts],
  );
  const { updates, gallery } = useMemo(() => splitCompanionPosts(companionPosts), [companionPosts]);
  const [tab, setTab] = useState<CompanionProfileTab>('gallery');

  useEffect(() => {
    if (!postsRefreshToken) return;
    refresh();
    const timer = setTimeout(refresh, 2500);
    return () => clearTimeout(timer);
  }, [postsRefreshToken, refresh]);

  const handleGalleryCellPress = useCallback((post: Post) => {
    onPostPress?.(post);
  }, [onPostPress]);

  const handleDeleteGalleryPost = useCallback((post: Post) => {
    confirmDeletePost(() => {
      deletePost(post.id);
      refresh();
      onToast({ msg: 'Photo deleted', icon: 'check', tone: 'success' });
    }, {
      title: 'Delete photo?',
      message: 'This cannot be undone.',
      webMessage: 'Delete this photo? This cannot be undone.',
    });
  }, [deletePost, onToast, refresh]);

  const renderGalleryAddCell = () => {
    if (!ownPet || !onAddGalleryPhoto || cellSize <= 0) return null;
    return (
      <Pressable
        onPress={onAddGalleryPhoto}
        style={({ pressed }) => [
          styles.postGridCell,
          styles.postGridAddCell,
          {
            width: cellSize,
            height: cellSize,
            borderColor: tint + '40',
            backgroundColor: tint + '10',
            opacity: pressed ? 0.75 : 1,
          },
          Platform.OS === 'web' && styles.postGridCellWeb,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Add post"
      >
        <Icon name="plus" size={18} color={tint} sw={2.2} />
        <Text style={[styles.postGridAddLabel, { color: tint }]}>Add post</Text>
      </Pressable>
    );
  };

  return (
    <View
      style={styles.postsSection}
      onLayout={e => onGridLayout(e.nativeEvent.layout.width)}
    >
      <CompanionProfileContentTabs
        tab={tab}
        onChange={setTab}
        postsCount={updates.length}
        galleryCount={gallery.length}
        windowWidth={windowWidth}
        colors={colors}
      />

      {tab === 'posts' ? (
        <CompanionPostsFeedList
          posts={updates}
          tint={tint}
          colors={colors}
          ownPet={ownPet}
          onPostPress={onPostPress}
          onAddPost={onAddPost}
          onPostDeleted={refresh}
          onToast={onToast}
        />
      ) : gallery.length === 0 && !ownPet ? (
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
        </View>
      ) : gallery.length === 0 && ownPet ? (
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
          {onAddGalleryPhoto ? (
            <Pressable
              onPress={onAddGalleryPhoto}
              style={({ pressed }) => [
                styles.emptyPostsAction,
                { backgroundColor: tint + '18', borderColor: tint + '35' },
                pressed && { opacity: 0.82 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Add post"
            >
              <Icon name="plus" size={14} color={tint} sw={2.2} />
              <Text style={[styles.emptyPostsActionText, { color: tint }]}>Add post</Text>
            </Pressable>
          ) : null}
        </View>
      ) : cellSize > 0 ? (
        <View style={[styles.photoGrid, { gap: GRID_GAP }]}>
          {renderGalleryAddCell()}
          {gallery.map(post => {
            const imageUrls = getPostImageUrls(post);
            if (imageUrls.length === 0) return null;
            return (
              <View
                key={post.id}
                style={[
                  styles.postGridCell,
                  styles.postGridPhotoCell,
                  {
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: tint + '18',
                    borderRadius: radius.sm,
                  },
                ]}
              >
                <PhotoSlot
                  height={cellSize}
                  uri={post.mediaUrls?.[0]}
                  fallbackUri={post.mediaFallbackUrls?.[0]}
                  imageKey={post.id}
                  imageIndex={0}
                  borderRadius={radius.sm}
                  filled
                  label=""
                  onPress={() => handleGalleryCellPress(post)}
                  style={{ width: cellSize, height: cellSize }}
                />
                {(post.mediaUrls?.length ?? post.images) > 1 && (
                  <View style={styles.multiImageBadge}>
                    <Icon name="grid" size={10} color="#fff" />
                  </View>
                )}
                {ownPet ? (
                  <Pressable
                    onPress={e => {
                      e.stopPropagation?.();
                      handleDeleteGalleryPost(post);
                    }}
                    style={styles.galleryCellDeleteBtn}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Delete photo"
                  >
                    <View style={styles.galleryCellDeleteDot}>
                      <Icon name="close" size={12} color="#fff" sw={2.5} />
                    </View>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
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

  const { openWithMode } = useCompanionAddPost(companion, handlePostCreated);

  const handleAddUpdatePost = useCallback(() => {
    openWithMode('update');
  }, [openWithMode]);

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
              onAddPost={ownPet ? handleAddUpdatePost : undefined}
              onAddGalleryPhoto={ownPet ? handleAddGalleryPhoto : undefined}
              onToast={onToast}
              postsRefreshToken={postsRefreshToken}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
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
  postGridPhotoCell: {
    padding: 0,
    justifyContent: 'center',
  },
  postGridAddCell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 4,
  },
  postGridAddLabel: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
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
    bottom: 5,
    left: 5,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 4,
    padding: 3,
  },
  galleryCellDeleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 10,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  galleryCellDeleteDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
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
  postsFeedList: {
    width: '100%',
  },
  postsFeedAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: 8,
  },
  postsFeedAddRowText: {
    fontSize: 14,
    fontWeight: '700',
  },
  postDivider: {
    height: 1,
    marginHorizontal: 16,
  },
});
