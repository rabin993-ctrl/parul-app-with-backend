import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, TextInput, ScrollView, StyleSheet, Platform, Modal, Dimensions, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { radius, shadows } from '../theme/tokens';
import { Icon } from './icons/Icon';
import { IconButton } from './ui/Button';
import { ModalPresent, useModalEnterAnimation } from './ui/ModalScrim';
import { Avatar } from './ui/Avatar';
import { commentTextInputProps } from './ui/BlankInputAccessory';
import { PawCircle } from '../data/pawCircles';
import { supabase } from '../lib/supabase';
import { avatarUrlsFromMedia, normalizeJoinedMedia, USER_AVATAR_MEDIA_SELECT } from '../lib/avatarMedia';
import { useAuth } from '../context/AuthContext';
import { usePawCircles } from '../context/PawCircleContext';
import { useAllCircleMembers } from '../hooks/useAllCircleMembers';
import {
  searchAllCircleMembers,
  searchCircles,
  shortCircleName,
} from '../utils/destinationSearch';
import { extractActiveMentionQuery, dismissActiveMention } from '../utils/mentionText';
export { extractActiveMentionQuery, dismissActiveMention };

export type MentionCategory = 'community' | 'circle' | 'member';

export const MENTION_CATEGORIES: {
  id: MentionCategory;
  label: string;
  sub: string;
  icon: string;
  tint: string;
  iconBg: string;
}[] = [
  { id: 'circle', label: 'Paw Circle', sub: 'Your circles', icon: 'circles', tint: '#14A697', iconBg: '#D6F5EE' },
  { id: 'member', label: 'Circle member', sub: 'Choose a circle, then a person', icon: 'user', tint: '#F2972E', iconBg: '#FDF4E4' },
];

export { shortCircleName };

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANEL_MAX_HEIGHT = Math.min(SCREEN_HEIGHT * 0.52, 420);

function circleToken(c: PawCircle) {
  return `@${c.name}`;
}

type MemberRow = {
  userId: string;
  circleName: string;
  name?: string;
  handle?: string;
  tint?: string;
  avatarUrl?: string;
  avatarFallbackUrl?: string;
};

function memberToAvatarUser(m: MemberRow) {
  return {
    id: m.userId,
    name: m.name ?? m.userId.slice(0, 8),
    tint: m.tint ?? '#888888',
    avatarUrl: m.avatarUrl,
    avatarFallbackUrl: m.avatarFallbackUrl,
  };
}

function memberToken(m: MemberRow) {
  return m.handle ? `@${m.handle}` : '';
}

export function insertMentionToken(current: string, token: string): string {
  const atIndex = current.lastIndexOf('@');
  const tail = atIndex >= 0 ? current.slice(atIndex + 1) : '';
  const replacingPartial = atIndex >= 0 && !/[\s\n]/.test(tail);
  if (replacingPartial) {
    const prefix = current.slice(0, atIndex);
    return prefix ? `${prefix}${token} ` : `${token} `;
  }
  const bare = token.replace(/^@/, '');
  if (current.endsWith('@')) return `${current}${bare} `;
  return current.trim() ? `${current.trim()} ${token} ` : `${token} `;
}

export function isMentionTypeaheadActive(text: string): boolean {
  return extractActiveMentionQuery(text) !== null;
}

export function shouldOpenMentionPicker(next: string, prev: string): boolean {
  return isMentionTypeaheadActive(next) && !isMentionTypeaheadActive(prev);
}

type MentionPickerProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (token: string) => void;
  createdCircles: PawCircle[];
  joinedCircles: PawCircle[];
  /** Keep picker open after each pick so multiple mentions can be added. */
  multiSelect?: boolean;
  /** Render in-place instead of a modal so parent keyboard stays open (e.g. comment sheets). */
  inline?: boolean;
  /** When set, filter suggestions from the @query typed in the parent input. */
  typeaheadQuery?: string;
  /** Leave this much space at the bottom clear (e.g. comment composer height). */
  reserveBottomHeight?: number;
};

export function MentionPicker({
  visible,
  onClose,
  onSelect,
  createdCircles,
  joinedCircles,
  multiSelect = false,
  inline = false,
  typeaheadQuery,
  reserveBottomHeight = 0,
}: MentionPickerProps) {
  const { colors, iconBg, isDark, scrim } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { getDbId } = usePawCircles();
  const [step, setStep] = useState<'category' | 'member_circle' | 'results'>('category');
  const [category, setCategory] = useState<MentionCategory | null>(null);
  const [memberCircle, setMemberCircle] = useState<PawCircle | null>(null);
  const [liveMembers, setLiveMembers] = useState<MemberRow[]>([]);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const { opacity: enterOpacity } = useModalEnterAnimation(visible && !inline);

  useEffect(() => {
    if (!visible) {
      setStep('category');
      setCategory(null);
      setMemberCircle(null);
      setQuery('');
      setSearchOpen(false);
    }
  }, [visible]);

  const circles = useMemo(() => {
    const seen = new Set<string>();
    const all: PawCircle[] = [];
    for (const c of [...createdCircles, ...joinedCircles]) {
      if (!seen.has(c.id)) { seen.add(c.id); all.push(c); }
    }
    return all;
  }, [createdCircles, joinedCircles]);

  const memberIndexEnabled = visible && (typeaheadQuery !== undefined || searchOpen);
  const allCircleMembers = useAllCircleMembers(circles, memberIndexEnabled);

  useEffect(() => {
    if (!memberCircle) { setLiveMembers([]); return; }
    const dbId = getDbId(memberCircle.id);
    if (!dbId) {
      setLiveMembers([]);
      return;
    }
    type MemberRow = {
      user_id: string;
      users: {
        name: string;
        handle: string | null;
        tint: string | null;
        avatar_media: unknown;
      } | null;
    };

    (supabase as any)
      .from('circle_members')
      .select(`user_id, users(name, handle, tint, ${USER_AVATAR_MEDIA_SELECT})`)
      .eq('circle_id', dbId)
      .then(({ data }: { data: MemberRow[] | null }) => {
        if (!data) { setLiveMembers([]); return; }
        const rows = data;
        setLiveMembers(
          rows
            .filter(row => row.user_id !== user?.id)
            .map(row => {
              const urls = avatarUrlsFromMedia(normalizeJoinedMedia(row.users?.avatar_media as never));
              return {
                userId: row.user_id,
                circleName: memberCircle.name,
                name: row.users?.name,
                handle: row.users?.handle ?? undefined,
                tint: row.users?.tint ?? undefined,
                ...urls,
              };
            }),
        );
      });
  }, [memberCircle, getDbId, user?.id]);

  const categoryMeta = MENTION_CATEGORIES.find(c => c.id === category);

  const typeaheadMode = typeaheadQuery !== undefined;
  const effectiveQuery = typeaheadMode ? typeaheadQuery : query;

  const filteredCircles = useMemo(
    () => searchCircles(circles, effectiveQuery),
    [circles, effectiveQuery],
  );

  const filteredMembers = useMemo(() => {
    const q = effectiveQuery.trim().toLowerCase();
    if (!q) return liveMembers;
    return liveMembers.filter(m => {
      const name = m.name ?? '';
      const handle = m.handle ?? '';
      return name.toLowerCase().includes(q) || handle.toLowerCase().includes(q);
    });
  }, [liveMembers, effectiveQuery]);

  const homeSearchMembers = useMemo(
    () => searchAllCircleMembers(circles, effectiveQuery, allCircleMembers),
    [circles, effectiveQuery, allCircleMembers],
  );

  const homeSearchActive = !typeaheadMode && step === 'category' && searchOpen && query.trim().length > 0;
  const showTypeaheadResults = (typeaheadMode && effectiveQuery.trim().length > 0) || homeSearchActive;

  const toggleSearch = () => {
    setSearchOpen(v => {
      if (v) setQuery('');
      return !v;
    });
  };

  const pickCategory = (id: MentionCategory) => {
    setCategory(id);
    setMemberCircle(null);
    setQuery('');
    setStep(id === 'member' ? 'member_circle' : 'results');
  };

  const pickMemberCircle = (circle: PawCircle) => {
    setMemberCircle(circle);
    setStep('results');
    setQuery('');
  };

  const goBack = () => {
    if (category === 'member' && step === 'results' && memberCircle) {
      setMemberCircle(null);
      setStep('member_circle');
      setQuery('');
      return;
    }
    setStep('category');
    setCategory(null);
    setMemberCircle(null);
    setQuery('');
  };

  const pick = (token: string) => {
    onSelect(token);
    if (!multiSelect) onClose();
  };

  const resultCount =
    category === 'circle' ? filteredCircles.length
      : category === 'member' ? filteredMembers.length
        : 0;

  const searchPlaceholder = (() => {
    if (step === 'category') return 'Search circles, groups, or members…';
    if (category === 'member' && memberCircle) {
      return `Search in ${shortCircleName(memberCircle.name)}…`;
    }
    return `Search ${categoryMeta?.label.toLowerCase() ?? ''}…`;
  })();

  if (!visible) return null;

  const panelMaxHeight = reserveBottomHeight > 0
    ? Math.min(PANEL_MAX_HEIGHT, SCREEN_HEIGHT - reserveBottomHeight - 96)
    : PANEL_MAX_HEIGHT;
  const elevatedPanel = !inline || typeaheadQuery !== undefined;

  const searchField = (
    <View style={[styles.searchField, { backgroundColor: colors.surface2 }]}>
      <Icon name="search" size={18} color={colors.textTertiary} />
      <TextInput
        style={[styles.searchInput, { color: colors.text }]}
        placeholder={searchPlaceholder}
        placeholderTextColor={colors.textTertiary}
        value={query}
        onChangeText={setQuery}
        autoFocus
        autoCorrect={false}
        autoCapitalize="none"
        {...commentTextInputProps(isDark)}
      />
      {query.length > 0 && (
        <Pressable onPress={() => setQuery('')} hitSlop={6}>
          <Icon name="close" size={14} color={colors.textTertiary} />
        </Pressable>
      )}
    </View>
  );

  const panelHeader = (title: string, showBack: boolean, hideSearch = false) => (
    <View style={styles.panelHeader}>
      {showBack ? (
        <Pressable onPress={goBack} hitSlop={8} style={styles.backBtn}>
          <Icon name="chevronLeft" size={18} color={colors.textSecondary} />
        </Pressable>
      ) : (
        <View style={styles.backBtn} />
      )}
      <Text style={[styles.panelTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
      {hideSearch ? (
        <View style={styles.backBtn} />
      ) : (
        <IconButton
          name="search"
          size={40}
          iconSize={20}
          tone={searchOpen ? 'primary' : 'ghost'}
          color={searchOpen ? colors.primary : colors.text}
          onPress={toggleSearch}
        />
      )}
    </View>
  );

  const scrollAreaStyle = inline
    ? [styles.resultsInline, Platform.OS === 'web' && styles.resultsWeb]
    : [styles.results, { maxHeight: Math.max(120, panelMaxHeight - 120) }];

  const panelScroll = (
    children: React.ReactNode,
    opts?: {
      showScrollIndicator?: boolean;
      contentContainerStyle?: typeof styles.resultsInner;
    },
  ) => {
    const scroll = (
      <ScrollView
        style={scrollAreaStyle}
        contentContainerStyle={opts?.contentContainerStyle ?? styles.resultsInner}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator={opts?.showScrollIndicator ?? !inline}
        {...(inline && Platform.OS === 'web' ? { dataSet: { mentionScroll: 'true' } } as object : {})}
      >
        {children}
      </ScrollView>
    );
    return scroll;
  };

  const categoryRows = MENTION_CATEGORIES.map((cat, i) => (
    <Pressable
      key={cat.id}
      onPress={() => pickCategory(cat.id)}
      style={({ pressed }) => [
        styles.categoryRow,
        i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border + '66' },
        pressed && { backgroundColor: colors.surface2 },
      ]}
    >
      <View style={[styles.categoryIcon, { backgroundColor: iconBg(cat.iconBg) }]}>
        <Icon name={cat.icon} size={16} color={cat.tint} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.categoryLabel, { color: colors.text }]}>{cat.label}</Text>
        <Text style={[styles.categorySub, { color: colors.textTertiary }]}>{cat.sub}</Text>
      </View>
      <Icon name="chevronRight" size={14} color={colors.textTertiary} />
    </Pressable>
  ));

  const panel = (
    <View
      style={[
        styles.panel,
        inline && styles.panelInline,
        !inline && { maxHeight: panelMaxHeight },
        {
          backgroundColor: colors.surface,
          ...(elevatedPanel ? shadows.md : {}),
        },
      ]}
      {...(inline ? {} : { onStartShouldSetResponder: () => true })}
    >
      {step === 'member_circle' ? (
        <>
          {panelHeader('Which circle?', true)}
          {searchOpen && searchField}
          {panelScroll(
            <>
              {(searchOpen ? filteredCircles : circles).map(c => (
                <Pressable
                  key={c.id}
                  onPress={() => pickMemberCircle(c)}
                  style={({ pressed }) => [styles.resultRow, pressed && { backgroundColor: colors.surface2 }]}
                >
                  <View style={[styles.resultIcon, { backgroundColor: iconBg(c.iconBg) }]}>
                    <Icon name={c.icon} size={15} color={c.tint} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>{c.name}</Text>
                    <Text style={[styles.resultSub, { color: colors.textTertiary }]}>{c.memberCount} members</Text>
                  </View>
                  <Icon name="chevronRight" size={14} color={colors.textTertiary} />
                </Pressable>
              ))}
              {(searchOpen ? filteredCircles : circles).length === 0 && (
                <Text style={[styles.empty, { color: colors.textTertiary }]}>Join a Paw Circle first</Text>
              )}
            </>,
          )}
        </>
      ) : step === 'category' ? (
        <>
          {panelHeader(
            typeaheadMode ? (effectiveQuery.trim() ? 'Suggestions' : 'Mention') : 'Mention',
            false,
            typeaheadMode,
          )}
          {!typeaheadMode && searchOpen && searchField}
          {showTypeaheadResults ? (
            panelScroll(
              <>
                {filteredCircles.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>Paw Circle</Text>
                    {filteredCircles.map(c => (
                      <Pressable
                        key={c.id}
                        onPress={() => pick(circleToken(c))}
                        style={({ pressed }) => [styles.resultRow, pressed && { backgroundColor: colors.surface2 }]}
                      >
                        <View style={[styles.resultIcon, { backgroundColor: iconBg(c.iconBg) }]}>
                          <Icon name={c.icon} size={15} color={c.tint} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>{c.name}</Text>
                          <Text style={[styles.resultSub, { color: colors.textTertiary }]}>{c.memberCount} members</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}
                {homeSearchMembers.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>Circle member</Text>
                    {homeSearchMembers.map(m => {
                      const displayName = m.name ?? m.userId.slice(0, 8);
                      const displayUser = memberToAvatarUser(m);
                      return (
                        <Pressable
                          key={`${m.userId}-${m.circleId}`}
                          onPress={() => pick(memberToken(m))}
                          style={({ pressed }) => [styles.resultRow, pressed && { backgroundColor: colors.surface2 }]}
                        >
                          <Avatar user={displayUser} size={32} />
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>{displayName}</Text>
                            <Text style={[styles.resultSub, { color: colors.textTertiary }]} numberOfLines={1}>
                              via {m.circleName}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
                {filteredCircles.length === 0
                  && homeSearchMembers.length === 0 && (
                  <Text style={[styles.empty, { color: colors.textTertiary }]}>No matches</Text>
                )}
              </>,
              { showScrollIndicator: false },
            )
          ) : inline ? (
            <View style={styles.categoryListInline}>{categoryRows}</View>
          ) : (
            panelScroll(categoryRows, {
              showScrollIndicator: false,
              contentContainerStyle: styles.categoryList,
            })
          )}
        </>
      ) : (
        <>
          {panelHeader(categoryMeta?.label ?? 'Mention', true)}
          {searchOpen && searchField}
          {panelScroll(
            <>
              {category === 'circle' && filteredCircles.map(c => (
                <Pressable
                  key={c.id}
                  onPress={() => pick(circleToken(c))}
                  style={({ pressed }) => [styles.resultRow, pressed && { backgroundColor: colors.surface2 }]}
                >
                  <View style={[styles.resultIcon, { backgroundColor: iconBg(c.iconBg) }]}>
                    <Icon name={c.icon} size={15} color={c.tint} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>{c.name}</Text>
                    <Text style={[styles.resultSub, { color: colors.textTertiary }]}>{c.memberCount} members</Text>
                  </View>
                </Pressable>
              ))}

              {category === 'member' && filteredMembers.map(m => {
                const displayName = m.name ?? m.userId.slice(0, 8);
                const displayHandle = m.handle;
                const displayUser = memberToAvatarUser(m);
                return (
                  <Pressable
                    key={m.userId}
                    onPress={() => pick(memberToken(m))}
                    style={({ pressed }) => [styles.resultRow, pressed && { backgroundColor: colors.surface2 }]}
                  >
                    <Avatar user={displayUser} size={32} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>{displayName}</Text>
                      {displayHandle && (
                        <Text style={[styles.resultSub, { color: colors.textTertiary }]} numberOfLines={1}>
                          @{displayHandle}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}

              {resultCount === 0 && (
                <Text style={[styles.empty, { color: colors.textTertiary }]}>No matches</Text>
              )}
            </>,
            { showScrollIndicator: resultCount > 5 },
          )}
        </>
      )}

      {multiSelect && !typeaheadMode && (
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.doneBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
          ]}
        >
          <Text style={[styles.doneBtnText, { color: colors.onPrimary }]}>Done</Text>
        </Pressable>
      )}
    </View>
  );

  if (inline) {
    return (
      <View style={styles.inlineWrap}>
        {panel}
      </View>
    );
  }

  if (reserveBottomHeight > 0) {
    return (
      <Modal
        visible
        transparent
        animationType="none"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <View style={styles.modalRoot}>
          <View style={styles.modalColumn}>
            <Animated.View style={[styles.scrimFlex, { opacity: enterOpacity }]}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Dismiss mention picker"
              >
                <View style={[StyleSheet.absoluteFill, { backgroundColor: scrim }]} />
              </Pressable>
            </Animated.View>
            <Animated.View
              style={[styles.anchor, { paddingHorizontal: 16, marginBottom: 8, opacity: enterOpacity }]}
              pointerEvents="box-none"
            >
              {panel}
            </Animated.View>
            <View style={{ height: reserveBottomHeight }} pointerEvents="none" />
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        <ModalPresent
          onDismiss={onClose}
          style={styles.overlay}
          scrimStyle={Platform.OS === 'web' ? styles.scrimWeb : undefined}
          animatedScale={false}
        >
          <View
            style={[
              styles.anchor,
              { paddingBottom: Math.max(insets.bottom, 12) + 8, paddingHorizontal: 16 },
            ]}
            pointerEvents="box-none"
          >
            {panel}
          </View>
        </ModalPresent>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    ...Platform.select({
      web: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1000,
      },
      default: {},
    }) as object,
  },
  modalColumn: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrimFlex: {
    flex: 1,
    minHeight: 0,
  },
  scrimWeb: Platform.select({
    web: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
    },
    default: {},
  }) as object,
  inlineWrap: {
    width: '100%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  anchor: {
    width: '100%',
  },
  panel: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    maxHeight: PANEL_MAX_HEIGHT,
  },
  panelInline: {
    maxHeight: 340,
    flexDirection: 'column',
    alignSelf: 'stretch',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
    flexShrink: 0,
  },
  panelTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  categoryList: {
    paddingVertical: 4,
  },
  categoryListInline: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: { fontSize: 15, fontWeight: '600' },
  categorySub: { fontSize: 12.5, marginTop: 2 },
  backBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    marginHorizontal: 10,
    marginBottom: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    paddingVertical: 0,
  },
  results: {
    maxHeight: PANEL_MAX_HEIGHT - 120,
    paddingHorizontal: 6,
    paddingBottom: 8,
  },
  resultsInline: {
    flexGrow: 0,
    flexShrink: 0,
    maxHeight: 292,
    paddingHorizontal: 6,
  },
  resultsWeb: {
    flexGrow: 0,
    maxHeight: 292,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  } as object,
  resultsInner: {
    paddingHorizontal: 6,
    paddingBottom: 8,
  },
  section: { marginTop: 4 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
    paddingHorizontal: 8,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderRadius: radius.md,
  },
  resultIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: { fontSize: 15, fontWeight: '600' },
  resultSub: { fontSize: 12.5, marginTop: 2 },
  empty: {
    textAlign: 'center',
    fontSize: 13,
    paddingVertical: 24,
  },
  doneBtn: {
    marginHorizontal: 10,
    marginBottom: 10,
    marginTop: 4,
    paddingVertical: 11,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
