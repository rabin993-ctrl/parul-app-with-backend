import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NavigatorScreenParams } from '@react-navigation/native';
import {
  View, Text, ScrollView, Pressable, TextInput, Image, Modal,
  StyleSheet, FlatList, KeyboardAvoidingView, Platform, Dimensions, Animated, Easing, PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { radius, shadows } from '../theme/tokens';
import { AppLogo } from '../components/ui/AppLogo';
import { Avatar, CompanionAvatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button, IconButton } from '../components/ui/Button';
import { Sheet } from '../components/ui/Sheet';
import { PhotoSlot } from '../components/ui/PhotoSlot';
import { Empty } from '../components/ui/Empty';
import { Icon } from '../components/icons/Icon';
import { Toast, ToastData } from '../components/ui/Toast';
import { CompanionMiniSheet, CompanionFullProfile } from '../components/CompanionProfile';
import { usePawCircles } from '../context/PawCircleContext';
import { FeedCircleEntry, PawCircle } from '../data/pawCircles';
import { getCircleMembers, getMentionableCircles } from '../data/pawCircleChat';
import { communities as allCommunities } from '../data/mockData';
import type { CirclesStackParamList } from '../navigation/CirclesNavigator';
import { useTabBarScrollPadding } from '../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../context/TabBarScrollContext';
import { FeedHubToggle } from '../components/ui/FeedHubToggle';
import { PostAuthorRow } from '../components/feed/PostAuthorRow';
import { getPostPoster } from '../utils/postAuthor';
import { CommunityNavigator } from '../navigation/CommunityNavigator';
import { AdoptionNavigator } from '../navigation/AdoptionNavigator';
import {
  MentionPicker, insertMentionToken, shouldOpenMentionPicker,
} from '../components/MentionPicker';

const HOME_HUB_TABS = [
  { id: 'feed', label: 'Feed' },
  { id: 'community', label: 'Community' },
  { id: 'adoption', label: 'Adoption' },
] as const;
type HomeHubTab = (typeof HOME_HUB_TABS)[number]['id'];
import { users, companions, Post, PostTag } from '../data/mockData';
import { useFeedPosts } from '../context/FeedPostContext';

const LENS_DRAWER_MAX_HEIGHT = Math.min(320, Dimensions.get('window').height * 0.45);
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

const LENS_ICON_SLOT_H = 44;
const LENS_CHIP_LABEL_H = 18; // marginTop 4 + lineHeight 14
const LENS_COL_H = LENS_ICON_SLOT_H + LENS_CHIP_LABEL_H;
const LENS_CIRCLE_BOX_W = 172;
const LENS_CIRCLE_BOX_H = 52;
const LENS_MARQUEE_ITEM_W = 60;
const LENS_MARQUEE_GAP = 12;

const FEED_SHORTCUTS = [
  { id: 'near',       label: 'Nearby',    icon: 'mapPin',      tint: '#6344A8', iconBg: '#EDE8F8' },
  { id: 'community',  label: 'Community', icon: 'communities', tint: '#7C5CBF', iconBg: '#F0EBFA' },
  { id: 'tips',       label: 'Tips',      icon: 'sparkle',     tint: '#B87820', iconBg: '#FDF4E4' },
];

const POST_CATEGORIES = [
  { id: 'rescue',     label: 'Rescue',     icon: 'shield',   tint: '#E5424F', iconBg: '#FFE8E8' },
  { id: 'adoption',   label: 'Adoption',   icon: 'adoption', tint: '#E0503F', iconBg: '#FFE8CC' },
  { id: 'lost',       label: 'Lost',       icon: 'alert',    tint: '#E5424F', iconBg: '#FFD4D4' },
  { id: 'found',      label: 'Found',      icon: 'check',    tint: '#2FA46A', iconBg: '#D6F5E8' },
  { id: 'discussion', label: 'Discussion', icon: 'comment',  tint: '#7C5CBF', iconBg: '#F0EBFA' },
  { id: 'meme',       label: 'Meme',       icon: 'sparkle',  tint: '#7A5AE0', iconBg: '#EDE8FC' },
];

function resolvePostTagKey(post: Post): PostTag {
  if (post.companionAuthorId || post.tag === 'paw-posting') return 'paw-posting';
  if (post.tag) return post.tag;
  if (post.label === 'adoption') return 'adoption';
  if (post.label === 'lost' || post.label === 'found') return 'lost-found';
  if (post.label === 'rescue') return 'rescue';
  return 'discussion';
}

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
    case 'lost':
      return post.label === 'lost';
    case 'found':
      return post.label === 'found';
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
  const { colors } = useTheme();
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
  const { posts: postList, setPosts: setPostList, openComposer } = useFeedPosts();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedCompanionId, setSelectedCompanionId] = useState<string | null>(null);
  const [companionFullOpen, setCompanionFullOpen] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [forwardPost, setForwardPost] = useState<Post | null>(null);
  const [circleDrawerOpen, setCircleDrawerOpen] = useState(false);
  const [homeTab, setHomeTab] = useState<HomeHubTab>('feed');
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const isFeedFocused = useIsFocused();

  useFocusEffect(
    useCallback(() => () => {
      setSelectedPost(null);
      setSelectedCompanionId(null);
      setCompanionFullOpen(false);
      setCircleDrawerOpen(false);
      setForwardPost(null);
    }, []),
  );

  const shown = filter === 'tips'
    ? []
    : postList.filter(p => {
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

  const togglePaw = (id: string) => {
    setPostList(ps => ps.map(p => p.id === id
      ? { ...p, reacted: !p.reacted, paws: p.reacted ? p.paws - 1 : p.paws + 1 }
      : p));
  };

  const toggleSave = (id: string, wasSaved: boolean) => {
    setPostList(ps => ps.map(p => p.id === id ? { ...p, saved: !p.saved } : p));
    showToast({ msg: wasSaved ? 'Removed from saved' : 'Saved to your collection', icon: 'bookmark', tone: 'primary' });
  };

  const completeForward = (
    dest: { type: 'circle' | 'community' | 'member'; id: string; label: string },
  ) => {
    if (!forwardPost) return;
    setPostList(ps => ps.map(p => (
      p.id === forwardPost.id ? { ...p, forwards: p.forwards + 1 } : p
    )));
    setForwardPost(null);
    if (dest.type === 'circle') {
      showToast({ msg: `Shared to ${dest.label}`, icon: 'forward', tone: 'success' });
      openCircleChat(dest.id);
    } else if (dest.type === 'community') {
      showToast({ msg: `Shared to ${dest.label}`, icon: 'communities', tone: 'success' });
    } else {
      showToast({ msg: `Shared with ${dest.label}`, icon: 'forward', tone: 'primary' });
    }
  };

  const feedChrome = (
    <View style={styles.feedChrome}>
      <ComposerBar
        onOpen={() => openComposer()}
        onCategorySelect={cat => openComposer({ initialCategory: cat })}
        postTypeFilters={postTypeFilters}
        onPostTypeFiltersChange={setPostTypeFilters}
      />
      <CircleFilterRow
        filter={filter}
        selectedCircle={selectedCircle}
        createdCircles={feedCreated}
        joinedCircles={feedJoined}
        drawerOpen={circleDrawerOpen}
        onFilterChange={setFilter}
        onCircleChange={setSelectedCircle}
        onDrawerOpenChange={setCircleDrawerOpen}
        onOpenChat={openCircleChat}
      />
      <View style={styles.hubToggleWrap}>
        <FeedHubToggle
          items={[...HOME_HUB_TABS]}
          value={homeTab}
          onChange={id => setHomeTab(id as HomeHubTab)}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Logo />
        <View style={{ flex: 1 }} />
        <IconButton name="search" size={40} tone="soft" color={colors.textSecondary} />
        <IconButton name="bell" size={40} tone="soft" color={colors.textSecondary} count={3} />
      </View>

      {homeTab === 'feed' && (
        <>
          <FlatList
            style={[styles.feedList, { backgroundColor: colors.bg }]}
            data={shown}
            keyExtractor={p => p.id}
            nestedScrollEnabled
            extraData={circleDrawerOpen}
            ListHeaderComponent={feedChrome}
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
                    />
                  </View>
                )
                : (
                  <PostCard
                    post={item}
                    onPaw={() => togglePaw(item.id)}
                    onSave={() => toggleSave(item.id, item.saved)}
                    onComments={() => setSelectedPost(item)}
                    onForward={() => setForwardPost(item)}
                    onCompanionPress={(id) => setSelectedCompanionId(id)}
                    onToast={showToast}
                  />
                )
            }
            ListEmptyComponent={
              filter === 'tips'
                ? <Empty title="Coming Soon" icon="sparkle" />
                : <Empty title="Nothing here yet" icon="paw-line">No posts match this filter. Try another.</Empty>
            }
          />
        </>
      )}

      {homeTab === 'community' && <CommunityNavigator embedded scrollHeader={feedChrome} />}
      {homeTab === 'adoption' && <AdoptionNavigator embedded scrollHeader={feedChrome} />}

      {selectedPost && (
        <CommentSheet
          post={selectedPost}
          createdCircles={createdCircles}
          joinedCircles={joinedCircles}
          onClose={() => setSelectedPost(null)}
          onToast={showToast}
        />
      )}

      {forwardPost && (
        <ForwardSheet
          post={forwardPost}
          createdCircles={createdCircles}
          joinedCircles={joinedCircles}
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
          onToast={showToast}
        />
      )}

      {selectedCompanionId && (
        <CompanionFullProfile
          companionId={selectedCompanionId}
          visible={companionFullOpen}
          onClose={() => { setCompanionFullOpen(false); setSelectedCompanionId(null); }}
          onSwitchCompanion={(id) => setSelectedCompanionId(id)}
          onToast={showToast}
        />
      )}

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

// ── Logo ─────────────────────────────────────────────────────────────────────

function Logo() {
  return <AppLogo showWordmark />;
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
  const contentW = FEED_SHORTCUTS.length * (LENS_MARQUEE_ITEM_W + LENS_MARQUEE_GAP);
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
                  { width: LENS_MARQUEE_ITEM_W, marginRight: LENS_MARQUEE_GAP },
                ]}
              >
                <View pointerEvents="none" style={styles.lensShortcutInner}>
                  <View style={styles.lensIconSlot}>
                    <View style={[styles.lensChipRing, active && { borderColor: item.tint }]}>
                      <View style={[styles.lensChipIcon, { backgroundColor: iconBg(item.iconBg) }]}>
                        <Icon name={item.icon} size={18} color={item.tint} sw={2.2} />
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
  const { colors, iconBg } = useTheme();
  const drawerHeightAnim = useRef(new Animated.Value(0)).current;
  const drawerOpacityAnim = useRef(new Animated.Value(0)).current;
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

  useEffect(() => {
    Animated.parallel([
      Animated.spring(drawerHeightAnim, {
        toValue: drawerOpen ? drawerTargetHeight : 0,
        useNativeDriver: false,
        tension: 72,
        friction: 13,
      }),
      Animated.timing(drawerOpacityAnim, {
        toValue: drawerOpen ? 1 : 0,
        duration: drawerOpen ? 220 : 160,
        easing: drawerOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [drawerOpen, drawerTargetHeight, drawerHeightAnim, drawerOpacityAnim]);

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
  };

  return (
    <View style={styles.lensWrapper}>
      <View style={styles.lensBarRow}>
        <View style={styles.lensPawCol}>
          <View
            style={[
              styles.lensMyCircle,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                width: LENS_CIRCLE_BOX_W,
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
                <View style={[styles.lensIcon, { backgroundColor: iconBg(activeCircle.iconBg) }]}>
                  <Icon
                    name={activeCircle.icon}
                    size={18}
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
                  <Icon name="paw" size={18} color="#fff" fill="#fff" />
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
        </View>

        <View style={styles.lensDividerCol}>
          <View style={[styles.lensDivider, { backgroundColor: colors.borderStrong }]} />
        </View>

        <ShortcutMarquee
          filter={filter}
          disabled={drawerOpen}
          onFilterChange={onFilterChange}
          onDismissDrawer={() => drawerOpen && onDrawerOpenChange(false)}
        />
      </View>

      <Animated.View
        pointerEvents={drawerOpen ? 'box-none' : 'none'}
        style={[
          styles.lensDrawer,
          {
            height: drawerHeightAnim,
            opacity: drawerOpacityAnim,
            borderTopColor: colors.border,
          },
        ]}
      >
        <ScrollView
          nestedScrollEnabled
          scrollEnabled={drawerOpen && contentHeight > LENS_DRAWER_MAX_HEIGHT}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={[styles.lensDrawerScrollView, Platform.OS === 'web' && styles.lensDrawerScrollWeb]}
          contentContainerStyle={styles.lensDrawerScroll}
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
  );
}

// ── ComposerBar ───────────────────────────────────────────────────────────────

function ComposerBar({
  onOpen,
  onCategorySelect,
  postTypeFilters,
  onPostTypeFiltersChange,
}: {
  onOpen: () => void;
  onCategorySelect: (category: string) => void;
  postTypeFilters: string[];
  onPostTypeFiltersChange: (ids: string[]) => void;
}) {
  const { colors } = useTheme();
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
    onPostTypeFiltersChange(
      postTypeFilters.includes(id)
        ? postTypeFilters.filter(f => f !== id)
        : [...postTypeFilters, id],
    );
  };

  return (
    <View style={styles.composerRow}>
      <View style={[styles.composerBar, { backgroundColor: colors.surface }]}>
        <Pressable
          ref={plusRef}
          onPress={openCategoryPopup}
          style={[styles.composerPlusBtn, { backgroundColor: colors.surface2 }]}
        >
          <Icon name="plus" size={17} color={colors.textSecondary} />
        </Pressable>
        <Pressable onPress={onOpen} style={styles.composerInputArea}>
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
            backgroundColor: colors.surface,
            borderColor: postTypeFilters.length > 0 ? colors.primary : colors.border,
            borderWidth: postTypeFilters.length > 0 ? 1.5 : StyleSheet.hairlineWidth,
          },
        ]}
      >
        <Icon
          name="sliders"
          size={17}
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
  const cols = pickFilterColumns(POST_CATEGORIES.length, gridWidth);
  const chipWidth = (gridWidth - FILTER_CHIP_GAP * (cols - 1)) / cols;
  const rows = chunkFilterRows(POST_CATEGORIES, cols);

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
                  const isSelected = selected.includes(item.id);
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
}: {
  visible: boolean;
  anchor: { x: number; top: number };
  onClose: () => void;
  onSelect: (id: string) => void;
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
          <Text style={[styles.popupTitle, { color: colors.text }]}>Post type</Text>
          {POST_CATEGORIES.map(item => (
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

// ── PostTagPill ───────────────────────────────────────────────────────────────

function PostTagPill({ post }: { post: Post }) {
  const { postTag } = useTheme();
  const tag = postTag(resolvePostTagKey(post));
  return (
    <View style={[styles.postTag, { backgroundColor: tag.bg }]}>
      <Text style={[styles.postTagText, { color: tag.text }]}>{tag.label}</Text>
    </View>
  );
}

// ── PostCard ──────────────────────────────────────────────────────────────────

function PostCard({ post, onPaw, onSave, onComments, onForward, onCompanionPress, onToast }: {
  post: Post;
  onPaw: () => void;
  onSave: () => void;
  onComments: () => void;
  onForward: () => void;
  onCompanionPress?: (companionId: string) => void;
  onToast: (t: ToastData) => void;
}) {
  const { colors } = useTheme();
  const poster = getPostPoster(post);
  const mediaTint = poster.type === 'companion' ? poster.companion.tint : poster.user.tint;

  return (
    <View style={styles.post}>
      <View style={styles.postHeader}>
        <PostAuthorRow
          post={post}
          size={44}
          onCompanionPress={onCompanionPress}
          trailing={<IconButton name="more" size={32} color={colors.textSecondary} />}
        />
      </View>

      <Text style={[styles.postText, { color: colors.text }]}>{post.text}</Text>

      <View style={styles.postTagRow}>
        <PostTagPill post={post} />
      </View>

      {post.images === 1 && (
        <View style={styles.postMedia}>
          <PhotoSlot height={240} tint={mediaTint} label="Tap to add photo" borderRadius={radius.lg} />
        </View>
      )}
      {post.images === 2 && (
        <View style={[styles.imgGrid2, styles.postMedia]}>
          <PhotoSlot height={160} tint={mediaTint} style={{ flex: 1 }} label="" borderRadius={radius.md} />
          <PhotoSlot height={160} tint={mediaTint} style={{ flex: 1 }} label="" borderRadius={radius.md} />
        </View>
      )}

      <View style={styles.reactionBar}>
        <ReactionBtn
          icon={post.reacted ? 'paw' : 'paw-line'}
          count={post.paws}
          active={post.reacted}
          activeColor={colors.primary}
          fill={post.reacted}
          onPress={onPaw}
        />
        <ReactionBtn icon="comment" count={post.comments} activeColor={colors.accent} onPress={onComments} />
        <ReactionBtn icon="forward" count={post.forwards} activeColor={colors.accent} onPress={onForward} />
        <View style={{ flex: 1 }} />
        <ReactionBtn
          icon="bookmark"
          count={0}
          active={post.saved}
          activeColor={colors.primary}
          onPress={onSave}
        />
      </View>

      {post.threads.length > 0 && (
        <Pressable onPress={onComments} style={styles.commentPreview}>
          <Avatar user={users[post.threads[0].user]} size={26} showBadge={false} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text }}>
              <Text style={styles.commentUser}>{users[post.threads[0].user]?.name} </Text>
              <Text style={{ fontSize: 13 }}>{post.threads[0].text}</Text>
            </Text>
            {post.comments > 1 && (
              <Text style={[styles.viewAll, { color: colors.primary }]}>View all {post.comments} comments</Text>
            )}
          </View>
        </Pressable>
      )}
    </View>
  );
}

function ReactionBtn({ icon, count, active, activeColor, fill, onPress }: {
  icon: string; count: number; active?: boolean; activeColor: string; fill?: boolean; onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.reactionBtn}>
      <Icon name={icon} size={20} color={active ? activeColor : colors.textSecondary} fill={fill && active ? activeColor : 'none'} />
      {count > 0 && <Text style={[styles.reactionCount, { color: active ? activeColor : colors.textSecondary }]}>{count}</Text>}
    </Pressable>
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

function LostCard({ post, pulseActive, onToast, onForward }: {
  post: Post;
  pulseActive?: boolean;
  onToast: (t: ToastData) => void;
  onForward: () => void;
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
            trailing={<IconButton name="more" size={32} color={colors.textSecondary} />}
          />
        </View>

        <Text style={[styles.postText, { color: colors.text, marginTop: 12, paddingHorizontal: 0 }]}>{post.text}</Text>

        {/* Photo + details */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <PhotoSlot height={130} tint="#E0503F" label="Pet photo" style={{ width: 120 }} />
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

function FoundCard({ post, pulseActive, onToast, onForward }: {
  post: Post;
  pulseActive?: boolean;
  onToast: (t: ToastData) => void;
  onForward: () => void;
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
            trailing={<IconButton name="more" size={32} color={colors.textSecondary} />}
          />
        </View>

        <Text style={[styles.postText, { color: colors.text, marginTop: 12, paddingHorizontal: 0 }]}>{post.text}</Text>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <PhotoSlot height={130} tint={accent} label="Pet photo" style={{ width: 120 }} />
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

// ── CommentSheet ──────────────────────────────────────────────────────────────

function CommentSheet({
  post,
  createdCircles,
  joinedCircles,
  onClose,
  onToast,
}: {
  post: Post;
  createdCircles: PawCircle[];
  joinedCircles: PawCircle[];
  onClose: () => void;
  onToast: (t: ToastData) => void;
}) {
  const { colors } = useTheme();
  const [replyText, setReplyText] = useState('');
  const [mentionPickerOpen, setMentionPickerOpen] = useState(false);

  const handleReplyChange = (next: string) => {
    if (shouldOpenMentionPicker(next, replyText)) setMentionPickerOpen(true);
    else if (mentionPickerOpen && !next.includes('@')) setMentionPickerOpen(false);
    setReplyText(next);
  };

  const onMentionSelect = (token: string) => {
    setReplyText(t => insertMentionToken(t, token));
    setMentionPickerOpen(false);
  };

  const submit = () => {
    if (!replyText.trim()) return;
    setReplyText('');
    setMentionPickerOpen(false);
    onToast({ msg: 'Comment posted!', icon: 'check', tone: 'success' });
  };

  return (
    <Sheet
      visible
      onClose={onClose}
      title={`Comments · ${post.comments}`}
      footer={(
        <View style={styles.replyFooter}>
          <MentionPicker
            visible={mentionPickerOpen}
            createdCircles={createdCircles}
            joinedCircles={joinedCircles}
            onClose={() => setMentionPickerOpen(false)}
            onSelect={onMentionSelect}
          />
          <View style={styles.replyBar}>
            <Avatar user={users.you} size={34} showBadge={false} />
            <View style={[styles.replyInputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.replyInput, { color: colors.text }]}
                placeholder="Add a comment…"
                placeholderTextColor={colors.textTertiary}
                value={replyText}
                onChangeText={handleReplyChange}
                autoComplete="off"
              />
              <IconButton name="send" size={34} tone={replyText ? 'primary' : 'ghost'} color={replyText ? colors.primary : colors.textSecondary} onPress={submit} />
            </View>
          </View>
        </View>
      )}
    >
      <View style={{ paddingHorizontal: 18 }}>
        {post.threads.length === 0 && (
          <Empty icon="comment" title="No comments yet">Be the first to send some love.</Empty>
        )}
        {post.threads.map((thread, i) => (
          <View key={i} style={[styles.threadItem, { borderTopColor: i ? colors.border : 'transparent' }]}>
            <Avatar user={users[thread.user]} size={34} showBadge={false} />
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={[styles.threadUser, { color: colors.text }]}>{users[thread.user]?.name}</Text>
                <Text style={[styles.threadTime, { color: colors.textTertiary }]}>{thread.time}</Text>
              </View>
              <Text style={[styles.threadText, { color: colors.text }]}>{thread.text}</Text>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
                <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="paw-line" size={15} color={colors.textSecondary} />
                  <Text style={[styles.ghostBtn, { color: colors.textSecondary }]}>Paw</Text>
                </Pressable>
                <Pressable><Text style={[styles.ghostBtn, { color: colors.textSecondary }]}>Reply</Text></Pressable>
              </View>
              {thread.replies.map((reply, j) => {
                const ru = users[reply.user];
                return (
                  <View key={j} style={{ flexDirection: 'row', gap: 9, marginTop: 11, paddingLeft: 4 }}>
                    <Avatar user={ru} size={28} showBadge={false} />
                    <View style={[styles.replyBubble, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.threadUser, { color: colors.text, fontSize: 13 }]}>{ru?.name}</Text>
                        <Text style={[styles.threadTime, { color: colors.textTertiary }]}>{reply.time}</Text>
                      </View>
                      <Text style={[styles.threadText, { color: colors.text, fontSize: 13 }]}>{reply.text}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    </Sheet>
  );
}

// ── ForwardSheet ──────────────────────────────────────────────────────────────

type ForwardDest =
  | { type: 'circle'; id: string; label: string }
  | { type: 'community'; id: string; label: string }
  | { type: 'member'; id: string; label: string };

function getForwardableMembers(createdCircles: PawCircle[], joinedCircles: PawCircle[]) {
  const circles = getMentionableCircles(createdCircles, joinedCircles);
  const seen = new Set<string>();
  const out: { userId: string; circleId: string; circleName: string }[] = [];
  for (const c of circles) {
    getCircleMembers(c.id, c).forEach(m => {
      if (m.userId !== 'you' && !seen.has(m.userId)) {
        seen.add(m.userId);
        out.push({ userId: m.userId, circleId: c.id, circleName: c.name });
      }
    });
  }
  return out;
}

function ForwardSheet({
  post,
  createdCircles,
  joinedCircles,
  onClose,
  onSelect,
}: {
  post: Post;
  createdCircles: PawCircle[];
  joinedCircles: PawCircle[];
  onClose: () => void;
  onSelect: (dest: ForwardDest) => void;
}) {
  const { colors, iconBg } = useTheme();
  const author = users[post.author];
  const circles = getMentionableCircles(createdCircles, joinedCircles);
  const joinedCommunities = allCommunities.filter(c => c.joined);
  const members = getForwardableMembers(createdCircles, joinedCircles);
  const hasAny = circles.length > 0 || joinedCommunities.length > 0 || members.length > 0;

  const pick = (dest: ForwardDest) => onSelect(dest);

  return (
    <Sheet visible onClose={onClose} title="Forward post">
      <View style={{ paddingHorizontal: 18 }}>
        <View style={[styles.forwardPreview, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
          <Avatar user={author} size={36} showBadge={false} />
          <Text style={[styles.forwardPreviewText, { color: colors.textSecondary }]} numberOfLines={2}>
            {post.text}
          </Text>
        </View>

        {!hasAny && (
          <Empty icon="forward" title="No destinations yet">
            Join a Paw Circle or community to forward posts.
          </Empty>
        )}

        {circles.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 14 }]}>PAW CIRCLE</Text>
            {circles.map(c => (
              <Pressable
                key={c.id}
                onPress={() => pick({ type: 'circle', id: c.id, label: c.name })}
                style={[styles.forwardRow, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <View style={[styles.forwardRowIcon, { backgroundColor: iconBg(c.iconBg) }]}>
                  <Icon name={c.icon} size={16} color={c.tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.forwardRowTitle, { color: colors.text }]} numberOfLines={1}>{c.name}</Text>
                  <Text style={[styles.forwardRowSub, { color: colors.textTertiary }]}>Share to circle chat</Text>
                </View>
                <Icon name="chevronRight" size={16} color={colors.textTertiary} />
              </Pressable>
            ))}
          </>
        )}

        {joinedCommunities.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 14 }]}>COMMUNITY</Text>
            {joinedCommunities.map(c => (
              <Pressable
                key={c.id}
                onPress={() => pick({ type: 'community', id: c.id, label: c.name })}
                style={[styles.forwardRow, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <View style={[styles.forwardRowIcon, { backgroundColor: c.tint + '22' }]}>
                  <Icon name={c.icon} size={16} color={c.tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.forwardRowTitle, { color: colors.text }]} numberOfLines={1}>{c.name}</Text>
                  <Text style={[styles.forwardRowSub, { color: colors.textTertiary }]}>{c.members} members</Text>
                </View>
                <Icon name="chevronRight" size={16} color={colors.textTertiary} />
              </Pressable>
            ))}
          </>
        )}

        {members.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 14 }]}>CIRCLE MEMBER</Text>
            {members.map(m => {
              const u = users[m.userId];
              if (!u) return null;
              return (
                <Pressable
                  key={m.userId}
                  onPress={() => pick({ type: 'member', id: m.userId, label: u.name })}
                  style={[styles.forwardRow, { borderColor: colors.border, backgroundColor: colors.surface }]}
                >
                  <Avatar user={u} size={36} showBadge={false} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.forwardRowTitle, { color: colors.text }]} numberOfLines={1}>{u.name}</Text>
                    <Text style={[styles.forwardRowSub, { color: colors.textTertiary }]} numberOfLines={1}>
                      via {m.circleName}
                    </Text>
                  </View>
                  <Icon name="chevronRight" size={16} color={colors.textTertiary} />
                </Pressable>
              );
            })}
          </>
        )}
      </View>
    </Sheet>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  feedChrome: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 6,
    ...Platform.select({
      web: { userSelect: 'none' },
      default: {},
    }),
  },
  hubToggleWrap: {
    marginTop: 10,
    marginBottom: 2,
    alignItems: 'center',
  },
  feedList: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 4,
  },
  lensWrapper: {
    marginTop: 0,
    marginBottom: 0,
    overflow: 'hidden',
  },
  lensBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: LENS_COL_H,
  },
  lensPawCol: {
    width: LENS_CIRCLE_BOX_W,
    flexShrink: 0,
    height: LENS_COL_H,
    justifyContent: 'center',
  },
  lensDividerCol: {
    height: LENS_COL_H,
    justifyContent: 'center',
    marginLeft: 8,
    marginRight: 8,
    flexShrink: 0,
  },
  lensDivider: {
    width: 2,
    height: LENS_ICON_SLOT_H,
    borderRadius: 1,
    opacity: 0.85,
  },
  lensMarqueeZone: {
    flex: 1,
    minWidth: 0,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 4,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  lensTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 17,
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
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 2,
  },
  lensChipIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lensChipLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
    marginTop: 4,
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
    marginBottom: 8,
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
    ...shadows.sm,
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
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
    ...Platform.select({
      web: { cursor: 'pointer', userSelect: 'none' },
      default: {},
    }),
  },
  categoryPopupCard: {
    position: 'absolute',
    width: 200,
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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
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
    maxHeight: '70%',
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
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 7 },
  forwardPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  forwardPreviewText: { flex: 1, fontSize: 13, lineHeight: 18 },
  forwardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  forwardRowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forwardRowTitle: { fontSize: 14, fontWeight: '600' },
  forwardRowSub: { fontSize: 12, marginTop: 1 },
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
  threadItem: { flexDirection: 'row', gap: 10, paddingVertical: 12, borderTopWidth: 1 },
  threadUser: { fontSize: 14, fontWeight: '700' },
  threadTime: { fontSize: 12 },
  threadText: { fontSize: 14.5, lineHeight: 21, marginTop: 2 },
  ghostBtn: { fontSize: 12.5, fontWeight: '700' },
  replyBubble: { flex: 1, borderRadius: radius.md, padding: 8, borderWidth: StyleSheet.hairlineWidth },
  replyFooter: {
    gap: 8,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  replyInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    paddingLeft: 14,
    paddingVertical: 4,
    borderWidth: 1,
    ...Platform.select({
      web: { outlineStyle: 'none' } as object,
      default: {},
    }),
  },
  replyInput: {
    flex: 1,
    fontSize: 14.5,
    paddingVertical: 4,
    ...Platform.select({
      web: { outlineStyle: 'none' } as object,
      default: {},
    }),
  },
});
