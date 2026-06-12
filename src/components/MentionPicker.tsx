import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, TextInput, ScrollView, StyleSheet, Platform, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { radius, shadows } from '../theme/tokens';
import { Icon } from './icons/Icon';
import { IconButton } from './ui/Button';
import { Avatar } from './ui/Avatar';
import { commentTextInputProps } from './ui/BlankInputAccessory';
import { PawCircle } from '../data/pawCircles';
import { communities as allCommunities } from '../data/mockData';
import { users } from '../data/mockData';
import { getCircleMembers, getMentionableCircles } from '../data/pawCircleChat';
import {
  searchAllCircleMembers,
  searchCircles,
  searchCommunities,
  shortCircleName,
} from '../utils/destinationSearch';

export type MentionCategory = 'community' | 'circle' | 'member';

export const MENTION_CATEGORIES: {
  id: MentionCategory;
  label: string;
  sub: string;
  icon: string;
  tint: string;
  iconBg: string;
}[] = [
  { id: 'community', label: 'Community', sub: 'Groups you belong to', icon: 'communities', tint: '#7C5CBF', iconBg: '#F0EBFA' },
  { id: 'circle', label: 'Paw Circle', sub: 'Your circles', icon: 'circles', tint: '#14A697', iconBg: '#D6F5EE' },
  { id: 'member', label: 'Circle member', sub: 'Choose a circle, then a person', icon: 'user', tint: '#F2972E', iconBg: '#FDF4E4' },
];

export { shortCircleName };

function circleToken(c: PawCircle) {
  return `@${shortCircleName(c.name)}`;
}

function communityToken(c: { name: string }) {
  return `@${c.name}`;
}

function memberToken(userId: string) {
  const u = users[userId];
  return u ? `@${u.handle}` : '';
}

type MemberRow = { userId: string; circleName: string };

function getMembersForCircle(circle: PawCircle): MemberRow[] {
  return getCircleMembers(circle.id, circle)
    .filter(m => m.userId !== 'you')
    .map(m => ({ userId: m.userId, circleName: circle.name }));
}

export function insertMentionToken(current: string, token: string): string {
  const bare = token.replace(/^@/, '');
  if (current.endsWith('@')) return `${current}${bare} `;
  return current.trim() ? `${current.trim()} ${token} ` : `${token} `;
}

export function shouldOpenMentionPicker(next: string, prev: string): boolean {
  return next.endsWith('@') && next.length > prev.length;
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
};

export function MentionPicker({
  visible,
  onClose,
  onSelect,
  createdCircles,
  joinedCircles,
  multiSelect = false,
  inline = false,
}: MentionPickerProps) {
  const { colors, scrim, iconBg, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'category' | 'member_circle' | 'results'>('category');
  const [category, setCategory] = useState<MentionCategory | null>(null);
  const [memberCircle, setMemberCircle] = useState<PawCircle | null>(null);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!visible) {
      setStep('category');
      setCategory(null);
      setMemberCircle(null);
      setQuery('');
      setSearchOpen(false);
    }
  }, [visible]);

  const circles = useMemo(
    () => getMentionableCircles(createdCircles, joinedCircles),
    [createdCircles, joinedCircles],
  );
  const joinedCommunities = useMemo(
    () => allCommunities.filter(c => c.joined),
    [],
  );
  const members = useMemo(
    () => (memberCircle ? getMembersForCircle(memberCircle) : []),
    [memberCircle],
  );

  const categoryMeta = MENTION_CATEGORIES.find(c => c.id === category);

  const filteredCircles = useMemo(
    () => searchCircles(circles, query),
    [circles, query],
  );

  const filteredCommunities = useMemo(
    () => searchCommunities(joinedCommunities, query),
    [joinedCommunities, query],
  );

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(m => {
      const u = users[m.userId];
      if (!u) return false;
      return u.name.toLowerCase().includes(q) || u.handle.toLowerCase().includes(q);
    });
  }, [members, query]);

  const homeSearchMembers = useMemo(
    () => searchAllCircleMembers(circles, query),
    [circles, query],
  );

  const homeSearchActive = step === 'category' && searchOpen && query.trim().length > 0;

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
      : category === 'community' ? filteredCommunities.length
        : category === 'member' ? filteredMembers.length
          : 0;

  const searchPlaceholder = (() => {
    if (step === 'category') return 'Search circles, groups, or members…';
    if (category === 'member' && memberCircle) {
      return `Search in ${shortCircleName(memberCircle.name)}…`;
    }
    return `Search ${categoryMeta?.label.toLowerCase() ?? ''}…`;
  })();

  const searchField = (
    <View style={[styles.searchField, { backgroundColor: colors.surface2 }]}>
      <Icon name="search" size={15} color={colors.textTertiary} />
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

  const panelHeader = (title: string, showBack: boolean) => (
    <View style={styles.panelHeader}>
      {showBack ? (
        <Pressable onPress={goBack} hitSlop={8} style={styles.backBtn}>
          <Icon name="chevronLeft" size={18} color={colors.textSecondary} />
        </Pressable>
      ) : (
        <View style={styles.backBtn} />
      )}
      <Text style={[styles.panelTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
      <IconButton
        name="search"
        size={32}
        tone={searchOpen ? 'primary' : 'soft'}
        color={searchOpen ? colors.primary : colors.textSecondary}
        onPress={toggleSearch}
      />
    </View>
  );

  const scrollAreaStyle = [
    styles.results,
    inline && styles.resultsInline,
    inline && Platform.OS === 'web' && styles.resultsWeb,
  ];

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
        inline && [styles.panelInline, { borderColor: colors.border }],
        {
          backgroundColor: colors.surface,
          ...(inline ? {} : shadows.md),
        },
      ]}
      {...(inline ? {} : { onStartShouldSetResponder: () => true })}
    >
      {step === 'member_circle' ? (
        <>
          {panelHeader('Which circle?', true)}
          {searchOpen && searchField}
          <ScrollView
            style={scrollAreaStyle}
            contentContainerStyle={styles.resultsInner}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
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
          </ScrollView>
        </>
      ) : step === 'category' ? (
        <>
          {panelHeader('Mention', false)}
          {searchOpen && searchField}
          {homeSearchActive ? (
            <ScrollView
              style={scrollAreaStyle}
              contentContainerStyle={styles.resultsInner}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
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
              {filteredCommunities.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>Community</Text>
                  {filteredCommunities.map(c => (
                    <Pressable
                      key={c.id}
                      onPress={() => pick(communityToken(c))}
                      style={({ pressed }) => [styles.resultRow, pressed && { backgroundColor: colors.surface2 }]}
                    >
                      <View style={[styles.resultIcon, { backgroundColor: c.tint + '22' }]}>
                        <Icon name={c.icon} size={15} color={c.tint} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>{c.name}</Text>
                        <Text style={[styles.resultSub, { color: colors.textTertiary }]}>{c.members} members</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
              {homeSearchMembers.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>Circle member</Text>
                  {homeSearchMembers.map(m => {
                    const u = users[m.userId];
                    if (!u) return null;
                    return (
                      <Pressable
                        key={`${m.userId}-${m.circleId}`}
                        onPress={() => pick(memberToken(m.userId))}
                        style={({ pressed }) => [styles.resultRow, pressed && { backgroundColor: colors.surface2 }]}
                      >
                        <Avatar user={u} size={32} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>{u.name}</Text>
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
                && filteredCommunities.length === 0
                && homeSearchMembers.length === 0 && (
                <Text style={[styles.empty, { color: colors.textTertiary }]}>No matches</Text>
              )}
            </ScrollView>
          ) : (
            <ScrollView
              style={scrollAreaStyle}
              contentContainerStyle={styles.categoryList}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {categoryRows}
            </ScrollView>
          )}
        </>
      ) : (
        <>
          {panelHeader(categoryMeta?.label ?? 'Mention', true)}
          {searchOpen && searchField}
          <ScrollView
            style={scrollAreaStyle}
            contentContainerStyle={styles.resultsInner}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator={resultCount > 5}
          >
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

            {category === 'community' && filteredCommunities.map(c => (
              <Pressable
                key={c.id}
                onPress={() => pick(communityToken(c))}
                style={({ pressed }) => [styles.resultRow, pressed && { backgroundColor: colors.surface2 }]}
              >
                <View style={[styles.resultIcon, { backgroundColor: c.tint + '22' }]}>
                  <Icon name={c.icon} size={15} color={c.tint} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>{c.name}</Text>
                  <Text style={[styles.resultSub, { color: colors.textTertiary }]}>{c.members} members</Text>
                </View>
              </Pressable>
            ))}

            {category === 'member' && filteredMembers.map(m => {
              const u = users[m.userId];
              if (!u) return null;
              return (
                <Pressable
                  key={m.userId}
                  onPress={() => pick(memberToken(m.userId))}
                  style={({ pressed }) => [styles.resultRow, pressed && { backgroundColor: colors.surface2 }]}
                >
                  <Avatar user={u} size={32} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>{u.name}</Text>
                    <Text style={[styles.resultSub, { color: colors.textTertiary }]} numberOfLines={1}>
                      @{u.handle}
                    </Text>
                  </View>
                </Pressable>
              );
            })}

            {resultCount === 0 && (
              <Text style={[styles.empty, { color: colors.textTertiary }]}>No matches</Text>
            )}
          </ScrollView>
        </>
      )}

      {multiSelect && (
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

  if (!visible) return null;

  if (inline) {
    return (
      <View style={styles.inlineWrap}>
        {panel}
      </View>
    );
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: scrim },
          ]}
        />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" />
        <View
          style={[
            styles.anchor,
            { paddingBottom: Math.max(insets.bottom, 12) + 8, paddingHorizontal: 16 },
          ]}
          pointerEvents="box-none"
        >
          {panel}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    maxHeight: 320,
  },
  panelInline: {
    height: 260,
    maxHeight: 260,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'column',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
  },
  panelTitle: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '700',
  },
  categoryList: {
    paddingVertical: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  categoryIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: { fontSize: 14.5, fontWeight: '600' },
  categorySub: { fontSize: 12, marginTop: 1 },
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
    maxHeight: 210,
    paddingHorizontal: 6,
    paddingBottom: 8,
  },
  resultsInline: {
    flex: 1,
    minHeight: 0,
    maxHeight: undefined,
  },
  resultsWeb: {
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
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
    gap: 11,
    paddingHorizontal: 8,
    paddingVertical: 9,
    borderRadius: radius.md,
  },
  resultIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: { fontSize: 14, fontWeight: '600' },
  resultSub: { fontSize: 12, marginTop: 1 },
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
