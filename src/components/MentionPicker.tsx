import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, TextInput, ScrollView, StyleSheet, Platform, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { radius, shadows } from '../theme/tokens';
import { Icon } from './icons/Icon';
import { Avatar } from './ui/Avatar';
import { PawCircle } from '../data/pawCircles';
import { communities as allCommunities } from '../data/mockData';
import { users } from '../data/mockData';
import { getCircleMembers, getMentionableCircles } from '../data/pawCircleChat';

export type MentionCategory = 'community' | 'circle' | 'member';

const CATEGORIES: {
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

function shortCircleName(name: string) {
  return name.replace(/\s+Paw Circle$/i, '');
}

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
};

export function MentionPicker({
  visible,
  onClose,
  onSelect,
  createdCircles,
  joinedCircles,
}: MentionPickerProps) {
  const { colors, scrim, iconBg } = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'category' | 'member_circle' | 'results'>('category');
  const [category, setCategory] = useState<MentionCategory | null>(null);
  const [memberCircle, setMemberCircle] = useState<PawCircle | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) {
      setStep('category');
      setCategory(null);
      setMemberCircle(null);
      setQuery('');
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

  const categoryMeta = CATEGORIES.find(c => c.id === category);

  const filteredCircles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return circles;
    return circles.filter(c => c.name.toLowerCase().includes(q) || shortCircleName(c.name).toLowerCase().includes(q));
  }, [circles, query]);

  const filteredCommunities = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return joinedCommunities;
    return joinedCommunities.filter(c => c.name.toLowerCase().includes(q));
  }, [joinedCommunities, query]);

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(m => {
      const u = users[m.userId];
      if (!u) return false;
      return u.name.toLowerCase().includes(q) || u.handle.toLowerCase().includes(q);
    });
  }, [members, query]);

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
    onClose();
  };

  const resultCount =
    category === 'circle' ? filteredCircles.length
      : category === 'community' ? filteredCommunities.length
        : category === 'member' ? filteredMembers.length
          : 0;

  const panel = (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: colors.surface,
          ...shadows.md,
        },
      ]}
      onStartShouldSetResponder={() => true}
    >
      {step === 'member_circle' ? (
        <>
          <View style={styles.stepHeader}>
            <Pressable onPress={goBack} hitSlop={8} style={styles.backBtn}>
              <Icon name="chevronLeft" size={18} color={colors.textSecondary} />
            </Pressable>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Which circle?</Text>
          </View>
          <ScrollView
            style={styles.results}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={circles.length > 5}
          >
            {circles.map(c => (
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
            {circles.length === 0 && (
              <Text style={[styles.empty, { color: colors.textTertiary }]}>Join a Paw Circle first</Text>
            )}
          </ScrollView>
        </>
      ) : step === 'category' ? (
        <View style={styles.categoryList}>
          {CATEGORIES.map((cat, i) => (
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
          ))}
        </View>
      ) : (
        <>
          <View style={styles.searchHeader}>
            <Pressable onPress={goBack} hitSlop={8} style={styles.backBtn}>
              <Icon name="chevronLeft" size={18} color={colors.textSecondary} />
            </Pressable>
            <View style={[styles.searchField, { backgroundColor: colors.surface2 }]}>
              <Icon name="search" size={15} color={colors.textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={
                  category === 'member' && memberCircle
                    ? `Search in ${shortCircleName(memberCircle.name)}…`
                    : `Search ${categoryMeta?.label.toLowerCase() ?? ''}…`
                }
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
          </View>

          <ScrollView
            style={styles.results}
            keyboardShouldPersistTaps="handled"
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
                  <Avatar user={u} size={32} showBadge={false} />
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
    </View>
  );

  return (
    <Modal
      visible={visible}
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
    maxHeight: 280,
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
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 8,
  },
  stepTitle: { fontSize: 14.5, fontWeight: '600', flex: 1 },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 6,
  },
  backBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
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
});
