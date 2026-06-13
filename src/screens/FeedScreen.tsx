import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NavigatorScreenParams } from '@react-navigation/native';
import {
  View, Text, ScrollView, Pressable, TextInput, Image, Modal,
  StyleSheet, FlatList, KeyboardAvoidingView, Platform, Dimensions, Animated, Easing, PanResponder, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { radius, shadows, sheetLayout } from '../theme/tokens';
import { AppLogo } from '../components/ui/AppLogo';
import { Avatar, CompanionAvatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button, IconButton } from '../components/ui/Button';
import { Sheet } from '../components/ui/Sheet';
import { PhotoSlot } from '../components/ui/PhotoSlot';
import { Empty } from '../components/ui/Empty';
import { ComingSoonModal } from '../components/ui/ComingSoonModal';
import { Icon } from '../components/icons/Icon';
import { Toast, ToastData } from '../components/ui/Toast';
import { CompanionMiniSheet, CompanionFullProfile } from '../components/CompanionProfile';
import { usePawCircles } from '../context/PawCircleContext';
import { FeedCircleEntry, PawCircle } from '../data/pawCircles';
import { communities as allCommunities } from '../data/mockData';
import type { CirclesStackParamList } from '../navigation/CirclesNavigator';
import { useTabBarScrollPadding } from '../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../context/TabBarScrollContext';
import { HomeHubDropdown, type HomeHubTab } from '../components/ui/HomeHubDropdown';
import { PostAuthorRow } from '../components/feed/PostAuthorRow';
import { FeedPostCard } from '../components/feed/FeedPostCard';
import { getPostPoster } from '../utils/postAuthor';
import { AdoptionNavigator } from '../navigation/AdoptionNavigator';
import { RescueNavigator } from '../navigation/RescueNavigator';
import { CommunityNavigator } from '../navigation/CommunityNavigator';
import {
  AdoptionChatsHubBar,
  AdoptionHubBar,
  type AdoptionBrowseFilter,
  type AdoptionHubTab,
} from '../components/adoption/AdoptionChrome';
import {
  getAdoptionChatSegmentMeta,
  type ChatSegment,
} from '../components/adoption/AdoptionChatsList';
import { useAdoption } from '../context/AdoptionContext';
import { groupThreads } from '../utils/chatThreadMeta';
import { AdoptionComposerSheet } from '../components/adoption/AdoptionComposerSheet';
import { RescueHubBar, RescueFilterField } from '../components/rescue/RescueChrome';
import { isActiveAdoptionRequest, useAdoptionFeed } from '../context/AdoptionFeedContext';
import { DEFAULT_RESCUE_FILTERS, type RescueFilters, type RescueHubTab } from '../data/rescueData';
import { ForwardSheet, type ForwardDest } from '../components/ForwardSheet';
import { FeedCommentSheet } from '../components/feed/FeedCommentSheet';

import { users, companions, Post } from '../data/mockData';
import { useFeedPosts } from '../context/FeedPostContext';

const LENS_DRAWER_MAX_HEIGHT = Math.min(
  sheetLayout.drawerMaxHeightCap,
  Dimensions.get('window').height * sheetLayout.drawerMaxHeightRatio,
);
const LENS_DRAWER_PAD = 16; // paddingTop 6 + paddingBottom 10
const LENS_DRAWER_TITLE_H = 24;
const LENS_DRAWER_SECTION_GAP = 8;
const LENS_DRAWER_ITEM_H = 52;
const LENS_DRAWER_EMPTY_H = 80;

function computeLensDrawerHeight(
  createdCount: number,
  joinedCount: number,
  isEmpty: boolean,
): number {
  if (isEmpty) return LENS_DRAWER_EMPTY_H;
  let h = LENS_DRAWER_PAD;
  if (createdCount > 0) {
    h += LENS_DRAWER_TITLE_H + createdCount * LENS_DRAWER_ITEM_H;
  }
  if (joinedCount > 0) {
    h += (createdCount > 0 ? LENS_DRAWER_SECTION_GAP : 0) + LENS_DRAWER_TITLE_H + joinedCount * LENS_DRAWER_ITEM_H;
  }
  return h;
}

function clearWebTextSelection() {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.getSelection()?.removeAllRanges();
  }
}

const LENS_ICON_SLOT_H = 36;
const LENS_CHIP_LABEL_H = 16;
const LENS_COL_H = LENS_ICON_SLOT_H + LENS_CHIP_LABEL_H;
const LENS_CIRCLE_BOX_H = 44;
const LENS_MARQUEE_GAP = 8;

const FEED_SHORTCUTS = [
  { id: 'near', label: 'Nearby', icon: 'mapPin', tint: '#6344A8', iconBg: '#EDE8F8' },
  { id: 'tips', label: 'Tips', icon: 'sparkle', tint: '#B87820', iconBg: '#FDF4E4' },
];

const POST_CATEGORIES = [
  { id: 'rescue',     label: 'Rescue',     icon: 'shield',   tint: '#E5424F', iconBg: '#FFE8E8' },
  { id: 'adoption',   label: 'Adoption',   icon: 'adoption', tint: '#E0503F', iconBg: '#FFE8CC' },
  { id: 'lost',       label: 'Lost',       icon: 'alert',    tint: '#E5424F', iconBg: '#FFD4D4' },
  { id: 'found',      label: 'Found',      icon: 'check',    tint: '#2FA46A', iconBg: '#D6F5E8' },
  { id: 'discussion', label: 'Discussion', icon: 'comment',  tint: '#7C5CBF', iconBg: '#F0EBFA' },
  { id: 'meme',       label: 'Meme',       icon: 'sparkle',  tint: '#7A5AE0', iconBg: '#EDE8FC' },
];

const POST_FILTER_CATEGORIES = [
  { id: 'lost-found', label: 'Lost / Found', icon: 'alert',    tint: '#C98E2A', iconBg: '#FDF6E8' },
  { id: 'discussion', label: 'Discussion',   icon: 'comment',  tint: '#7C5CBF', iconBg: '#F0EBFA' },
  { id: 'meme',       label: 'Meme',         icon: 'sparkle',  tint: '#7A5AE0', iconBg: '#EDE8FC' },
];

const FILTER_POPUP_H_PAD = 16;
const FILTER_POPUP_WIDTH = Dimensions.get('window').width - FILTER_POPUP_H_PAD * 2;
const FILTER_CHIP_GAP = 8;
const FILTER_CHIP_MIN_WIDTH = 92;

function pickFilterColumns(count: number, width: number): number {
  const candidates = [3, 2].filter(c => c <= count);
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
    case 'discussion':
      return post.tag === 'discussion'
        || (post.label === null && post.tag !== 'adoption' && post.tag !== 'rescue');
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

type FeedNav = CompositeNavigationProp<
  BottomTabNavigationProp<{ Feed: undefined; Circles: NavigatorScreenParams<CirclesStackParamList> }>,
  NativeStackNavigationProp<CirclesStackParamList>
>;

export function FeedScreen() {
  const { colors, mode, toggleTheme } = useTheme();
  const navigation = useNavigation<FeedNav>();
  const {
    ready: circlesReady,
    feedCreated,
    feedJoined,
    defaultCircleId,
    createdCircles,
    joinedCircles,
  } = usePawCircles();
  const [filter, setFilter] = useState('all');
  const [tipsComingSoonOpen, setTipsComingSoonOpen] = useState(false);
  const [selectedCircle, setSelectedCircle] = useState<string | null>(null);

  useEffect(() => {
    if (!circlesReady) return;
    const allIds = [...feedCreated, ...feedJoined].map(c => c.id);
    setSelectedCircle(prev => {
      if (prev && allIds.includes(prev)) return prev;
      return defaultCircleId;
    });
  }, [circlesReady, feedCreated, feedJoined, defaultCircleId]);
  const [postTypeFilters, setPostTypeFilters] = useState<string[]>([]);
  const [adoptionComposerOpen, setAdoptionComposerOpen] = useState(false);
  const { posts: postList, setPosts: setPostList, toggleSaved, togglePaw, persistForward, pawComment, addComment, openComposer, openCaseFlow } = useFeedPosts();
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const commentPost = useMemo(
    () => (commentPostId ? postList.find(p => p.id === commentPostId) ?? null : null),
    [commentPostId, postList],
  );
  const [selectedCompanionId, setSelectedCompanionId] = useState<string | null>(null);
  const [companionFullOpen, setCompanionFullOpen] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [forwardPost, setForwardPost] = useState<Post | null>(null);
  const [circleDrawerOpen, setCircleDrawerOpen] = useState(false);
  const [homeTab, setHomeTab] = useState<HomeHubTab>('feed');
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
    const grouped = groupThreads(threads, records);
    return [...grouped.action, ...grouped.adoption];
  }, [threads, records]);
  const adoptionChatSegmentMeta = useMemo(
    () => getAdoptionChatSegmentMeta(
      adoptionThreads,
      records,
      adoptionListings,
      adoptionRequests,
    ),
    [adoptionThreads, records, adoptionListings, adoptionRequests],
  );

  useEffect(() => {
    if (adoptionHubTab === 'threads') {
      setAdoptionChatSegment('adopting');
    }
  }, [adoptionHubTab]);
  const [rescueFilters, setRescueFilters] = useState<RescueFilters>(DEFAULT_RESCUE_FILTERS);
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const isFeedFocused = useIsFocused();

  useFocusEffect(
    useCallback(() => () => {
      setSelectedCompanionId(null);
      setCompanionFullOpen(false);
      setCircleDrawerOpen(false);
    }, []),
  );

  const handleFilterChange = useCallback((id: string) => {
    if (id === 'tips') {
      setTipsComingSoonOpen(true);
      return;
    }
    setFilter(id);
  }, []);

  const shown = postList.filter(p => {
    if (p.label === 'adoption' || p.tag === 'adoption') return false;
    if (filter === 'community' && !p.circle) return false;
    if (postTypeFilters.length > 0 && !postTypeFilters.some(type => matchesPostType(p, type))) return false;
    return true;
  });

  const showToast = (t: ToastData) => setToast(t);

  const openCircleChat = (circleId: string) => {
    setCircleDrawerOpen(false);
    navigation.navigate('Circles', {
      screen: 'CircleChat',
      params: { circleId, returnTo: 'Feed' },
    });
  };

  const openUserProfile = useCallback((userId: string) => {
    navigation.navigate('Circles', {
      screen: 'UserProfile',
      params: { userId, returnTo: 'Feed' },
    });
  }, [navigation]);

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

  const completeForward = (dests: ForwardDest[]) => {
    if (!forwardPost || dests.length === 0) return;
    setPostList(ps => ps.map(p => (
      p.id === forwardPost.id ? { ...p, forwards: p.forwards + 1 } : p
    )));
    persistForward(forwardPost.id, dests);
    setForwardPost(null);
    if (dests.length === 1 && dests[0].type === 'circle') {
      openCircleChat(dests[0].id);
    }
    const label = dests.map(d => d.label).join(', ');
    showToast({ msg: `Shared to ${label}`, icon: 'forward', tone: 'success' });
  };

  const feedLensChrome = (
    <View style={styles.feedLensChrome}>
      <ComposerBar
        onOpen={() => openComposer({ initialCategory: 'discussion' })}
        onCategorySelect={cat => {
          if (cat === 'adoption') { setAdoptionComposerOpen(true); return; }
          openComposer({ initialCategory: cat });
        }}
        onOpenCase={openCaseFlow}
        postTypeFilters={postTypeFilters}
        onPostTypeFiltersChange={setPostTypeFilters}
      />
      <CircleFilterRow
        filter={filter}
        selectedCircle={selectedCircle}
        createdCircles={feedCreated}
        joinedCircles={feedJoined}
        drawerOpen={circleDrawerOpen}
        onFilterChange={handleFilterChange}
        onCircleChange={setSelectedCircle}
        onDrawerOpenChange={setCircleDrawerOpen}
        onOpenChat={openCircleChat}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSide}>
          <Logo onPress={homeTab !== 'feed' ? () => setHomeTab('feed') : undefined} />
        </View>
        <HomeHubDropdown
          value={homeTab}
          onChange={tab => setHomeTab(tab)}
        />
        <View style={styles.headerSideEnd}>
          <View style={styles.headerIconCluster}>
            <IconButton
              name={mode === 'dark' ? 'moon' : 'sun'}
              size={42}
              iconSize={20}
              tone="soft"
              color={colors.textSecondary}
              onPress={toggleTheme}
            />
            <View style={styles.headerIconTight}>
              <IconButton name="search" size={42} iconSize={20} tone="soft" color={colors.textSecondary} />
            </View>
            <View style={styles.headerIconTight}>
              <IconButton name="bell" size={42} iconSize={20} tone="soft" color={colors.textSecondary} count={3} />
            </View>
          </View>
        </View>
      </View>

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

      {homeTab === 'feed' && (
        <>
          <FlatList
            style={[styles.feedList, { backgroundColor: colors.bg }]}
            data={shown}
            keyExtractor={p => p.id}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            extraData={circleDrawerOpen}
            ListHeaderComponent={feedLensChrome}
            contentContainerStyle={{ paddingBottom: tabBarPad }}
            showsVerticalScrollIndicator={false}
            {...tabBarScrollProps}
            ItemSeparatorComponent={() => (
              <View style={[styles.postDivider, { backgroundColor: colors.border }]} />
            )}
            renderItem={({ item }) =>
              item.label === 'lost' && item.lost
                ? (
                  <View style={{ paddingHorizontal: 16, marginVertical: 8 }}>
                    <LostCard
                      post={item}
                      pulseActive={isFeedFocused}
                      onToast={showToast}
                      onForward={() => setForwardPost(item)}
                      onUserPress={openUserProfile}
                    />
                  </View>
                )
                : item.label === 'found' && item.found
                ? (
                  <View style={{ paddingHorizontal: 16, marginVertical: 8 }}>
                    <FoundCard
                      post={item}
                      pulseActive={isFeedFocused}
                      onToast={showToast}
                      onForward={() => setForwardPost(item)}
                      onUserPress={openUserProfile}
                    />
                  </View>
                )
                : (
                  <FeedPostCard
                    post={item}
                    onPaw={() => togglePaw(item.id)}
                    onSave={() => handleSave(item.id)}
                    onComments={() => setCommentPostId(item.id)}
                    onForward={() => setForwardPost(item)}
                    onUserPress={openUserProfile}
                    onCompanionPress={(id) => setSelectedCompanionId(id)}
                  />
                )
            }
            ListEmptyComponent={
              <Empty title="Nothing here yet" icon="paw-line">No posts match this filter. Try another.</Empty>
            }
          />
        </>
      )}

      {homeTab === 'community' && (
        <View style={styles.hubContent}>
          <CommunityNavigator embedded />
        </View>
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
          onAuthorPress={openUserProfile}
        />
      )}

      {forwardPost && (
        <ForwardSheet
          visible
          previewAuthorId={forwardPost.author}
          previewText={forwardPost.text}
          createdCircles={createdCircles}
          joinedCircles={joinedCircles}
          joinedCommunities={allCommunities.filter(c => c.joined)}
          onClose={() => setForwardPost(null)}
          onSelect={completeForward}
        />
      )}

      <AdoptionComposerSheet
        visible={adoptionComposerOpen}
        onClose={() => setAdoptionComposerOpen(false)}
        onToast={showToast}
      />

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

      <ComingSoonModal
        visible={tipsComingSoonOpen}
        onClose={() => setTipsComingSoonOpen(false)}
        icon="sparkle"
        body="Pet care tips and expert advice are on the way. Check back soon."
      />

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

// ── Logo ─────────────────────────────────────────────────────────────────────

function Logo({ onPress }: { onPress?: () => void }) {
  const logo = <AppLogo showWordmark />;
  if (!onPress) return logo;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.7 }}>
      {logo}
    </Pressable>
  );
}

// ── CircleFilterRow ───────────────────────────────────────────────────────────

function CircleDrawerItem({
  item,
  onPress,
}: {
  item: FeedCircleEntry;
  onPress: () => void;
}) {
  const { colors, iconBg } = useTheme();
  const filled = item.icon === 'paw' || item.icon === 'adoption' || item.icon === 'cat' || item.icon === 'dog';

  return (
    <Pressable onPress={onPress} style={styles.lensDrawerItem}>
      <View style={[styles.lensDrawerItemIcon, { backgroundColor: iconBg(item.iconBg) }]}>
        <Icon name={item.icon} size={18} color={item.tint} fill={filled ? item.tint : 'none'} />
      </View>
      <Text style={[styles.lensDrawerItemLabel, { color: colors.text }]} numberOfLines={1}>
        {item.label}
      </Text>
    </Pressable>
  );
}

function clampScrollX(x: number, minX: number): number {
  return Math.max(minX, Math.min(0, x));
}

function ShortcutMarquee({
  filter,
  disabled,
  onFilterChange,
  onDismissDrawer,
}: {
  filter: string;
  disabled?: boolean;
  onFilterChange: (id: string) => void;
  onDismissDrawer?: () => void;
}) {
  const { colors, iconBg } = useTheme();
  const scrollX = useRef(new Animated.Value(0)).current;
  const dragStart = useRef(0);
  const minXRef = useRef(0);
  const [viewportW, setViewportW] = useState(0);
  const itemW = viewportW > 0
    ? Math.floor((viewportW - LENS_MARQUEE_GAP * (FEED_SHORTCUTS.length - 1)) / FEED_SHORTCUTS.length)
    : 72;
  const contentW = FEED_SHORTCUTS.length * (itemW + LENS_MARQUEE_GAP);
  const minX = Math.min(0, viewportW - contentW);

  minXRef.current = minX;

  const clampPos = useCallback((x: number) => clampScrollX(x, minXRef.current), []);

  useEffect(() => {
    scrollX.stopAnimation(v => {
      const clamped = clampPos(v);
      scrollX.setValue(clamped);
      dragStart.current = clamped;
    });
  }, [minX, scrollX, clampPos]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        !disabled && Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 5,
      onPanResponderGrant: () => {
        scrollX.stopAnimation(v => {
          dragStart.current = v;
        });
      },
      onPanResponderMove: (_, g) => {
        scrollX.setValue(clampPos(dragStart.current + g.dx));
      },
      onPanResponderRelease: (_, g) => {
        const releasePos = clampPos(dragStart.current + g.dx);
        scrollX.setValue(releasePos);
        dragStart.current = releasePos;

        if (Math.abs(g.vx) > 0.08) {
          Animated.decay(scrollX, {
            velocity: g.vx,
            deceleration: 0.997,
            useNativeDriver: true,
          }).start(() => {
            scrollX.stopAnimation(v => {
              const clamped = clampPos(v);
              scrollX.setValue(clamped);
              dragStart.current = clamped;
            });
          });
        }
      },
      onPanResponderTerminate: () => {
        scrollX.stopAnimation(v => {
          const clamped = clampPos(v);
          scrollX.setValue(clamped);
          dragStart.current = clamped;
        });
      },
    }),
  ).current;

  return (
    <View style={styles.lensMarqueeZone} {...panResponder.panHandlers}>
      <View
        style={styles.lensMarqueeClip}
        onLayout={e => setViewportW(e.nativeEvent.layout.width)}
      >
        <Animated.View
          style={[styles.lensMarqueeStrip, { transform: [{ translateX: scrollX }] }]}
        >
          {FEED_SHORTCUTS.map((item, index) => {
            const active = filter === item.id;
            return (
              <Pressable
                key={`${item.id}-${index}`}
                onPress={() => {
                  onDismissDrawer?.();
                  onFilterChange(active ? 'all' : item.id);
                }}
                style={[
                  styles.lensMarqueeItem,
                  { width: itemW, marginRight: index < FEED_SHORTCUTS.length - 1 ? LENS_MARQUEE_GAP : 0 },
                ]}
              >
                <View pointerEvents="none" style={styles.lensShortcutInner}>
                  <View style={styles.lensIconSlot}>
                    <View style={[styles.lensChipRing, active && { borderColor: item.tint }]}>
                      <View style={[styles.lensChipIcon, { backgroundColor: iconBg(item.iconBg) }]}>
                        <Icon name={item.icon} size={16} color={item.tint} sw={2.2} />
                      </View>
                    </View>
                  </View>
                  <Text
                    selectable={false}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[
                      styles.lensChipLabel,
                      { color: active ? colors.text : colors.textSecondary },
                      active && { fontWeight: '700' },
                    ]}
                  >
                    {item.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </Animated.View>
      </View>
    </View>
  );
}

function CircleFilterRow({
  filter,
  selectedCircle,
  createdCircles,
  joinedCircles,
  drawerOpen,
  onFilterChange,
  onCircleChange,
  onDrawerOpenChange,
  onOpenChat,
}: {
  filter: string;
  selectedCircle: string | null;
  createdCircles: FeedCircleEntry[];
  joinedCircles: FeedCircleEntry[];
  drawerOpen: boolean;
  onFilterChange: (id: string) => void;
  onCircleChange: (id: string) => void;
  onDrawerOpenChange: (open: boolean) => void;
  onOpenChat: (circleId: string) => void;
}) {
  const { colors, iconBg, isDark } = useTheme();
  const drawerSlideY = useRef(new Animated.Value(0)).current;
  const [drawerMounted, setDrawerMounted] = useState(false);
  const drawerScrollY = useRef(0);
  const drawerOpenRef = useRef(drawerOpen);
  const drawerScrollsRef = useRef(false);
  const drawerHeightRef = useRef(0);
  const onDrawerOpenChangeRef = useRef(onDrawerOpenChange);
  drawerOpenRef.current = drawerOpen;
  onDrawerOpenChangeRef.current = onDrawerOpenChange;
  const allCircles = [...createdCircles, ...joinedCircles];
  const hasCircles = allCircles.length > 0;

  const activeCircle = selectedCircle
    ? allCircles.find(c => c.id === selectedCircle) ?? createdCircles[0] ?? joinedCircles[0]
    : undefined;
  const myCircleLabel = activeCircle?.label ?? 'My Circle';

  const contentHeight = computeLensDrawerHeight(
    createdCircles.length,
    joinedCircles.length,
    !hasCircles,
  );
  const drawerTargetHeight = Math.min(contentHeight, LENS_DRAWER_MAX_HEIGHT);
  const drawerScrolls = contentHeight > LENS_DRAWER_MAX_HEIGHT;
  drawerScrollsRef.current = drawerScrolls;
  drawerHeightRef.current = drawerTargetHeight;

  const snapDrawerOpen = useCallback((velocity = 0) => {
    Animated.spring(drawerSlideY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 14,
      velocity: Math.max(0, velocity),
    }).start();
  }, [drawerSlideY]);

  const drawerPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) => {
        if (!drawerOpenRef.current) return false;
        const downward = g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx) * 1.05;
        if (!downward) return false;
        if (!drawerScrollsRef.current) return true;
        return drawerScrollY.current <= 1;
      },
      onPanResponderGrant: () => {
        drawerSlideY.stopAnimation(value => {
          drawerSlideY.setOffset(value);
          drawerSlideY.setValue(0);
        });
      },
      onPanResponderMove: (_, g) => {
        drawerSlideY.setValue(Math.max(0, g.dy));
      },
      onPanResponderRelease: (_, g) => {
        drawerSlideY.flattenOffset();
        if (g.dy > 48 || g.vy > 0.6) {
          onDrawerOpenChangeRef.current(false);
        } else {
          snapDrawerOpen(g.vy);
        }
      },
      onPanResponderTerminate: () => {
        drawerSlideY.flattenOffset();
        snapDrawerOpen();
      },
    }),
  ).current;

  useEffect(() => {
    if (drawerOpen) {
      setDrawerMounted(true);
      drawerSlideY.stopAnimation();
      drawerSlideY.setValue(drawerTargetHeight);
      Animated.spring(drawerSlideY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 72,
        friction: 13,
      }).start();
      return;
    }

    if (!drawerMounted) return;

    drawerSlideY.stopAnimation(value => {
      if (value >= drawerTargetHeight * 0.92) {
        setDrawerMounted(false);
        return;
      }
      Animated.timing(drawerSlideY, {
        toValue: drawerTargetHeight,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setDrawerMounted(false);
      });
    });
  }, [drawerOpen, drawerTargetHeight, drawerMounted, drawerSlideY]);

  useEffect(() => {
    if (!drawerOpen) drawerScrollY.current = 0;
  }, [drawerOpen]);

  const handleChipPress = () => {
    if (activeCircle) {
      onOpenChat(activeCircle.id);
    } else {
      onDrawerOpenChange(!drawerOpen);
    }
  };

  const selectCircle = (id: string) => {
    onCircleChange(id);
    onDrawerOpenChange(false);
    onOpenChat(id);
  };

  return (
    <View style={styles.lensWrapper}>
      <View style={styles.lensBarRow}>
        <View
          style={[
            styles.lensMyCircle,
            {
              backgroundColor: 'transparent',
              borderWidth: 0,
              height: LENS_CIRCLE_BOX_H,
            },
          ]}
        >
          <Pressable
            onPress={() => {
              clearWebTextSelection();
              handleChipPress();
            }}
            style={styles.lensChipMain}
          >
            {activeCircle ? (
              <View style={[styles.lensIcon, { backgroundColor: isDark ? 'transparent' : iconBg(activeCircle.iconBg) }]}>
                <Icon
                  name={activeCircle.icon}
                  size={16}
                  color={activeCircle.tint}
                  fill={activeCircle.icon === 'paw' || activeCircle.icon === 'cat' || activeCircle.icon === 'dog' || activeCircle.icon === 'adoption' ? activeCircle.tint : 'none'}
                />
              </View>
            ) : (
              <LinearGradient
                colors={[colors.primaryLight, colors.primary, colors.primaryDark]}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.lensIcon}
              >
                <Icon name="paw" size={16} color="#fff" fill="#fff" />
              </LinearGradient>
            )}
            <Text
              selectable={false}
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.lensTitle, { color: colors.text }]}
              {...(Platform.OS === 'web' ? { title: myCircleLabel } : {})}
            >
              {myCircleLabel}
            </Text>
          </Pressable>
          {hasCircles && (
            <Pressable
              onPress={() => {
                clearWebTextSelection();
                onDrawerOpenChange(!drawerOpen);
              }}
              hitSlop={6}
              style={styles.lensChipSwitch}
            >
              <View style={drawerOpen ? { transform: [{ rotate: '180deg' }] } : undefined}>
                <Icon name="chevronDown" size={13} color={colors.textSecondary} />
              </View>
            </Pressable>
          )}
        </View>

        <View style={styles.lensShortcutRow}>
          {FEED_SHORTCUTS.map(item => {
            const active = filter === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  if (drawerOpen) onDrawerOpenChange(false);
                  onFilterChange(active ? 'all' : item.id);
                }}
                style={({ pressed }) => [
                  styles.lensShortcutChip,
                  {
                    backgroundColor: active ? item.tint + '18' : 'transparent',
                    borderWidth: 0,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={[styles.lensShortcutIcon, { backgroundColor: isDark ? 'transparent' : iconBg(item.iconBg) }]}>
                  <Icon name={item.icon} size={14} color={item.tint} sw={2.2} />
                </View>
                <Text
                  selectable={false}
                  numberOfLines={1}
                  style={[
                    styles.lensShortcutLabel,
                    { color: active ? colors.text : colors.textSecondary },
                    active && { fontWeight: '700' },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {drawerMounted && (
        <View
          style={[
            styles.lensDrawer,
            {
              height: drawerTargetHeight,
              borderTopColor: colors.border,
              borderTopWidth: 0,
            },
          ]}
        >
          <Animated.View
            pointerEvents={drawerOpen ? 'box-none' : 'none'}
            style={{
              height: drawerTargetHeight,
              transform: [{ translateY: drawerSlideY }],
              opacity: drawerSlideY.interpolate({
                inputRange: [0, drawerTargetHeight * 0.65, drawerTargetHeight],
                outputRange: [1, 0.75, 0],
                extrapolate: 'clamp',
              }),
            }}
            {...drawerPanResponder.panHandlers}
          >
            <ScrollView
              nestedScrollEnabled
              scrollEnabled={drawerOpen && drawerScrolls}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={[styles.lensDrawerScrollView, Platform.OS === 'web' && styles.lensDrawerScrollWeb]}
              contentContainerStyle={styles.lensDrawerScroll}
              onScroll={e => { drawerScrollY.current = e.nativeEvent.contentOffset.y; }}
              onScrollEndDrag={e => {
                const { contentOffset, velocity } = e.nativeEvent;
                if (contentOffset.y < -36 || (contentOffset.y <= 0 && (velocity?.y ?? 0) < -0.85)) {
                  onDrawerOpenChange(false);
                }
              }}
              scrollEventThrottle={16}
              bounces
              alwaysBounceVertical
            >
              {!hasCircles ? (
                <Text style={[styles.lensDrawerEmpty, { color: colors.textSecondary }]}>
                  You aren't in any circle yet. Create or explore from Paw Circle.
                </Text>
              ) : (
                <>
                  {createdCircles.length > 0 && (
                    <>
                      <Text style={[styles.lensDrawerTitle, { color: colors.text }]}>My Circle</Text>
                      {createdCircles.map(item => (
                        <CircleDrawerItem
                          key={item.id}
                          item={item}
                          onPress={() => selectCircle(item.id)}
                        />
                      ))}
                    </>
                  )}

                  {joinedCircles.length > 0 && (
                    <>
                      <Text style={[
                        styles.lensDrawerTitle,
                        createdCircles.length > 0 && styles.lensDrawerTitleSpaced,
                        { color: colors.text },
                      ]}>
                        Joined Circle
                      </Text>
                      {joinedCircles.map(item => (
                        <CircleDrawerItem
                          key={item.id}
                          item={item}
                          onPress={() => selectCircle(item.id)}
                        />
                      ))}
                    </>
                  )}
                </>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

// ── ComposerBar ───────────────────────────────────────────────────────────────

function ComposerBar({
  onOpen,
  onCategorySelect,
  onOpenCase,
  postTypeFilters,
  onPostTypeFiltersChange,
}: {
  onOpen: () => void;
  onCategorySelect: (category: string) => void;
  onOpenCase: () => void;
  postTypeFilters: string[];
  onPostTypeFiltersChange: (ids: string[]) => void;
}) {
  const { colors, isDark } = useTheme();
  const plusRef = useRef<View>(null);
  const filterRef = useRef<View>(null);
  const [categoryPopupOpen, setCategoryPopupOpen] = useState(false);
  const [filterPopupOpen, setFilterPopupOpen] = useState(false);
  const [categoryAnchor, setCategoryAnchor] = useState({ x: 16, top: 100 });
  const [filterAnchor, setFilterAnchor] = useState({ x: FILTER_POPUP_H_PAD, top: 100 });

  const openCategoryPopup = () => {
    setFilterPopupOpen(false);
    plusRef.current?.measureInWindow((x, y, _w, height) => {
      setCategoryAnchor({ x, top: y + height + 6 });
      setCategoryPopupOpen(true);
    });
  };

  const openFilterPopup = () => {
    clearWebTextSelection();
    setCategoryPopupOpen(false);
    filterRef.current?.measureInWindow((_x, y, _w, height) => {
      setFilterAnchor({ x: FILTER_POPUP_H_PAD, top: y + height + 6 });
      setFilterPopupOpen(prev => !prev);
    });
  };

  useFocusEffect(useCallback(() => () => {
    setCategoryPopupOpen(false);
    setFilterPopupOpen(false);
  }, []));

  const togglePostTypeFilter = (id: string) => {
    if (id === 'lost-found') {
      const withoutLostFound = postTypeFilters.filter(f => f !== 'lost' && f !== 'found' && f !== 'lost-found');
      onPostTypeFiltersChange(
        postTypeFilters.some(f => f === 'lost' || f === 'found' || f === 'lost-found')
          ? withoutLostFound
          : [...withoutLostFound, 'lost-found'],
      );
      return;
    }
    onPostTypeFiltersChange(
      postTypeFilters.includes(id)
        ? postTypeFilters.filter(f => f !== id)
        : [...postTypeFilters, id],
    );
  };

  const openComposerFromBar = () => {
    Keyboard.dismiss();
    onOpen();
  };

  return (
    <View style={styles.composerRow}>
      <View style={[styles.composerBar, { backgroundColor: 'transparent' }]}>
        <Pressable
          ref={plusRef}
          onPress={openCategoryPopup}
          style={[styles.composerPlusBtn, { backgroundColor: isDark ? 'transparent' : colors.surface2 }]}
        >
          <Icon name="plus" size={17} color={colors.textSecondary} />
        </Pressable>
        <Pressable
          onPress={openComposerFromBar}
          accessibilityRole="button"
          accessibilityLabel="New post"
          style={styles.composerInputArea}
        >
          <Text style={[styles.composerPlaceholder, { color: colors.textTertiary }]}>New post</Text>
        </Pressable>
      </View>

      <Pressable
        ref={filterRef}
        delayPressIn={0}
        onPress={openFilterPopup}
        style={[
          styles.composerFilterBtn,
          {
            backgroundColor: 'transparent',
            borderWidth: 0,
          },
        ]}
      >
        <Icon
          name="sliders"
          size={22}
          color={postTypeFilters.length > 0 ? colors.primary : colors.textSecondary}
        />
      </Pressable>

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

      <PostTypeFilterPopup
        visible={filterPopupOpen}
        anchor={filterAnchor}
        selected={postTypeFilters}
        onClose={() => setFilterPopupOpen(false)}
        onToggle={togglePostTypeFilter}
        onClear={() => onPostTypeFiltersChange([])}
      />
    </View>
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
  const { colors, scrim, iconBg } = useTheme();
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
      <View style={styles.popupOverlay}>
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: scrim },
          ]}
        />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
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
            <Text style={[styles.filterPopupTitle, { color: colors.text }]}>Filter posts</Text>
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
                        fill={item.icon === 'adoption' || item.icon === 'check' ? (isSelected ? item.tint : colors.textSecondary) : 'none'}
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
      </View>
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
  anchor: { x: number; top: number };
  onClose: () => void;
  onSelect: (id: string) => void;
  onOpenCase: () => void;
}) {
  const { colors, scrim, iconBg } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.popupOverlay}>
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: scrim },
          ]}
        />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
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
          <View style={styles.popupCaretRow}>
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
      </View>
    </Modal>
  );
}

// ── LostCard ──────────────────────────────────────────────────────────────────

const PULSE_RING_DURATION = 2400;

function createPulseLoop(anim: Animated.Value) {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 1,
        duration: PULSE_RING_DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
        isInteraction: false,
      }),
      Animated.timing(anim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
        isInteraction: false,
      }),
    ]),
  );
}

function PulseBeacon({
  size = 22,
  ringColor = 'rgba(255,255,255,0.45)',
  icon = 'alert',
  active = true,
}: {
  size?: number;
  ringColor?: string;
  icon?: string;
  active?: boolean;
}) {
  const pulseA = useRef(new Animated.Value(0)).current;
  const pulseB = useRef(new Animated.Value(0)).current;
  const pulseC = useRef(new Animated.Value(0)).current;
  const loopsRef = useRef<Animated.CompositeAnimation[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const anims = [pulseA, pulseB, pulseC];
    const stopAll = () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      loopsRef.current.forEach(loop => loop.stop());
      loopsRef.current = [];
      anims.forEach(anim => {
        anim.stopAnimation();
        anim.setValue(0);
      });
    };

    if (!active) {
      stopAll();
      return;
    }

    const stagger = PULSE_RING_DURATION / 3;
    anims.forEach((anim, index) => {
      anim.setValue(0);
      const loop = createPulseLoop(anim);
      loopsRef.current.push(loop);
      const timer = setTimeout(() => loop.start(), index * stagger);
      timersRef.current.push(timer);
    });

    return stopAll;
  }, [active, pulseA, pulseB, pulseC]);

  const ringAnim = (anim: Animated.Value) => ({
    opacity: anim.interpolate({
      inputRange: [0, 0.12, 0.38, 0.68, 1],
      outputRange: [0, 0.65, 0.75, 0.3, 0],
      extrapolate: 'clamp',
    }),
    transform: [{
      scale: anim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 2.5],
        extrapolate: 'clamp',
      }),
    }],
  });

  return (
    <View style={[styles.pulseWrap, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.pulseRing,
          { borderColor: ringColor, borderRadius: size * 0.68 },
          ringAnim(pulseA),
        ]}
      />
      <Animated.View
        style={[
          styles.pulseRing,
          { borderColor: ringColor, borderRadius: size * 0.68 },
          ringAnim(pulseB),
        ]}
      />
      <Animated.View
        style={[
          styles.pulseRing,
          { borderColor: ringColor, borderRadius: size * 0.68 },
          ringAnim(pulseC),
        ]}
      />
      <Icon name={icon} size={18} color="#fff" />
    </View>
  );
}

function LostCard({ post, pulseActive, onToast, onForward, onUserPress }: {
  post: Post;
  pulseActive?: boolean;
  onToast: (t: ToastData) => void;
  onForward: () => void;
  onUserPress: (userId: string) => void;
}) {
  const { colors } = useTheme();
  const lost = post.lost!;
  const [saved, setSaved] = useState(false);

  return (
    <View style={[styles.lostCard, { backgroundColor: colors.surface, borderColor: colors.danger }]}>
      {/* urgent strip */}
      <View style={[styles.lostStrip, { backgroundColor: colors.danger }]}>
        <PulseBeacon active={pulseActive} />
        <Text style={styles.lostStripText}>Lost</Text>
        <View style={{ flex: 1 }} />
        <Badge tone="neutral" icon="mapPin">Nearby</Badge>
      </View>

      <View style={{ padding: 14 }}>
        {/* Author row */}
        <View style={styles.postHeader}>
          <PostAuthorRow
            post={post}
            size={42}
            metaSuffix="posted an alert"
            onUserPress={onUserPress}
          />
        </View>

        <Text style={[styles.postText, { color: colors.text, marginTop: 12, paddingHorizontal: 0 }]}>{post.text}</Text>

        {/* Photo + details */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <PhotoSlot height={130} imageKey={`lost-${post.id}`} label="" style={{ width: 120 }} />
          <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
            <AlertDetailRow icon="mapPin" label="Last seen" value={lost.area} accent={colors.danger} />
            <AlertDetailRow icon="clock" label="When" value={lost.lastSeen} accent={colors.danger} />
            {lost.phone ? <AlertDetailRow icon="phone" label="Contact" value={lost.phone} accent={colors.danger} /> : null}
          </View>
        </View>

        {/* Actions */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          <Button variant="danger" icon="message" full onPress={() => onToast({ msg: 'Opening chat…', icon: 'message', tone: 'danger' })}>
            Message owner
          </Button>
          <IconButton name="forward" size={44} tone="soft" onPress={onForward} />
          <IconButton name="bookmark" size={44} tone="soft"
            onPress={() => { setSaved(s => !s); onToast({ msg: saved ? 'Removed' : 'Saved alert', icon: 'bookmark', tone: 'primary' }); }} />
        </View>

        <View style={styles.lostFooter}>
          <Icon name="forward" size={13} color={colors.textSecondary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>{post.forwards} forwards · 100 alerted nearby</Text>
        </View>
      </View>
    </View>
  );
}

function AlertDetailRow({ icon, label, value, accent }: {
  icon: string; label: string; value: string; accent: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Icon name={icon} size={16} color={accent} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 10.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, color: colors.textTertiary }}>{label}</Text>
        <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.text }} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

function FoundCard({ post, pulseActive, onToast, onForward, onUserPress }: {
  post: Post;
  pulseActive?: boolean;
  onToast: (t: ToastData) => void;
  onForward: () => void;
  onUserPress: (userId: string) => void;
}) {
  const { colors } = useTheme();
  const found = post.found!;
  const [saved, setSaved] = useState(false);
  const accent = colors.success;

  return (
    <View style={[styles.foundCard, { backgroundColor: colors.surface, borderColor: accent }]}>
      <View style={[styles.foundStrip, { backgroundColor: accent }]}>
        <PulseBeacon active={pulseActive} icon="check" />
        <Text style={styles.foundStripText}>Found</Text>
        <View style={{ flex: 1 }} />
        <Badge tone="neutral" icon="mapPin">Nearby</Badge>
      </View>

      <View style={{ padding: 14 }}>
        <View style={styles.postHeader}>
          <PostAuthorRow
            post={post}
            size={42}
            metaSuffix="posted a sighting"
            onUserPress={onUserPress}
          />
        </View>

        <Text style={[styles.postText, { color: colors.text, marginTop: 12, paddingHorizontal: 0 }]}>{post.text}</Text>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <PhotoSlot height={130} imageKey={`found-${post.id}`} label="" style={{ width: 120 }} />
          <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
            <AlertDetailRow icon="mapPin" label="Found at" value={found.area} accent={accent} />
            <AlertDetailRow icon="clock" label="When" value={found.foundAt} accent={accent} />
            {found.looksLike ? (
              <AlertDetailRow icon="paw" label="Looks like" value={found.looksLike} accent={accent} />
            ) : null}
            {found.phone ? (
              <AlertDetailRow icon="phone" label="Contact" value={found.phone} accent={accent} />
            ) : null}
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          <Pressable
            onPress={() => onToast({ msg: 'Opening chat…', icon: 'message', tone: 'success' })}
            style={({ pressed }) => [
              styles.foundActionBtn,
              { backgroundColor: accent },
              pressed && { opacity: 0.88 },
            ]}
          >
            <Icon name="message" size={15} color="#fff" />
            <Text style={styles.foundActionBtnText}>Message finder</Text>
          </Pressable>
          <IconButton name="forward" size={44} tone="soft" onPress={onForward} />
          <IconButton
            name="bookmark"
            size={44}
            tone="soft"
            onPress={() => {
              setSaved(s => !s);
              onToast({ msg: saved ? 'Removed' : 'Saved sighting', icon: 'bookmark', tone: 'primary' });
            }}
          />
        </View>

        <View style={styles.foundFooter}>
          <Icon name="forward" size={13} color={colors.textSecondary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {post.forwards} forwards · shared with local circles
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  hubContent: { flex: 1, minHeight: 0 },
  subHubChrome: {
    flexShrink: 0,
  },
  feedLensChrome: {
    paddingHorizontal: 16,
    paddingTop: 6,
    gap: 6,
    ...Platform.select({
      web: { userSelect: 'none' },
      default: {},
    }),
  },
  feedList: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  headerSideEnd: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 0,
  },
  headerIconCluster: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconTight: {
    marginLeft: -12,
  },
  lensWrapper: {
    marginTop: 0,
    marginBottom: 0,
    overflow: 'hidden',
  },
  lensBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  lensShortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  lensShortcutChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.full,
    ...Platform.select({
      web: { cursor: 'pointer', userSelect: 'none' },
      default: {},
    }),
  },
  lensShortcutIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lensShortcutLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  lensMarqueeZone: {
    width: '100%',
    height: LENS_COL_H,
    justifyContent: 'center',
    ...Platform.select({
      web: { touchAction: 'pan-y', cursor: 'grab' } as object,
      default: {},
    }),
  },
  lensMarqueeClip: {
    flex: 1,
    overflow: 'hidden',
  },
  lensMarqueeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: LENS_COL_H,
  },
  lensMarqueeItem: {
    alignItems: 'center',
    ...Platform.select({
      web: { cursor: 'pointer', userSelect: 'none' },
      default: {},
    }),
  },
  lensIconSlot: {
    height: LENS_ICON_SLOT_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lensDrawer: {
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  lensDrawerScrollView: {
    flex: 1,
  },
  lensDrawerScrollWeb: {
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
  } as object,
  lensDrawerScroll: {
    paddingTop: 6,
    paddingBottom: 10,
  },
  lensDrawerTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    paddingBottom: 6,
    opacity: 0.55,
  },
  lensDrawerTitleSpaced: { marginTop: 8 },
  lensDrawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderRadius: radius.sm,
  },
  lensDrawerItemIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lensDrawerItemLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  lensMyCircle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    paddingLeft: 10,
    paddingRight: 4,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  lensChipMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
    ...Platform.select({
      web: { cursor: 'pointer', userSelect: 'none' },
      default: {},
    }),
  },
  lensChipSwitch: {
    paddingHorizontal: 6,
    height: LENS_CIRCLE_BOX_H,
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
      default: {},
    }),
  },
  lensIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  lensTitle: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    lineHeight: 16,
    flexShrink: 1,
    minWidth: 0,
    ...Platform.select({
      web: { userSelect: 'none' },
      default: {},
    }),
  },
  lensDrawerEmpty: {
    fontSize: 13,
    lineHeight: 19,
    paddingVertical: 8,
  },
  lensShortcutInner: {
    alignItems: 'center',
    width: '100%',
  },
  lensChipRing: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 1,
  },
  lensChipIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lensChipLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 13,
    marginTop: 3,
    width: '100%',
    flexShrink: 1,
    ...Platform.select({
      web: { userSelect: 'none' },
      default: {},
    }),
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
    marginBottom: 4,
    ...Platform.select({
      web: { userSelect: 'none' },
      default: {},
    }),
  },
  composerBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.full,
    paddingVertical: 5,
    paddingLeft: 6,
    paddingRight: 14,
  },
  composerPlusBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerInputArea: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  composerPlaceholder: { fontSize: 15, fontWeight: '500' },
  composerFilterBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer', userSelect: 'none' },
      default: {},
    }),
  },
  categoryPopupCard: {
    position: 'absolute',
    width: 248,
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
  lostCard: { borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1.5, ...shadows.sm },
  lostStrip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9 },
  lostStripText: { color: '#fff', fontWeight: '700', fontSize: 13.5, letterSpacing: 0.1 },
  foundCard: { borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1.5, ...shadows.sm },
  foundStrip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9 },
  foundStripText: { color: '#fff', fontWeight: '700', fontSize: 13.5, letterSpacing: 0.1 },
  foundActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: radius.full,
  },
  foundActionBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  foundFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 10 },
  pulseWrap: {
    position: 'relative',
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  pulseRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderWidth: 2,
  },
  lostFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 10 },
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
