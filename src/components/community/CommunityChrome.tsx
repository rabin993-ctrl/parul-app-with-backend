import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import { Avatar } from '../ui/Avatar';
import { SlidingSegmentControl } from '../ui/SlidingSegmentControl';
import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_SORTS,
  CommunityCategory,
  CommunitySort,
  getCategoryMeta,
} from '../../data/communityPosts';
import { users } from '../../data/mockData';

export function CommunityToolbar({
  sort,
  onSortChange,
  onSearch,
  onRules,
  onGroups,
  onCreate,
}: {
  sort: CommunitySort;
  onSortChange: (s: CommunitySort) => void;
  onSearch: () => void;
  onRules: () => void;
  onGroups: () => void;
  onCreate: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.toolbar}>
      <View style={styles.toolbarTop}>
        <Text style={[styles.toolbarTitle, { color: colors.text }]}>Community</Text>
        <View style={styles.toolbarActions}>
          <Pressable
            onPress={onGroups}
            style={({ pressed }) => [styles.iconChip, { backgroundColor: colors.surface2, opacity: pressed ? 0.75 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Browse groups"
          >
            <Icon name="communities" size={18} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={onSearch}
            style={({ pressed }) => [styles.iconChip, { backgroundColor: colors.surface2, opacity: pressed ? 0.75 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Search community"
          >
            <Icon name="search" size={18} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={onRules}
            style={({ pressed }) => [styles.iconChip, { backgroundColor: colors.surface2, opacity: pressed ? 0.75 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Community guidelines"
          >
            <Icon name="shield" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <Pressable
        onPress={onCreate}
        style={({ pressed }) => [
          styles.composer,
          { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Avatar user={users.you} size={32} />
        <Text style={[styles.composerHint, { color: colors.textSecondary }]}>
          Start a discussion…
        </Text>
        <Icon name="edit" size={18} color={colors.primary} />
      </Pressable>

      <SlidingSegmentControl
        items={COMMUNITY_SORTS.map(s => ({ id: s.id, label: s.label }))}
        value={sort}
        onChange={id => onSortChange(id as CommunitySort)}
      />
    </View>
  );
}

export function CommunityCategoryRow({
  active,
  onChange,
}: {
  active: CommunityCategory | 'all';
  onChange: (id: CommunityCategory | 'all') => void;
}) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoryRow}
    >
      {COMMUNITY_CATEGORIES.map(cat => {
        const on = active === cat.id;
        return (
          <Pressable
            key={cat.id}
            onPress={() => onChange(cat.id)}
            style={({ pressed }) => [
              styles.categoryChip,
              {
                backgroundColor: on ? cat.bg : colors.surface2,
                borderColor: on ? cat.tint + '44' : 'transparent',
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Icon name={cat.icon} size={14} color={on ? cat.tint : colors.textSecondary} />
            <Text style={[styles.categoryLabel, { color: on ? cat.tint : colors.textSecondary }]}>
              {cat.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function CommunityCategoryBadge({ category }: { category: CommunityCategory }) {
  const meta = getCategoryMeta(category);
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      <Icon name={meta.icon} size={12} color={meta.tint} />
      <Text style={[styles.badgeText, { color: meta.tint }]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: { gap: 12, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  toolbarTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toolbarTitle: { fontSize: 20, fontWeight: '800' },
  toolbarActions: { flexDirection: 'row', gap: 8 },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  composerHint: { flex: 1, fontSize: 13.5 },
  categoryRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 10 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  categoryLabel: { fontSize: 12.5, fontWeight: '600' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 11.5, fontWeight: '700' },
});
