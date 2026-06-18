import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NavigatorScreenParams } from '@react-navigation/native';
import {
  View, Text, ScrollView, Pressable, TextInput, Image, Modal,
  StyleSheet, FlatList, KeyboardAvoidingView, Platform, Dimensions, PanResponder, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { radius, shadows, sheetLayout, spacing, typography } from '../theme/tokens';
import { AppSubHeader } from '../components/ui/AppSubHeader';
import { AppLogo } from '../components/ui/AppLogo';
import { Avatar, CompanionAvatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button, IconButton } from '../components/ui/Button';
import { Sheet } from '../components/ui/Sheet';
import { ModalPresent } from '../components/ui/ModalScrim';
import { PhotoSlot } from '../components/ui/PhotoSlot';
import { Empty } from '../components/ui/Empty';
import { Icon } from '../components/icons/Icon';
import { Toast, ToastData } from '../components/ui/Toast';
import { CompanionMiniSheet, CompanionFullProfile } from '../components/CompanionProfile';
import { usePawCircles } from '../context/PawCircleContext';
import { useCommunityGroups } from '../context/CommunityGroupsContext';
import type { CirclesStackParamList } from '../navigation/CirclesNavigator';
import { loadFeedPostTypeFilters, persistFeedPostTypeFilters } from '../lib/feedFilterStore';
import { useTabBarScrollPadding } from '../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../context/TabBarScrollContext';
import { useHomeHub } from '../context/HomeHubContext';
import { HOME_HUB_HEADER_LABELS } from '../components/ui/HomeHubDropdown';
import { useNotificationCount } from '../context/NotificationCountContext';
import { openNotifications } from '../navigation/notificationRouting';
import { PostAuthorRow } from '../components/feed/PostAuthorRow';
import { FeedPostItem } from '../components/feed/FeedPostItem';
import { confirmDeletePost } from '../components/feed/PostOwnerMenu';
import { AlertMessageSheet } from '../components/feed/AlertMessageSheet';
import { AdoptionNavigator } from '../navigation/AdoptionNavigator';
import { RescueNavigator } from '../navigation/RescueNavigator';
import type { AdoptionBrowseFilter, AdoptionHubTab } from '../components/adoption/AdoptionChrome';
import {
  AdoptionChatsHubBar,
  AdoptionHubBar,
} from '../components/adoption/AdoptionChrome';
import { getAdoptionChatSegmentMeta, type ChatSegment } from '../components/adoption/AdoptionChatsList';
import { useAdoption } from '../context/AdoptionContext';
import { groupThreads } from '../utils/chatThreadMeta';
import { isActiveAdoptionRequest, useAdoptionFeed } from '../context/AdoptionFeedContext';
import { RescueHubBar, RescueFilterField } from '../components/rescue/RescueChrome';
import { DEFAULT_RESCUE_FILTERS, filterRescueCases, getRescueCaseById, type RescueFilters, type RescueHubTab } from '../data/rescueData';
import { RescueFeedProvider, useRescueFeed } from '../context/RescueFeedContext';
import { RescueCaseCard } from '../components/rescue/RescueCaseCard';
import { ForwardSheet, type ForwardDest } from '../components/ForwardSheet';
import { FeedCommentSheet } from '../components/feed/FeedCommentSheet';
import { navigateToUserProfile } from '../navigation/userProfileRouting';

import { type Post } from '../data/mockData';
import { useFeedPosts } from '../context/FeedPostContext';
import { useAuth } from '../context/AuthContext';
import { useCurrentUserProfile } from '../context/CurrentUserProfileContext';
import { supabase } from '../lib/supabase';
import { ChatThreadScreen } from './ChatThreadScreen';
import type { ChatThread } from '../context/AdoptionContext';

function clearWebTextSelection() {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.getSelection()?.removeAllRanges();
  }
}

const POST_CATEGORIES = [
  { id: 'rescue',     label: 'Rescue',     icon: 'shield',   tint: '#E5424F', iconBg: '#FFE8E8' },
  { id: 'adoption',   label: 'Adoption',   icon: 'adoption', tint: '#E0503F', iconBg: '#FFE8CC' },
  { id: 'lost',       label: 'Lost',       icon: 'alert',    tint: '#E5424F', iconBg: '#FFD4D4' },
  { id: 'found',      label: 'Found',      icon: 'check',    tint: '#2FA46A', iconBg: '#D6F5E8' },
  { id: 'discussion', label: 'Discussion', icon: 'comment',  tint: '#7C5CBF', iconBg: '#F0EBFA' },
  { id: 'meme',       label: 'Meme',       icon: 'sparkle',  tint: '#7A5AE0', iconBg: '#EDE8FC' },
];

const POST_FILTER_CATEGORIES = [
  { id: 'rescue',       label: 'Rescue',       icon: 'shield',   tint: '#E5424F', iconBg: '#FFE8E8' },
  { id: 'paw-posting',  label: 'Paw Posting',  icon: 'paw',      tint: '#B87820', iconBg: '#FDF4E4' },
  { id: 'lost-found',   label: 'Lost / Found', icon: 'alert',    tint: '#C98E2A', iconBg: '#FDF6E8' },
  { id: 'discussion',   label: 'Discussion',   icon: 'comment',  tint: '#7C5CBF', iconBg: '#F0EBFA' },
  { id: 'meme',         label: 'Meme',         icon: 'sparkle',  tint: '#7A5AE0', iconBg: '#EDE8FC' },
];

const FILTER_POPUP_H_PAD = 16;
const FILTER_POPUP_WIDTH = Dimensions.get('window').width - FILTER_POPUP_H_PAD * 2;
const FILTER_CHIP_GAP = 8;
const FILTER_CHIP_MIN_WIDTH = 92;
const CATEGORY_POPUP_WIDTH = 248;
const POPUP_EDGE_PAD = 16;

function anchorCategoryPopup(
  triggerX: number,
  triggerY: number,
  triggerWidth: number,
  triggerHeight: number,
) {
  const screenWidth = Dimensions.get('window').width;
  const idealLeft = triggerX + triggerWidth - CATEGORY_POPUP_WIDTH;
  const left = Math.max(
    POPUP_EDGE_PAD,
    Math.min(idealLeft, screenWidth - CATEGORY_POPUP_WIDTH - POPUP_EDGE_PAD),
  );
  const caretLeft = Math.max(
    16,
    Math.min(triggerX + triggerWidth / 2 - left - 6, CATEGORY_POPUP_WIDTH - 28),
  );
  return { x: left, top: triggerY + triggerHeight + 6, caretLeft };
}

function pickFilterColumns(count: number, width: number): number {
  const candidates = [2, 3].filter(c => c <= count);
  for (const cols of candidates) {
    const chipW = (width - FILTER_CHIP_GAP * (cols - 1)) / cols;
    if (chipW >= FILTER_CHIP_MIN_WIDTH && count % cols === 0) return cols;
  }
  for (const cols of candidates) {
    const chipW = (width - FILTER_CHIP_GAP * (cols - 1)) / cols;
    if (chipW >= FILTER_CHIP_MIN_WIDTH) return cols;
  }
  return 2;
}

function chunkFilterRows<T>(items: T[], cols: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));
  return rows;
}

function matchesPostType(post: Post, type: string) {
  switch (type) {
    case 'paw-posting':
      return post.tag === 'paw-posting' || !!post.companionAuthorId;
    case 'discussion':
      return (post.tag === 'discussion'
        || (post.label === null && post.tag !== 'adoption' && post.tag !== 'rescue'))
        && post.tag !== 'paw-posting'
        && !post.companionAuthorId;
    case 'meme':
      return post.label === 'meme';
    case 'adoption':
      return post.label === 'adoption' || post.tag === 'adoption';
    case 'lost-found':
    case 'lost':
    case 'found':
      return post.label === 'lost' || post.label === 'found';
    case 'rescue':
      return post.label === 'rescue' || post.tag === 'rescue';
    default:
      return true;
  }
}

function filterPostsForFeed(posts: Post[], postTypeFilters: string[]): Post[] {
  const withoutAdoption = posts.filter(
    p => p.label !== 'adoption' && p.tag !== 'adoption',
  );
  if (postTypeFilters.length === 0) return withoutAdoption;
  return withoutAdoption.filter(p => postTypeFilters.some(type => matchesPostType(p, type)));
}

type FeedListItem =
  | { kind: 'post'; id: string; post: Post }
  | { kind: 'case'; id: string; caseId: string };

type FeedNav = CompositeNavigationProp<
  BottomTabNavigationProp<{ Feed: undefined; Circles: NavigatorScreenParams<CirclesStackParamList> }>,
  NativeStackNavigationProp<CirclesStackParamList>
>;

function FeedPostList({
  posts,
  postTypeFilters,
  isFeedFocused,
  tabBarPad,
  tabBarScrollProps,
  currentUserId,
  focusPostId,
  onFocusPostHandled,
  listHeader,
  onPaw,
  onSave,
  onComments,
  onForward,
  onUserPress,
  onCompanionPress,
  onEdit,
  onDelete,
  onMessage,
  onResolve,
  onToast,
  onOpenRescueCase,
}: {
  posts: Post[];
  postTypeFilters: string[];
  isFeedFocused: boolean;
  tabBarPad: number;
  tabBarScrollProps: Record<string, unknown>;
  currentUserId?: string;
  focusPostId?: string | null;
  onFocusPostHandled?: () => void;
  listHeader?: React.ReactNode;
  onPaw: (id: string) => void;
  onSave: (id: string) => void;
  onComments: (id: string) => void;
  onForward: (post: Post) => void;
  onUserPress: (userId: string) => void;
  onCompanionPress: (id: string) => void;
  onEdit: (post: Post) => void;
  onDelete: (id: string) => void;
  onMessage: (post: Post) => void;
  onResolve: (post: Post) => void;
  onToast: (t: ToastData) => void;
  onOpenRescueCase: (caseId: string) => void;
}) {
  const { colors } = useTheme();
  const { cases, isFollowing, toggleFollow } = useRescueFeed();
  const listRef = useRef<FlatList<FeedListItem>>(null);
  const rescueFilterActive = postTypeFilters.includes('rescue');

  const shownPosts = useMemo(
    () => filterPostsForFeed(posts, postTypeFilters),
    [posts, postTypeFilters],
  );

  const shownCases = useMemo(() => {
    if (!rescueFilterActive) return [];
    return filterRescueCases(cases, {
      tab: 'browse',
      filters: {
        scope: 'all',
        species: 'all',
        status: 'all',
        contentType: 'cases',
      },
    });
  }, [cases, rescueFilterActive]);

  const listData = useMemo((): FeedListItem[] => {
    const postItems = shownPosts.map(post => ({ kind: 'post' as const, id: post.id, post }));
    if (!rescueFilterActive) return postItems;
    const caseItems = shownCases.map(c => ({ kind: 'case' as const, id: `case-${c.id}`, caseId: c.id }));
    return [...caseItems, ...postItems];
  }, [shownPosts, shownCases, rescueFilterActive]);

  const listExtraData = useMemo(
    () => shownPosts.map(p => `${p.id}:${p.lost?.resolved ? 1 : 0}:${p.found?.resolved ? 1 : 0}:${p.paws}:${p.saved ? 1 : 0}`).join('|'),
    [shownPosts],
  );

  const caseById = useMemo(() => new Map(cases.map(c => [c.id, c])), [cases]);

  useEffect(() => {
    if (!focusPostId) return;
    const index = listData.findIndex(
      item => item.kind === 'post' && item.post.id === focusPostId,
    );
    if (index < 0) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.15 });
      onFocusPostHandled?.();
    }, 150);
    return () => clearTimeout(timer);
  }, [focusPostId, listData, onFocusPostHandled]);

  const renderPost = (item: Post) => (
    <FeedPostItem
      post={item}
      pulseActive={isFeedFocused && !item.lost?.resolved && !item.found?.resolved}
      alertPadding
      onPaw={() => onPaw(item.id)}
      onSave={() => onSave(item.id)}
      onComments={() => onComments(item.id)}
      onForward={() => onForward(item)}
      onUserPress={onUserPress}
      onCompanionPress={onCompanionPress}
      onEdit={() => onEdit(item)}
      onDelete={() => onDelete(item.id)}
      onMessage={onMessage}
      onResolve={onResolve}
      onToast={onToast}
      currentUserId={currentUserId}
    />
  );

  return (
    <FlatList
      ref={listRef}
      style={[styles.feedList, { backgroundColor: colors.bg }]}
      data={listData}
      extraData={listExtraData}
      keyExtractor={item => item.id}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: tabBarPad }}
      ListHeaderComponent={listHeader ? () => <>{listHeader}</> : undefined}
      showsVerticalScrollIndicator={false}
      onScrollToIndexFailed={info => {
        listRef.current?.scrollToOffset({
          offset: Math.max(0, info.averageItemLength * info.index),
          animated: true,
        });
        setTimeout(() => {
          listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.15 });
          onFocusPostHandled?.();
        }, 100);
      }}
      {...tabBarScrollProps}
      ItemSeparatorComponent={() => (
        <View style={[styles.postDivider, { backgroundColor: colors.border }]} />
      )}
      renderItem={({ item }) => {
        if (item.kind === 'case') {
          const rescueCase = caseById.get(item.caseId) ?? getRescueCaseById(item.caseId);
          if (!rescueCase) return null;
          return (
            <View style={styles.feedCaseWrap}>
              <RescueCaseCard
                item={rescueCase}
                following={isFollowing(rescueCase.id)}
                onPress={() => onOpenRescueCase(rescueCase.id)}
                onFollow={() => {
                  const was = isFollowing(rescueCase.id);
                  toggleFollow(rescueCase.id);
                  onToast({
                    msg: was ? 'Unfollowed case' : `Following ${rescueCase.name}`,
                    icon: 'paw',
                    tone: 'primary',
                  });
                }}
                onShare={() => onToast({ msg: 'Case link copied', icon: 'forward', tone: 'success' })}
              />
            </View>
          );
        }
        return renderPost(item.post);
      }}
      ListEmptyComponent={
        <Empty title="Nothing here yet" icon="paw-line">No posts match this filter. Try another.</Empty>
      }
    />
  );
}

export function FeedScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const navigation = useNavigation<FeedNav>();
  const { user } = useAuth();
  const { createdCircles, joinedCircles } = usePawCircles();
  const [postTypeFilters, setPostTypeFilters] = useState<string[]>([]);
  const [filtersHydrated, setFiltersHydrated] = useState(false);
  const filterButtonRef = useRef<View>(null);
  const [filterPopupOpen, setFilterPopupOpen] = useState(false);
  const [filterAnchor, setFilterAnchor] = useState({ x: FILTER_POPUP_H_PAD, top: 100 });
  const {
    posts: postList,
    setPosts: setPostList,
    toggleSaved,
    togglePaw,
    persistForward,
    pawComment,
    addComment,
    deletePost,
    openComposerForEdit,
    resolveAlert,
    openComposer,
    openCaseFlow,
    openAdoptionListing,
    focusFeedPostId,
    focusFeedFilters,
    clearFeedPostFocus,
  } = useFeedPosts();
  const [alertComposePost, setAlertComposePost] = useState<Post | null>(null);
  const [alertDmThread, setAlertDmThread] = useState<ChatThread | null>(null);
  const { joinedCommunities } = useCommunityGroups();
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const commentPost = useMemo(
    () => (commentPostId ? postList.find(p => p.id === commentPostId) ?? null : null),
    [commentPostId, postList],
  );
  const [selectedCompanionId, setSelectedCompanionId] = useState<string | null>(null);
  const [companionFullOpen, setCompanionFullOpen] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [forwardPost, setForwardPost] = useState<Post | null>(null);
  const { homeTab, resetToFeed } = useHomeHub();
  const unreadNotifCount = useNotificationCount();
  const [adoptionHubTab, setAdoptionHubTab] = useState<AdoptionHubTab>('discover');
  const [rescueHubTab, setRescueHubTab] = useState<RescueHubTab>('browse');
  const [adoptionBrowseFilter, setAdoptionBrowseFilter] = useState<AdoptionBrowseFilter>('all');
  const [adoptionChatSegment, setAdoptionChatSegment] = useState<ChatSegment>('adopting');
  const { threads, records } = useAdoption();
  const { getMyOutgoingRequests, listings: adoptionListings, requests: adoptionRequests } = useAdoptionFeed();
  const adoptionRequestedCount = useMemo(
    () => getMyOutgoingRequests().filter(isActiveAdoptionRequest).length,
    [getMyOutgoingRequests],
  );
  const adoptionThreads = useMemo(() => {
    const grouped = groupThreads(threads, records, user?.id ?? '');
    return [...grouped.action, ...grouped.adoption];
  }, [threads, records, user?.id]);
  const adoptionChatSegmentMeta = useMemo(
    () => getAdoptionChatSegmentMeta(
      adoptionThreads,
      records,
      adoptionListings,
      adoptionRequests,
      user?.id ?? '',
    ),
    [adoptionThreads, records, adoptionListings, adoptionRequests, user?.id],
  );

  useEffect(() => {
    if (adoptionHubTab === 'threads') {
      setAdoptionChatSegment('adopting');
    }
  }, [adoptionHubTab]);

  const [rescueFilters, setRescueFilters] = useState<RescueFilters>(DEFAULT_RESCUE_FILTERS);

  useEffect(() => {
    if (!user?.id) {
      setPostTypeFilters([]);
      setFiltersHydrated(true);
      return;
    }
    let cancelled = false;
    loadFeedPostTypeFilters(user.id).then(stored => {
      if (cancelled) return;
      setPostTypeFilters(stored);
      setFiltersHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !filtersHydrated) return;
    void persistFeedPostTypeFilters(user.id, postTypeFilters);
  }, [user?.id, postTypeFilters, filtersHydrated]);

  useEffect(() => {
    if (!focusFeedPostId || focusFeedFilters === null) return;
    setPostTypeFilters(focusFeedFilters.filter(f => f !== 'adoption'));
  }, [focusFeedPostId, focusFeedFilters]);

  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const isFeedFocused = useIsFocused();

  useFocusEffect(
    useCallback(() => () => {
      setSelectedCompanionId(null);
      setCompanionFullOpen(false);
      setFilterPopupOpen(false);
    }, []),
  );

  const togglePostTypeFilter = useCallback((id: string) => {
    setPostTypeFilters(prev => {
      if (id === 'lost-found') {
        const withoutLostFound = prev.filter(f => f !== 'lost' && f !== 'found' && f !== 'lost-found');
        return prev.some(f => f === 'lost' || f === 'found' || f === 'lost-found')
          ? withoutLostFound
          : [...withoutLostFound, 'lost-found'];
      }
      return prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
    });
  }, []);

  const openFilterPopup = useCallback(() => {
    clearWebTextSelection();
    filterButtonRef.current?.measureInWindow((_x, y, _w, height) => {
      setFilterAnchor({ x: FILTER_POPUP_H_PAD, top: y + height + 6 });
      setFilterPopupOpen(prev => !prev);
    });
  }, []);

  const closeFilterPopup = useCallback(() => setFilterPopupOpen(false), []);

  const filtersActive = postTypeFilters.length > 0;

  const showToast = (t: ToastData) => setToast(t);

  const handleOpenAlertDm = useCallback((post: Post) => {
    if (!user) return;
    if (post.userId === user.id) {
      showToast({ msg: "This is your alert — others can message you here", icon: 'message', tone: 'neutral' });
      return;
    }
    setAlertComposePost(post);
  }, [user]);

  const handleAlertMessageSent = useCallback((thread: ChatThread) => {
    setAlertDmThread(thread);
    showToast({ msg: 'Message sent', icon: 'check', tone: 'success' });
  }, []);

  const openRescueCase = useCallback((caseId: string) => {
    (navigation as any).navigate('Profile', {
      screen: 'RescueDetail',
      params: { caseId },
    });
  }, [navigation]);

  const openCircleChat = (circleId: string) => {
    navigation.navigate('Circles', {
      screen: 'CircleChat',
      params: { circleId, returnTo: 'Feed' },
    });
  };

  const openUserProfile = useCallback((userId: string) => {
    navigateToUserProfile(navigation, userId, user?.id, { returnTo: 'Feed' });
  }, [navigation, user?.id]);

  const openCommentAuthorProfile = useCallback((userId: string) => {
    openUserProfile(userId);
  }, [openUserProfile]);

  const closeCompanionProfile = useCallback(() => {
    setCompanionFullOpen(false);
    setSelectedCompanionId(null);
  }, []);

  const openCompanionOwnerProfile = useCallback((userId: string) => {
    closeCompanionProfile();
    openUserProfile(userId);
  }, [closeCompanionProfile, openUserProfile]);


  const handleSave = (id: string) => {
    const nowSaved = toggleSaved(id);
    showToast({
      msg: nowSaved ? 'Saved to your collection' : 'Removed from saved',
      icon: 'bookmark',
      tone: 'primary',
    });
  };

  const handleResolveAlert = useCallback((post: Post) => {
    resolveAlert(post.id);
    const companion = post.companionName ?? 'Companion';
    const isFound = post.label === 'found' && !!post.found;
    showToast({
      msg: isFound
        ? `${companion} marked as reunited with their owner`
        : `${companion} marked as returned home`,
      icon: 'check',
      tone: 'success',
    });
  }, [resolveAlert]);

  const completeForward = (dests: ForwardDest[]) => {
    if (!forwardPost || dests.length === 0) return;
    setPostList(ps => ps.map(p => (
      p.id === forwardPost.id ? { ...p, forwards: p.forwards + dests.length } : p
    )));
    persistForward(forwardPost.id, dests, forwardPost.text, forwardPost.label);
    setForwardPost(null);
    if (dests.length === 1 && dests[0].type === 'circle') {
      openCircleChat(dests[0].id);
    }
    const label = dests.map(d => d.label).join(', ');
    showToast({ msg: `Shared to ${label}`, icon: 'forward', tone: 'success' });
  };

  const feedHeaderShowsBack = homeTab !== 'feed';

  const handleFeedHomePress = useCallback(() => {
    resetToFeed();
    setPostTypeFilters([]);
    clearFeedPostFocus();
  }, [resetToFeed, clearFeedPostFocus]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <AppSubHeader
        showBack={feedHeaderShowsBack}
        onBack={handleFeedHomePress}
        titleNode={
          homeTab === 'feed' ? (
            <AppLogo showWordmark onPress={handleFeedHomePress} />
          ) : (
            <Pressable
              onPress={handleFeedHomePress}
              style={({ pressed }) => [
                styles.hubHeaderTitlePress,
                Platform.OS === 'web' && styles.hubHeaderTitlePressWeb,
                pressed && styles.hubHeaderTitlePressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Back to feed from ${HOME_HUB_HEADER_LABELS[homeTab]}`}
            >
              <Text style={[styles.hubHeaderTitle, { color: colors.text }]}>
                {HOME_HUB_HEADER_LABELS[homeTab]}
              </Text>
            </Pressable>
          )
        }
        trailing={(
          <View style={styles.headerActions}>
            {homeTab !== 'feed' ? (
              <IconButton
                name={isDark ? 'sun' : 'moon'}
                size={46}
                iconSize={22}
                tone="ghost"
                color={colors.textSecondary}
                accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                onPress={toggleTheme}
              />
            ) : null}
            <View style={styles.headerBellWrap}>
              <IconButton
                name="bell"
                size={46}
                iconSize={22}
                tone="ghost"
                color={colors.textSecondary}
                count={unreadNotifCount || undefined}
                onPress={() => openNotifications(navigation)}
              />
            </View>
          </View>
        )}
      />

      {(homeTab === 'adoption' || homeTab === 'rescue') && (
        <View style={styles.homeChrome}>
          {homeTab === 'adoption' && (
            <View style={[styles.subHubChrome, { backgroundColor: colors.bg }]}>
              {adoptionHubTab === 'threads' ? (
                <AdoptionChatsHubBar
                  segment={adoptionChatSegment}
                  onSegmentChange={setAdoptionChatSegment}
                  onBack={() => setAdoptionHubTab('discover')}
                  showSegmentBar={adoptionChatSegmentMeta.showSegmentBar}
                  adoptingUrgent={adoptionChatSegmentMeta.adoptingUrgent}
                />
              ) : (
                <AdoptionHubBar
                  tab={adoptionHubTab}
                  onTabChange={setAdoptionHubTab}
                  browseFilter={adoptionBrowseFilter}
                  onBrowseFilterChange={setAdoptionBrowseFilter}
                  requestedCount={adoptionRequestedCount}
                  chatUrgent={adoptionChatSegmentMeta.adoptingUrgent}
                  chatBadgeCount={adoptionThreads.reduce((sum, t) => sum + t.unread, 0) || undefined}
                />
              )}
            </View>
          )}

          {homeTab === 'rescue' && (
            <View style={[styles.subHubChrome, { backgroundColor: colors.bg }]}>
              <RescueHubBar tab={rescueHubTab} onTabChange={setRescueHubTab} />
              {rescueHubTab === 'browse' && (
                <RescueFilterField
                  filters={rescueFilters}
                  onChange={setRescueFilters}
                  onReset={() => setRescueFilters(DEFAULT_RESCUE_FILTERS)}
                />
              )}
            </View>
          )}
        </View>
      )}

      {homeTab === 'feed' && (
        <RescueFeedProvider>
          <FeedPostList
            posts={postList}
            postTypeFilters={postTypeFilters}
            isFeedFocused={isFeedFocused}
            tabBarPad={tabBarPad}
            tabBarScrollProps={tabBarScrollProps}
            currentUserId={user?.id}
            focusPostId={focusFeedPostId}
            onFocusPostHandled={clearFeedPostFocus}
            listHeader={(
              <View style={styles.feedLensChrome}>
                <ComposerBar
                  onOpen={() => openComposer({ initialCategory: 'discussion' })}
                  onProfilePress={() => {
                    if (user?.id) openUserProfile(user.id);
                  }}
                  onCategorySelect={cat => {
                    if (cat === 'adoption') {
                      openAdoptionListing();
                      return;
                    }
                    openComposer({ initialCategory: cat });
                  }}
                  onOpenCase={openCaseFlow}
                  postTypeFilters={postTypeFilters}
                  onTogglePostTypeFilter={togglePostTypeFilter}
                  onCloseFilterPopup={closeFilterPopup}
                  filterButtonRef={filterButtonRef}
                  onOpenFilterPopup={openFilterPopup}
                  filtersActive={filtersActive}
                />
              </View>
            )}
            onPaw={togglePaw}
            onSave={handleSave}
            onComments={setCommentPostId}
            onForward={setForwardPost}
            onUserPress={openUserProfile}
            onCompanionPress={setSelectedCompanionId}
            onEdit={openComposerForEdit}
            onDelete={id => confirmDeletePost(() => {
              deletePost(id);
              showToast({ msg: 'Post deleted', icon: 'check', tone: 'success' });
            })}
            onMessage={handleOpenAlertDm}
            onResolve={handleResolveAlert}
            onToast={showToast}
            onOpenRescueCase={openRescueCase}
          />
        </RescueFeedProvider>
      )}

      {homeTab === 'adoption' && (
        <View style={styles.hubContent}>
          <AdoptionNavigator
            embedded
            hubTab={adoptionHubTab}
            onHubTabChange={setAdoptionHubTab}
            hubBarPinned
            browseFilter={adoptionBrowseFilter}
            onBrowseFilterChange={setAdoptionBrowseFilter}
            chatSegment={adoptionChatSegment}
            onChatSegmentChange={setAdoptionChatSegment}
            chatSegmentBarPinned={adoptionHubTab === 'threads'}
          />
        </View>
      )}
      {homeTab === 'rescue' && (
        <View style={styles.hubContent}>
          <RescueNavigator
            embedded
            hubTab={rescueHubTab}
            onHubTabChange={setRescueHubTab}
            hubBarPinned
            filters={rescueFilters}
            onFiltersChange={setRescueFilters}
          />
        </View>
      )}

      {commentPost && (
        <FeedCommentSheet
          post={commentPost}
          createdCircles={createdCircles}
          joinedCircles={joinedCircles}
          onClose={() => setCommentPostId(null)}
          onSubmit={(text, replyToThreadIndex) => addComment(commentPost.id, text, { replyToThreadIndex })}
          onCommentPaw={threadIndex => pawComment(commentPost.id, threadIndex)}
          onToast={showToast}
          onAuthorPress={openCommentAuthorProfile}
        />
      )}

      {forwardPost && (
        <ForwardSheet
          visible
          previewAuthorId={forwardPost.author}
          previewText={forwardPost.text}
          createdCircles={createdCircles}
          joinedCircles={joinedCircles}
          joinedCommunities={joinedCommunities}
          onClose={() => setForwardPost(null)}
          onSelect={completeForward}
        />
      )}

      {selectedCompanionId && (
        <CompanionMiniSheet
          companionId={selectedCompanionId}
          visible={!companionFullOpen}
          onClose={() => setSelectedCompanionId(null)}
          onViewProfile={() => setCompanionFullOpen(true)}
          onOwnerPress={openCompanionOwnerProfile}
          onToast={showToast}
        />
      )}

      {selectedCompanionId && (
        <CompanionFullProfile
          companionId={selectedCompanionId}
          visible={companionFullOpen}
          onClose={closeCompanionProfile}
          onSwitchCompanion={(id) => setSelectedCompanionId(id)}
          onOwnerPress={openCompanionOwnerProfile}
          onToast={showToast}
        />
      )}

      <AlertMessageSheet
        post={alertComposePost}
        onClose={() => setAlertComposePost(null)}
        onSent={handleAlertMessageSent}
        onError={(msg) => showToast({ msg, icon: 'close', tone: 'danger' })}
      />

      <Modal visible={!!alertDmThread} animationType="slide" onRequestClose={() => setAlertDmThread(null)}>
        {alertDmThread && (
          <ChatThreadScreen thread={alertDmThread} onClose={() => setAlertDmThread(null)} />
        )}
      </Modal>

      <Toast data={toast} onHide={() => setToast(null)} />

      {homeTab === 'feed' && (
        <PostTypeFilterPopup
          visible={filterPopupOpen}
          anchor={filterAnchor}
          selected={postTypeFilters}
          onClose={closeFilterPopup}
          onToggle={togglePostTypeFilter}
          onClear={() => setPostTypeFilters([])}
        />
      )}
    </SafeAreaView>
  );
}

// ── ComposerBar ───────────────────────────────────────────────────────────────

function getActiveFeedFilterPills(filters: string[]) {
  return POST_FILTER_CATEGORIES.filter(cat => {
    if (cat.id === 'lost-found') {
      return filters.some(f => f === 'lost' || f === 'found' || f === 'lost-found');
    }
    return filters.includes(cat.id);
  });
}

function FeedActiveFilterPills({
  filters,
  onRemove,
}: {
  filters: string[];
  onRemove: (id: string) => void;
}) {
  const { colors, iconBg } = useTheme();
  const pills = useMemo(() => getActiveFeedFilterPills(filters), [filters]);
  if (pills.length === 0) return null;

  return (
    <View style={styles.activeFilterRow}>
      {pills.map(pill => (
        <View
          key={pill.id}
          style={[
            styles.activeFilterPill,
            {
              backgroundColor: iconBg(pill.iconBg),
              borderColor: pill.tint + '55',
            },
          ]}
        >
          <Icon
            name={pill.icon}
            size={13}
            color={pill.tint}
            fill={pill.icon === 'adoption' || pill.icon === 'check' || pill.icon === 'paw' ? pill.tint : 'none'}
          />
          <Text style={[styles.activeFilterLabel, { color: colors.text }]} numberOfLines={1}>
            {pill.label}
          </Text>
          <Pressable
            onPress={() => onRemove(pill.id)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${pill.label} filter`}
            style={[styles.activeFilterDismiss, { backgroundColor: pill.tint }]}
          >
            <Icon name="close" size={8} color="#fff" sw={2.5} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function ComposerBar({
  onOpen,
  onCategorySelect,
  onOpenCase,
  onProfilePress,
  postTypeFilters,
  onTogglePostTypeFilter,
  onCloseFilterPopup,
  filterButtonRef,
  onOpenFilterPopup,
  filtersActive = false,
}: {
  onOpen: () => void;
  onCategorySelect: (category: string) => void;
  onOpenCase: () => void;
  onProfilePress: () => void;
  postTypeFilters: string[];
  onTogglePostTypeFilter: (id: string) => void;
  onCloseFilterPopup?: () => void;
  filterButtonRef?: React.RefObject<View | null>;
  onOpenFilterPopup?: () => void;
  filtersActive?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const { me } = useCurrentUserProfile();
  const plusRef = useRef<View>(null);
  const [categoryPopupOpen, setCategoryPopupOpen] = useState(false);
  const [categoryAnchor, setCategoryAnchor] = useState({ x: 16, top: 100, caretLeft: 20 });

  const openCategoryPopup = () => {
    onCloseFilterPopup?.();
    plusRef.current?.measureInWindow((x, y, width, height) => {
      setCategoryAnchor(anchorCategoryPopup(x, y, width, height));
      setCategoryPopupOpen(true);
    });
  };

  useFocusEffect(useCallback(() => () => {
    setCategoryPopupOpen(false);
  }, []));

  const openComposerFromBar = () => {
    Keyboard.dismiss();
    onOpen();
  };

  const shellBg = isDark ? colors.surface2 : '#F6F5F8';

  return (
    <>
      <View style={styles.composerRow}>
        <Pressable
          onPress={onProfilePress}
          accessibilityRole="button"
          accessibilityLabel="Go to your profile"
          style={({ pressed }) => [
            styles.composerAvatarWrap,
            Platform.OS === 'web' && styles.composerPressWeb,
            pressed && styles.composerPressPressed,
          ]}
        >
          <Avatar user={me} size={36} />
        </Pressable>

        <View style={[styles.composerShell, { backgroundColor: shellBg }]}>
          <Pressable
            ref={plusRef}
            onPress={openCategoryPopup}
            accessibilityRole="button"
            accessibilityLabel="Choose post type"
            accessibilityState={{ selected: categoryPopupOpen }}
            style={({ pressed }) => [
              styles.composerActionBtn,
              categoryPopupOpen && { backgroundColor: colors.primary + '18' },
              Platform.OS === 'web' && styles.composerPressWeb,
              pressed && styles.composerPressPressed,
            ]}
          >
            <Icon
              name="plus"
              size={22}
              color={categoryPopupOpen ? colors.primary : colors.textSecondary}
              sw={2.2}
            />
          </Pressable>
          <Pressable
            onPress={openComposerFromBar}
            accessibilityRole="button"
            accessibilityLabel="New post"
            style={({ pressed }) => [
              styles.composerInputArea,
              Platform.OS === 'web' && styles.composerPressWeb,
              pressed && styles.composerPressPressed,
            ]}
          >
            <Text style={[styles.composerPlaceholder, { color: colors.textTertiary }]}>
              Share an update…
            </Text>
          </Pressable>
        </View>

        {onOpenFilterPopup ? (
          <View ref={filterButtonRef} collapsable={false} style={styles.composerFilterWrap}>
            <IconButton
              name="sliders"
              size={46}
              iconSize={24}
              tone="ghost"
              color={filtersActive ? colors.text : colors.textSecondary}
              accessibilityLabel="Filter feed"
              onPress={onOpenFilterPopup}
            />
          </View>
        ) : null}
      </View>

      <FeedActiveFilterPills filters={postTypeFilters} onRemove={onTogglePostTypeFilter} />

      <PostCategoryPopup
        visible={categoryPopupOpen}
        anchor={categoryAnchor}
        onClose={() => setCategoryPopupOpen(false)}
        onSelect={id => {
          setCategoryPopupOpen(false);
          onCategorySelect(id);
        }}
        onOpenCase={() => {
          setCategoryPopupOpen(false);
          onOpenCase();
        }}
      />
    </>
  );
}

// ── PostTypeFilterPopup ───────────────────────────────────────────────────────

function PostTypeFilterPopup({
  visible,
  anchor,
  selected,
  onClose,
  onToggle,
  onClear,
}: {
  visible: boolean;
  anchor: { x: number; top: number };
  selected: string[];
  onClose: () => void;
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  const { colors, iconBg } = useTheme();
  const [gridWidth, setGridWidth] = useState(FILTER_POPUP_WIDTH - 24);
  const cols = pickFilterColumns(POST_FILTER_CATEGORIES.length, gridWidth);
  const chipWidth = (gridWidth - FILTER_CHIP_GAP * (cols - 1)) / cols;
  const rows = chunkFilterRows(POST_FILTER_CATEGORIES, cols);
  const selectedSet = useMemo(() => {
    const set = new Set(selected.filter(f => f !== 'lost' && f !== 'found'));
    if (selected.some(f => f === 'lost' || f === 'found' || f === 'lost-found')) {
      set.add('lost-found');
    }
    return set;
  }, [selected]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <ModalPresent onDismiss={onClose} style={styles.popupOverlay} animatedScale={false}>
        <View
          style={[
            styles.filterPopupCard,
            {
              top: anchor.top,
              left: anchor.x,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              ...shadows.md,
            },
          ]}
        >
          <View style={styles.filterPopupHeader}>
            <Text style={[styles.filterPopupTitle, { color: colors.text }]}>Customize your feed</Text>
            {selected.length > 0 && (
              <Pressable onPress={onClear} hitSlop={8}>
                <Text style={[styles.filterPopupClear, { color: colors.primary }]}>Clear</Text>
              </Pressable>
            )}
          </View>

          <View
            style={styles.filterChipGrid}
            onLayout={e => setGridWidth(e.nativeEvent.layout.width)}
          >
            {rows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.filterChipRow}>
                {row.map(item => {
                  const isSelected = selectedSet.has(item.id);
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => onToggle(item.id)}
                      style={[
                        styles.filterChip,
                        { width: chipWidth },
                        {
                          backgroundColor: isSelected ? iconBg(item.iconBg) : colors.surface,
                          borderColor: isSelected ? item.tint : colors.border,
                        },
                      ]}
                    >
                      <Icon
                        name={item.icon}
                        size={13}
                        color={isSelected ? item.tint : colors.textSecondary}
                        fill={
                          item.icon === 'adoption' || item.icon === 'check' || item.icon === 'paw'
                            ? (isSelected ? item.tint : colors.textSecondary)
                            : 'none'
                        }
                      />
                      <Text
                        style={[
                          styles.filterChipLabel,
                          { color: isSelected ? colors.text : colors.textSecondary },
                          isSelected && { fontWeight: '700' },
                        ]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                      {isSelected && (
                        <Pressable
                          onPress={() => onToggle(item.id)}
                          hitSlop={6}
                          style={[styles.filterChipClose, { backgroundColor: item.tint + '33' }]}
                        >
                          <Icon name="close" size={10} color={item.tint} sw={2.2} />
                        </Pressable>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </ModalPresent>
    </Modal>
  );
}

// ── PostCategoryPopup ─────────────────────────────────────────────────────────

function PostCategoryPopup({
  visible,
  anchor,
  onClose,
  onSelect,
  onOpenCase,
}: {
  visible: boolean;
  anchor: { x: number; top: number; caretLeft?: number };
  onClose: () => void;
  onSelect: (id: string) => void;
  onOpenCase: () => void;
}) {
  const { colors, iconBg } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <ModalPresent onDismiss={onClose} style={styles.popupOverlay} animatedScale={false}>
        <View
          style={[
            styles.categoryPopupCard,
            {
              top: anchor.top,
              left: anchor.x,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              ...shadows.md,
            },
          ]}
        >
          <View style={[styles.popupCaretRow, { paddingLeft: anchor.caretLeft ?? 20 }]}>
            <View style={[styles.popupCaret, { borderBottomColor: colors.surface }]} />
          </View>

          <Pressable
            onPress={onOpenCase}
            style={({ pressed }) => [
              styles.caseActionRow,
              {
                backgroundColor: colors.dangerBg,
                borderColor: colors.danger + '28',
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <View style={[styles.popupItemIcon, { backgroundColor: iconBg('#FFE8E8') }]}>
              <Icon name="shield" size={18} color={colors.danger} />
            </View>
            <View style={styles.caseActionCopy}>
              <Text style={[styles.caseActionTitle, { color: colors.text }]}>Open a case</Text>
              <Text style={[styles.caseActionSub, { color: colors.textSecondary }]}>
                Formal rescue with public updates
              </Text>
            </View>
            <Icon name="chevronRight" size={14} color={colors.textTertiary} />
          </Pressable>

          <View style={[styles.popupSectionDivider, { backgroundColor: colors.border }]} />
          <Text style={[styles.popupSectionLabel, { color: colors.textTertiary }]}>New post</Text>

          {POST_CATEGORIES.filter(item => item.id !== 'discussion').map(item => (
            <Pressable
              key={item.id}
              onPress={() => onSelect(item.id)}
              style={styles.popupItem}
            >
              <View style={[styles.popupItemIcon, { backgroundColor: iconBg(item.iconBg) }]}>
                <Icon
                  name={item.icon}
                  size={18}
                  color={item.tint}
                  fill={item.icon === 'adoption' || item.icon === 'check' ? item.tint : 'none'}
                />
              </View>
              <Text style={[styles.popupItemLabel, { color: colors.text }]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </ModalPresent>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  hubContent: { flex: 1, minHeight: 0 },
  homeChrome: {
    flexShrink: 0,
  },
  subHubChrome: {
    flexShrink: 0,
    paddingTop: 0,
  },
  feedLensChrome: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: spacing.xs,
    gap: 14,
    ...Platform.select({
      web: { userSelect: 'none' },
      default: {},
    }),
  },
  feedList: { flex: 1 },
  feedCaseWrap: { paddingHorizontal: 16, paddingVertical: 8 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    flexShrink: 0,
  },
  headerBellWrap: {
    marginLeft: -8,
  },
  hubHeaderTitlePress: {
    paddingVertical: 4,
    paddingRight: 4,
  },
  hubHeaderTitlePressWeb: { cursor: 'pointer' as const },
  hubHeaderTitlePressed: { opacity: 0.72 },
  hubHeaderTitle: {
    ...typography.appHeaderTitle,
  },
  popupOverlay: { flex: 1, position: 'relative' },
  popupCard: {
    position: 'absolute',
    width: 248,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingTop: 6,
    paddingBottom: 8,
    paddingHorizontal: 6,
  },
  popupCaretRow: { alignItems: 'flex-start', paddingLeft: 20, marginBottom: 2 },
  popupCaret: {
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  popupTitle: {
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingBottom: 6,
    paddingTop: 2,
  },
  caseActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 6,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  caseActionCopy: { flex: 1, minWidth: 0, gap: 2 },
  caseActionTitle: { fontSize: 14, fontWeight: '700' },
  caseActionSub: { fontSize: 11.5, lineHeight: 15 },
  popupSectionDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 10,
    marginVertical: 6,
  },
  popupSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    paddingHorizontal: 10,
    paddingBottom: 4,
  },
  popupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
  },
  popupItemIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupItemLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...Platform.select({
      web: { userSelect: 'none' },
      default: {},
    }),
  },
  activeFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activeFilterPill: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  activeFilterLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    maxWidth: 140,
  },
  activeFilterDismiss: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  composerAvatarWrap: {
    flexShrink: 0,
  },
  composerFilterWrap: {
    flexShrink: 0,
  },
  composerShell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 44,
    borderRadius: radius.full,
    paddingLeft: 4,
    paddingRight: 12,
    paddingVertical: 4,
    minWidth: 0,
  },
  composerActionBtn: {
    width: 38,
    height: 38,
    minWidth: 38,
    minHeight: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...Platform.select({
      web: {
        padding: 0,
        borderWidth: 0,
        borderStyle: 'solid',
        boxSizing: 'border-box',
        appearance: 'none',
        WebkitAppearance: 'none',
      } as object,
      default: {},
    }),
  },
  composerInputArea: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingRight: 4,
    minWidth: 0,
  },
  composerPlaceholder: { fontSize: 15, fontWeight: '500', letterSpacing: -0.15 },
  composerPressWeb: { cursor: 'pointer' as const },
  composerPressPressed: { opacity: 0.82 },
  categoryPopupCard: {
    position: 'absolute',
    width: CATEGORY_POPUP_WIDTH,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingTop: 6,
    paddingBottom: 8,
    paddingHorizontal: 6,
  },
  filterPopupCard: {
    position: 'absolute',
    width: FILTER_POPUP_WIDTH,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 12,
  },
  filterPopupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  filterPopupTitle: { fontSize: 14, fontWeight: '700' },
  filterPopupClear: { fontSize: 13, fontWeight: '600' },
  filterChipGrid: {
    gap: FILTER_CHIP_GAP,
  },
  filterChipRow: {
    flexDirection: 'row',
    gap: FILTER_CHIP_GAP,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 36,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    borderWidth: 1.5,
  },
  filterChipLabel: { flexShrink: 1, fontSize: 12, fontWeight: '600' },
  filterChipClose: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 1,
  },
  post: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  postDivider: { height: 1, marginHorizontal: 16 },
  postHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingBottom: 0 },
  companionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  companionPillText: { fontSize: 11.5, fontWeight: '600' },
  metaLine: { fontSize: 12.5, marginTop: 2 },
  authorName: { fontSize: 15.5, fontWeight: '700' },
  metaText: { fontSize: 12 },
  postText: { fontSize: 15.5, lineHeight: 23, paddingTop: 10, paddingBottom: 0 },
  postTagRow: { paddingTop: 8 },
  postTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  postTagText: { fontSize: 12, fontWeight: '700' },
  postMedia: { paddingTop: 12 },
  imgGrid2: { flexDirection: 'row', gap: 6 },
  reactionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 4,
    marginTop: 4,
  },
  reactionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, paddingVertical: 6 },
  reactionCount: { fontSize: 13.5, fontWeight: '600' },
  commentPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingBottom: 8,
    marginTop: 2,
  },
  commentUser: { fontWeight: '700', fontSize: 13 },
  viewAll: { fontSize: 12.5, fontWeight: '700', marginTop: 5 },
  audienceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    marginTop: 3,
    alignSelf: 'flex-start',
    maxWidth: 220,
  },
  audienceTxt: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
  destModalCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 16,
    paddingBottom: 20,
    gap: 8,
    maxHeight: `${Math.round(sheetLayout.maxHeightRatio * 100)}%`,
  },
  destModalTitle: { fontSize: 17, fontWeight: '800' },
  destModalSub: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  destModalHint: { fontSize: 12.5, lineHeight: 18, marginTop: 8, textAlign: 'center' },
  composerField: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  composerInput: {
    fontSize: 17,
    lineHeight: 26,
    minHeight: 96,
    marginTop: 12,
    marginBottom: 8,
    textAlignVertical: 'top',
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingLeft: 5,
    paddingRight: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  tagChipText: { fontSize: 13.5, fontWeight: '600' },
  mentionChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  mentionChipText: { fontSize: 13, fontWeight: '700' },
  mentionPick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 160,
  },
  mentionPickIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mentionPickText: { fontSize: 12.5, fontWeight: '600', flexShrink: 1 },
  labelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  labelChipText: { fontSize: 12.5, fontWeight: '600' },
  composerToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 14,
    borderTopWidth: 1,
  },
});
