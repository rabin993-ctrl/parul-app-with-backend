import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, TextInput, ScrollView, StyleSheet, Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius, sheetLayout } from '../theme/tokens';
import { Button, IconButton } from './ui/Button';
import { Sheet } from './ui/Sheet';
import { Icon } from './icons/Icon';
import { Avatar } from './ui/Avatar';
import { PawCircle } from '../data/pawCircles';
import type { Community } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { usePawCircles } from '../context/PawCircleContext';
import { MENTION_CATEGORIES, type MentionCategory } from './MentionPicker';
import { shortCircleName } from '../utils/destinationSearch';
import { useAllCircleMembers } from '../hooks/useAllCircleMembers';
import {
  searchAllCircleMembers,
  searchCircles,
  searchCommunities,
} from '../utils/destinationSearch';

export type ForwardDest =
  | { type: 'circle'; id: string; dbId: string; label: string }
  | { type: 'community'; id: string; label: string }
  | { type: 'member'; id: string; label: string };

export function forwardDestKey(dest: ForwardDest) {
  return `${dest.type}:${dest.id}`;
}

type ForwardStep = 'home' | 'circles' | 'communities' | 'member_circles' | 'members';

function categoryToStep(id: MentionCategory): ForwardStep {
  switch (id) {
    case 'community': return 'communities';
    case 'circle': return 'circles';
    case 'member': return 'member_circles';
  }
}

type ForwardMemberRow = { userId: string; name?: string; handle?: string; tint?: string };

export function ForwardSheet({
  visible,
  createdCircles,
  joinedCircles,
  joinedCommunities,
  onClose,
  onSelect,
}: {
  visible: boolean;
  createdCircles: PawCircle[];
  joinedCircles: PawCircle[];
  joinedCommunities: Community[];
  onClose: () => void;
  onSelect: (dests: ForwardDest[], note?: string) => void;
}) {
  const { colors, iconBg } = useTheme();

  const { user } = useAuth();
  const { getDbId } = usePawCircles();

  const [step, setStep] = useState<ForwardStep>('home');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [memberCircle, setMemberCircle] = useState<PawCircle | null>(null);
  const [liveCircleMembers, setLiveCircleMembers] = useState<ForwardMemberRow[]>([]);
  const [selected, setSelected] = useState<ForwardDest[]>([]);

  const circles = useMemo(() => {
    const seen = new Set<string>();
    const all: PawCircle[] = [];
    for (const c of [...createdCircles, ...joinedCircles]) {
      if (!seen.has(c.id)) { seen.add(c.id); all.push(c); }
    }
    return all;
  }, [createdCircles, joinedCircles]);

  useEffect(() => {
    if (!memberCircle) { setLiveCircleMembers([]); return; }
    const dbId = getDbId(memberCircle.id);
    if (!dbId) {
      setLiveCircleMembers([]);
      return;
    }
    supabase
      .from('circle_members')
      .select('user_id, users(name, handle, tint)')
      .eq('circle_id', dbId)
      .then(({ data }) => {
        if (!data) { setLiveCircleMembers([]); return; }
        setLiveCircleMembers(
          (data as { user_id: string; users: { name: string; handle: string | null; tint: string | null } | null }[])
            .filter(row => row.user_id !== user?.id)
            .map(row => ({
              userId: row.user_id,
              name: row.users?.name,
              handle: row.users?.handle ?? undefined,
              tint: row.users?.tint ?? undefined,
            })),
        );
      });
  }, [memberCircle, getDbId, user?.id]);

  const selectedKeys = useMemo(() => new Set(selected.map(forwardDestKey)), [selected]);

  const categoryMeta = MENTION_CATEGORIES.find(c => {
    if (step === 'communities') return c.id === 'community';
    if (step === 'circles') return c.id === 'circle';
    if (step === 'members' || step === 'member_circles') return c.id === 'member';
    return false;
  });

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
    if (!q) return liveCircleMembers;
    return liveCircleMembers.filter(m => {
      const name = m.name ?? '';
      const handle = m.handle ?? '';
      return name.toLowerCase().includes(q) || handle.toLowerCase().includes(q);
    });
  }, [liveCircleMembers, query]);

  const memberIndexEnabled = visible && searchOpen && step === 'home';
  const allCircleMembers = useAllCircleMembers(circles, memberIndexEnabled);

  const homeSearchMembers = useMemo(
    () => searchAllCircleMembers(circles, query, allCircleMembers),
    [circles, query, allCircleMembers],
  );

  const homeSearchActive = step === 'home' && searchOpen && query.trim().length > 0;

  const stepTitle = (() => {
    switch (step) {
      case 'circles': return 'Paw Circle';
      case 'communities': return 'Community';
      case 'member_circles': return 'Which circle?';
      case 'members': return memberCircle ? shortCircleName(memberCircle.name) : 'Circle member';
      default: return 'Share';
    }
  })();

  const searchPlaceholder = (() => {
    if (step === 'home') return 'Search circles, groups, or members…';
    if (step === 'members' && memberCircle) {
      return `Search in ${shortCircleName(memberCircle.name)}…`;
    }
    if (step === 'member_circles') return 'Search circles…';
    return `Search ${categoryMeta?.label.toLowerCase() ?? ''}…`;
  })();

  useEffect(() => {
    if (!visible) {
      setStep('home');
      setQuery('');
      setSearchOpen(false);
      setMemberCircle(null);
      setSelected([]);
    }
  }, [visible]);

  const toggleSearch = () => {
    setSearchOpen(v => {
      if (v) setQuery('');
      return !v;
    });
  };

  const goBack = () => {
    if (step === 'members' && memberCircle) {
      setMemberCircle(null);
      setStep('member_circles');
      setQuery('');
      return;
    }
    setStep('home');
    setQuery('');
    setMemberCircle(null);
  };

  const openCategory = (id: MentionCategory) => {
    setQuery('');
    setMemberCircle(null);
    setStep(categoryToStep(id));
  };

  const toggleDest = (dest: ForwardDest) => {
    const key = forwardDestKey(dest);
    setSelected(prev => (
      prev.some(d => forwardDestKey(d) === key)
        ? prev.filter(d => forwardDestKey(d) !== key)
        : [...prev, dest]
    ));
  };

  const pickMemberCircle = (c: PawCircle) => {
    setMemberCircle(c);
    setStep('members');
    setQuery('');
  };

  const confirmForward = () => {
    if (selected.length === 0) return;
    onSelect(selected);
    onClose();
  };

  const renderCheck = (on: boolean) => (
    <View
      style={[
        styles.check,
        {
          borderColor: on ? colors.primary : colors.border,
          backgroundColor: on ? colors.primary : 'transparent',
        },
      ]}
    >
      {on ? <Icon name="check" size={12} color={colors.onPrimary} /> : null}
    </View>
  );

  const renderRow = (
    key: string,
    onPress: () => void,
    leading: React.ReactNode,
    title: string,
    subtitle: string,
    showDivider: boolean,
    opts?: { showChevron?: boolean; selected?: boolean; selectable?: boolean },
  ) => (
    <Pressable
      key={key}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        showDivider && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
        pressed && { backgroundColor: colors.surface2 },
        opts?.selected && { backgroundColor: colors.primary + '10' },
      ]}
    >
      {leading}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.rowSub, { color: colors.textTertiary }]} numberOfLines={1}>{subtitle}</Text>
        ) : null}
      </View>
      {opts?.selectable ? renderCheck(!!opts.selected) : null}
      {opts?.showChevron ? <Icon name="chevronRight" size={14} color={colors.textTertiary} /> : null}
    </Pressable>
  );

  const listEmpty = (msg: string) => (
    <Text style={[styles.emptyText, { color: colors.textTertiary }]}>{msg}</Text>
  );

  const searchField = (
    <View style={[styles.searchField, { backgroundColor: colors.surface2 }]}>
      <Icon name="search" size={18} color={colors.textTertiary} />
      <TextInput
        style={[styles.searchInput, { color: colors.text }]}
        placeholder={searchPlaceholder}
        placeholderTextColor={colors.textTertiary}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {query.length > 0 && (
        <Pressable onPress={() => setQuery('')} hitSlop={6}>
          <Icon name="close" size={14} color={colors.textTertiary} />
        </Pressable>
      )}
    </View>
  );

  const sheetContentKey = `${step}-${memberCircle?.id ?? 'none'}-${searchOpen ? 's' : ''}`;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      contentKey={sheetContentKey}
      footer={(
        <Button
          variant="primary"
          onPress={confirmForward}
          disabled={selected.length === 0}
        >
          {selected.length > 0
            ? `Share to ${selected.length} ${selected.length === 1 ? 'place' : 'places'}`
            : 'Share'}
        </Button>
      )}
    >
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
            size={40}
            iconSize={20}
            tone={searchOpen ? 'primary' : 'ghost'}
            color={searchOpen ? colors.primary : colors.text}
            onPress={toggleSearch}
          />
        </View>

        {searchOpen && searchField}

        {step === 'home' && !homeSearchActive && (
          <View style={styles.destList}>
            {MENTION_CATEGORIES.map((cat, i) => renderRow(
              cat.id,
              () => openCategory(cat.id),
              (
                <View style={[styles.rowIcon, { backgroundColor: iconBg(cat.iconBg) }]}>
                  <Icon name={cat.icon} size={16} color={cat.tint} />
                </View>
              ),
              cat.label,
              cat.sub,
              i > 0,
              { showChevron: true },
            ))}
          </View>
        )}

        {homeSearchActive && (
          <ScrollView
            style={styles.list}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            {filteredCircles.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>Paw Circle</Text>
                {filteredCircles.map((c, i) => {
                  const dest: ForwardDest = { type: 'circle', id: c.id, dbId: getDbId(c.id) ?? '', label: c.name };
                  return renderRow(
                    `circle-${c.id}`,
                    () => toggleDest(dest),
                    (
                      <View style={[styles.rowIcon, { backgroundColor: iconBg(c.iconBg) }]}>
                        <Icon name={c.icon} size={15} color={c.tint} />
                      </View>
                    ),
                    c.name,
                    `${c.memberCount} members`,
                    i > 0,
                    { selectable: true, selected: selectedKeys.has(forwardDestKey(dest)) },
                  );
                })}
              </View>
            )}

            {filteredCommunities.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>Community</Text>
                {filteredCommunities.map((c, i) => {
                  const dest: ForwardDest = { type: 'community', id: c.id, label: c.name };
                  return renderRow(
                    `community-${c.id}`,
                    () => toggleDest(dest),
                    (
                      <View style={[styles.rowIcon, { backgroundColor: c.tint + '22' }]}>
                        <Icon name={c.icon} size={15} color={c.tint} />
                      </View>
                    ),
                    c.name,
                    `${c.members} members`,
                    i > 0,
                    { selectable: true, selected: selectedKeys.has(forwardDestKey(dest)) },
                  );
                })}
              </View>
            )}

            {homeSearchMembers.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>Circle member</Text>
                {homeSearchMembers.map((m, i) => {
                  const displayName = m.name ?? m.userId.slice(0, 8);
                  const displayUser = { id: m.userId, name: displayName, tint: m.tint ?? '#888888' };
                  const dest: ForwardDest = { type: 'member', id: m.userId, label: displayName };
                  return renderRow(
                    `member-${m.userId}-${m.circleId}`,
                    () => toggleDest(dest),
                    <Avatar user={displayUser} size={32} />,
                    displayName,
                    `via ${m.circleName}`,
                    i > 0,
                    { selectable: true, selected: selectedKeys.has(forwardDestKey(dest)) },
                  );
                })}
              </View>
            )}

            {filteredCircles.length === 0
              && filteredCommunities.length === 0
              && homeSearchMembers.length === 0
              && listEmpty('No matches — try a circle, group, or member name')}
          </ScrollView>
        )}

        {step === 'circles' && (
          <ScrollView
            style={styles.list}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
            showsVerticalScrollIndicator={filteredCircles.length > 6}
          >
            {filteredCircles.map((c, i) => {
              const dest: ForwardDest = { type: 'circle', id: c.id, dbId: getDbId(c.id) ?? '', label: c.name };
              return renderRow(
                c.id,
                () => toggleDest(dest),
                (
                  <View style={[styles.rowIcon, { backgroundColor: iconBg(c.iconBg) }]}>
                    <Icon name={c.icon} size={15} color={c.tint} />
                  </View>
                ),
                c.name,
                `${c.memberCount} members`,
                i > 0,
                { selectable: true, selected: selectedKeys.has(forwardDestKey(dest)) },
              );
            })}
            {filteredCircles.length === 0 && listEmpty(query ? 'No matches' : 'Join a Paw Circle first')}
          </ScrollView>
        )}

        {step === 'communities' && (
          <ScrollView
            style={styles.list}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
            showsVerticalScrollIndicator={filteredCommunities.length > 6}
          >
            {filteredCommunities.map((c, i) => {
              const dest: ForwardDest = { type: 'community', id: c.id, label: c.name };
              return renderRow(
                c.id,
                () => toggleDest(dest),
                (
                  <View style={[styles.rowIcon, { backgroundColor: c.tint + '22' }]}>
                    <Icon name={c.icon} size={15} color={c.tint} />
                  </View>
                ),
                c.name,
                `${c.members} members`,
                i > 0,
                { selectable: true, selected: selectedKeys.has(forwardDestKey(dest)) },
              );
            })}
            {filteredCommunities.length === 0 && listEmpty(query ? 'No matches' : 'No communities joined')}
          </ScrollView>
        )}

        {step === 'member_circles' && (
          <ScrollView
            style={styles.list}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
            showsVerticalScrollIndicator={filteredCircles.length > 6}
          >
            {(searchOpen ? filteredCircles : circles).map((c, i) => renderRow(
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
              { showChevron: true },
            ))}
            {(searchOpen ? filteredCircles : circles).length === 0 && listEmpty('Join a Paw Circle first')}
          </ScrollView>
        )}

        {step === 'members' && memberCircle && (
          <ScrollView
            style={styles.list}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
            showsVerticalScrollIndicator={filteredMembers.length > 6}
          >
            {filteredMembers.map((m, i) => {
              const displayName = m.name ?? m.userId.slice(0, 8);
              const displayHandle = m.handle;
              const displayUser = { id: m.userId, name: displayName, tint: m.tint ?? '#888888' };
              const dest: ForwardDest = { type: 'member', id: m.userId, label: displayName };
              return renderRow(
                m.userId,
                () => toggleDest(dest),
                <Avatar user={displayUser} size={32} />,
                displayName,
                displayHandle ? `@${displayHandle}` : '',
                i > 0,
                { selectable: true, selected: selectedKeys.has(forwardDestKey(dest)) },
              );
            })}
            {filteredMembers.length === 0 && listEmpty(query ? 'No matches' : 'No other members in this circle')}
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
  list: { maxHeight: sheetLayout.listScrollMax },
  emptyText: { fontSize: 14, lineHeight: 20, paddingVertical: 20, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
    paddingHorizontal: 2,
    borderRadius: radius.md,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 14.5, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 1 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
