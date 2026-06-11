import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, TextInput, ScrollView, StyleSheet, Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';
import { Avatar } from './ui/Avatar';
import { IconButton } from './ui/Button';
import { Sheet } from './ui/Sheet';
import { Icon } from './icons/Icon';
import { PawCircle } from '../data/pawCircles';
import type { Community } from '../data/mockData';
import { users } from '../data/mockData';
import { getCircleMembers, getMentionableCircles } from '../data/pawCircleChat';

export type ForwardDest =
  | { type: 'circle'; id: string; label: string }
  | { type: 'community'; id: string; label: string }
  | { type: 'member'; id: string; label: string };

type ForwardStep = 'home' | 'circles' | 'communities' | 'member_circles' | 'members';

const DEST_TYPES: {
  id: 'circles' | 'communities' | 'member_circles';
  label: string;
  sub: string;
  icon: string;
  tint: string;
  iconBg: string;
}[] = [
  { id: 'circles', label: 'Paw Circle', sub: 'Share to circle chat', icon: 'circles', tint: '#14A697', iconBg: '#D6F5EE' },
  { id: 'communities', label: 'Community', sub: 'Your groups', icon: 'communities', tint: '#7C5CBF', iconBg: '#F0EBFA' },
  { id: 'member_circles', label: 'Circle member', sub: 'Choose a circle, then a person', icon: 'user', tint: '#F2972E', iconBg: '#FDF4E4' },
];

function getMembersForCircle(circle: PawCircle) {
  return getCircleMembers(circle.id, circle).filter(m => m.userId !== 'you');
}

export function ForwardSheet({
  visible,
  previewAuthorId,
  previewText,
  createdCircles,
  joinedCircles,
  joinedCommunities,
  onClose,
  onSelect,
}: {
  visible: boolean;
  previewAuthorId: string;
  previewText: string;
  createdCircles: PawCircle[];
  joinedCircles: PawCircle[];
  joinedCommunities: Community[];
  onClose: () => void;
  onSelect: (dest: ForwardDest) => void;
}) {
  const { colors, iconBg } = useTheme();
  const author = users[previewAuthorId];

  const [step, setStep] = useState<ForwardStep>('home');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [memberCircle, setMemberCircle] = useState<PawCircle | null>(null);

  const circles = useMemo(
    () => getMentionableCircles(createdCircles, joinedCircles),
    [createdCircles, joinedCircles],
  );

  const circleMembers = useMemo(
    () => (memberCircle ? getMembersForCircle(memberCircle) : []),
    [memberCircle],
  );

  const filteredCircles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return circles;
    return circles.filter(c => c.name.toLowerCase().includes(q));
  }, [circles, query]);

  const filteredCommunities = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return joinedCommunities;
    return joinedCommunities.filter(c => c.name.toLowerCase().includes(q));
  }, [joinedCommunities, query]);

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return circleMembers;
    return circleMembers.filter(m => {
      const u = users[m.userId];
      if (!u) return false;
      return u.name.toLowerCase().includes(q) || u.handle.toLowerCase().includes(q);
    });
  }, [circleMembers, query]);

  const homeSearchMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: { userId: string; circleName: string }[] = [];
    const seen = new Set<string>();
    for (const c of circles) {
      getMembersForCircle(c).forEach(m => {
        const u = users[m.userId];
        if (!u) return;
        const key = `${m.userId}-${c.id}`;
        if (seen.has(key)) return;
        if (
          u.name.toLowerCase().includes(q)
          || u.handle.toLowerCase().includes(q)
          || c.name.toLowerCase().includes(q)
        ) {
          seen.add(key);
          out.push({ userId: m.userId, circleName: c.name });
        }
      });
    }
    return out;
  }, [circles, query]);

  const homeSearchActive = step === 'home' && searchOpen && query.trim().length > 0;
  const homeFilteredCircles = homeSearchActive ? filteredCircles : [];
  const homeFilteredCommunities = homeSearchActive ? filteredCommunities : [];

  const availableDestTypes = DEST_TYPES.filter(d => {
    if (d.id === 'communities') return joinedCommunities.length > 0;
    return circles.length > 0;
  });

  const hasAny = availableDestTypes.length > 0;
  const showSearch = searchOpen;

  const searchPlaceholder = (() => {
    if (step === 'home') return 'Search circles, groups, or members…';
    if (step === 'members' && memberCircle) return `Search in ${memberCircle.name}…`;
    return `Search ${stepTitle.toLowerCase()}…`;
  })();

  const toggleSearch = () => {
    setSearchOpen(v => {
      if (v) setQuery('');
      return !v;
    });
  };

  useEffect(() => {
    if (!visible) {
      setStep('home');
      setQuery('');
      setSearchOpen(false);
      setMemberCircle(null);
    }
  }, [visible]);

  const goBack = () => {
    if (step === 'members' && memberCircle) {
      setMemberCircle(null);
      setStep('member_circles');
      setQuery('');
      return;
    }
    setStep('home');
    setQuery('');
    setSearchOpen(false);
    setMemberCircle(null);
  };

  const openDestType = (id: typeof DEST_TYPES[number]['id']) => {
    setQuery('');
    setSearchOpen(false);
    setMemberCircle(null);
    setStep(id);
  };

  const pickCircle = (c: PawCircle) => {
    onSelect({ type: 'circle', id: c.id, label: c.name });
  };

  const pickCommunity = (c: Community) => {
    onSelect({ type: 'community', id: c.id, label: c.name });
  };

  const pickMemberCircle = (c: PawCircle) => {
    setMemberCircle(c);
    setStep('members');
    setQuery('');
  };

  const pickMember = (userId: string, name: string) => {
    onSelect({ type: 'member', id: userId, label: name });
  };

  const stepTitle = (() => {
    switch (step) {
      case 'circles': return 'Paw Circle';
      case 'communities': return 'Community';
      case 'member_circles': return 'Which circle?';
      case 'members': return memberCircle?.name ?? 'Circle member';
      default: return 'Forward';
    }
  })();

  const renderRow = (
    key: string,
    onPress: () => void,
    leading: React.ReactNode,
    title: string,
    subtitle: string,
    showDivider: boolean,
    showChevron = false,
  ) => (
    <Pressable
      key={key}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        showDivider && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
        pressed && { opacity: 0.72 },
      ]}
    >
      {leading}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.rowSub, { color: colors.textTertiary }]} numberOfLines={1}>{subtitle}</Text>
        ) : null}
      </View>
      {showChevron && <Icon name="chevronRight" size={14} color={colors.textTertiary} />}
    </Pressable>
  );

  const listEmpty = (msg: string) => (
    <Text style={[styles.emptyText, { color: colors.textTertiary }]}>{msg}</Text>
  );

  return (
    <Sheet visible={visible} onClose={onClose} contentKey={step}>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          {step !== 'home' ? (
            <Pressable onPress={goBack} hitSlop={8} style={styles.backBtn}>
              <Icon name="chevronLeft" size={18} color={colors.textSecondary} />
            </Pressable>
          ) : (
            <View style={styles.backBtn} />
          )}
          <Text style={[styles.title, { color: colors.text, flex: 1 }]} numberOfLines={1}>
            {stepTitle}
          </Text>
          <IconButton
            name="search"
            size={36}
            tone={searchOpen ? 'primary' : 'soft'}
            color={searchOpen ? colors.primary : colors.textSecondary}
            onPress={toggleSearch}
          />
        </View>

        {step === 'home' && (
          <View style={[styles.preview, { backgroundColor: colors.surface2 }]}>
            <Avatar user={author} size={32} />
            <Text style={[styles.previewText, { color: colors.textSecondary }]} numberOfLines={3}>
              {previewText}
            </Text>
          </View>
        )}

        {showSearch && (
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
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={6}>
                <Icon name="close" size={14} color={colors.textTertiary} />
              </Pressable>
            )}
          </View>
        )}

        {step === 'home' && !hasAny && listEmpty('Join a Paw Circle or community to forward posts.')}

        {step === 'home' && hasAny && !homeSearchActive && (
          <View style={styles.destList}>
            {availableDestTypes.map((dest, i) => renderRow(
              dest.id,
              () => openDestType(dest.id),
              (
                <View style={[styles.rowIcon, { backgroundColor: iconBg(dest.iconBg) }]}>
                  <Icon name={dest.icon} size={15} color={dest.tint} />
                </View>
              ),
              dest.label,
              dest.sub,
              i > 0,
              true,
            ))}
          </View>
        )}

        {homeSearchActive && (
          <ScrollView
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            {homeFilteredCircles.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>Paw Circle</Text>
                {homeFilteredCircles.map((c, i) => renderRow(
                  `circle-${c.id}`,
                  () => pickCircle(c),
                  (
                    <View style={[styles.rowIcon, { backgroundColor: iconBg(c.iconBg) }]}>
                      <Icon name={c.icon} size={15} color={c.tint} />
                    </View>
                  ),
                  c.name,
                  'Share to circle chat',
                  i > 0,
                ))}
              </View>
            )}

            {homeFilteredCommunities.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>Community</Text>
                {homeFilteredCommunities.map((c, i) => renderRow(
                  `community-${c.id}`,
                  () => pickCommunity(c),
                  (
                    <View style={[styles.rowIcon, { backgroundColor: c.tint + '22' }]}>
                      <Icon name={c.icon} size={15} color={c.tint} />
                    </View>
                  ),
                  c.name,
                  `${c.members} members`,
                  i > 0,
                ))}
              </View>
            )}

            {homeSearchMembers.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>Circle member</Text>
                {homeSearchMembers.map((m, i) => {
                  const u = users[m.userId];
                  if (!u) return null;
                  return renderRow(
                    `member-${m.userId}-${m.circleName}`,
                    () => pickMember(m.userId, u.name),
                    <Avatar user={u} size={32} />,
                    u.name,
                    `via ${m.circleName}`,
                    i > 0,
                  );
                })}
              </View>
            )}

            {homeFilteredCircles.length === 0
              && homeFilteredCommunities.length === 0
              && homeSearchMembers.length === 0
              && listEmpty('No matches — try a circle, group, or member name')}
          </ScrollView>
        )}

        {step === 'circles' && (
          <ScrollView
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={filteredCircles.length > 6}
          >
            {filteredCircles.map((c, i) => renderRow(
              c.id,
              () => pickCircle(c),
              (
                <View style={[styles.rowIcon, { backgroundColor: iconBg(c.iconBg) }]}>
                  <Icon name={c.icon} size={15} color={c.tint} />
                </View>
              ),
              c.name,
              'Share to circle chat',
              i > 0,
            ))}
            {filteredCircles.length === 0 && listEmpty(query ? 'No circles match your search' : 'No circles available')}
          </ScrollView>
        )}

        {step === 'communities' && (
          <ScrollView
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={filteredCommunities.length > 6}
          >
            {filteredCommunities.map((c, i) => renderRow(
              c.id,
              () => pickCommunity(c),
              (
                <View style={[styles.rowIcon, { backgroundColor: c.tint + '22' }]}>
                  <Icon name={c.icon} size={15} color={c.tint} />
                </View>
              ),
              c.name,
              `${c.members} members`,
              i > 0,
            ))}
            {filteredCommunities.length === 0 && listEmpty(query ? 'No groups match your search' : 'No communities joined')}
          </ScrollView>
        )}

        {step === 'member_circles' && (
          <ScrollView
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={filteredCircles.length > 6}
          >
            {filteredCircles.map((c, i) => renderRow(
              c.id,
              () => pickMemberCircle(c),
              (
                <View style={[styles.rowIcon, { backgroundColor: iconBg(c.iconBg) }]}>
                  <Icon name={c.icon} size={15} color={c.tint} />
                </View>
              ),
              c.name,
              `${c.memberCount} members`,
              i > 0,
              true,
            ))}
            {filteredCircles.length === 0 && listEmpty(query ? 'No circles match your search' : 'Join a Paw Circle first')}
          </ScrollView>
        )}

        {step === 'members' && memberCircle && (
          <ScrollView
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={filteredMembers.length > 6}
          >
            {filteredMembers.map((m, i) => {
              const u = users[m.userId];
              if (!u) return null;
              return renderRow(
                m.userId,
                () => pickMember(m.userId, u.name),
                <Avatar user={u} size={32} />,
                u.name,
                `@${u.handle}`,
                i > 0,
              );
            })}
            {filteredMembers.length === 0 && listEmpty(
              query ? 'No members match your search' : 'No other members in this circle',
            )}
          </ScrollView>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 8 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '700' },
  preview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 8,
  },
  previewText: { flex: 1, fontSize: 13.5, lineHeight: 19 },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    paddingVertical: 0,
    ...Platform.select({
      web: { outlineStyle: 'none' } as object,
      default: {},
    }),
  },
  destList: { marginTop: 4 },
  section: { marginTop: 8 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  list: { maxHeight: 320 },
  emptyText: { fontSize: 14, lineHeight: 20, paddingVertical: 20, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 14, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 1 },
});
