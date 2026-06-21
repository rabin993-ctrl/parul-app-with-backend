import React from 'react';
import {
  View, Text, Pressable, Modal, StyleSheet, Dimensions, Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows, sheetLayout } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import { AppHeaderIconButton } from '../ui/AppSubHeader';
import { ModalPresent } from '../ui/ModalScrim';
import {
  COMMUNITY_FILTER_TOPIC_OPTIONS,
  CommunityCategory,
  CommunityFeedFilter,
  getCategoryMeta,
  getCommunityPostLabelMeta,
} from '../../data/communityPosts';
import type { Community } from '../../data/mockData';

const FILTER_POPUP_H_PAD = 16;
const FILTER_POPUP_WIDTH = Dimensions.get('window').width - FILTER_POPUP_H_PAD * 2;

function FilterChip({
  label,
  icon,
  tint,
  bg,
  selected,
  onPress,
}: {
  label: string;
  icon: string;
  tint: string;
  bg: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors, iconBg } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterChip,
        {
          backgroundColor: selected ? iconBg(bg) : colors.surface2,
        },
      ]}
    >
      <Icon
        name={icon}
        size={13}
        color={selected ? tint : colors.textSecondary}
      />
      <Text
        style={[
          styles.filterChipLabel,
          { color: selected ? colors.text : colors.textSecondary },
          selected && { fontWeight: '700' },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function CommunityFilterPopup({
  visible,
  anchor,
  filter,
  joinedGroups,
  onChange,
  onClose,
  onReset,
}: {
  visible: boolean;
  anchor: { top: number };
  filter: CommunityFeedFilter;
  joinedGroups: Community[];
  onChange: (next: CommunityFeedFilter) => void;
  onClose: () => void;
  onReset: () => void;
}) {
  const { colors } = useTheme();
  const customized = filter.groupId !== 'all' || filter.topics.length > 0;
  const neutralTint = colors.text;
  const neutralBg = colors.surface2;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <ModalPresent onDismiss={onClose} style={styles.popupOverlay} animatedScale={false}>
        <View
          style={[
            styles.filterPopupCard,
            {
              top: anchor.top,
              left: FILTER_POPUP_H_PAD,
              width: FILTER_POPUP_WIDTH,
              backgroundColor: colors.surface,
              ...shadows.md,
            },
          ]}
        >
          <View style={styles.filterPopupHeader}>
            <Text style={[styles.filterPopupTitle, { color: colors.text }]}>Filter posts</Text>
            {customized && (
              <Pressable onPress={onReset} hitSlop={8}>
                <Text style={[styles.filterPopupClear, { color: colors.textSecondary }]}>Clear</Text>
              </Pressable>
            )}
          </View>

          <Text style={[styles.popupSectionLabel, { color: colors.textSecondary }]}>Group</Text>
          <View style={styles.popupChipRow}>
            <FilterChip
              label="All"
              icon="communities"
              tint={neutralTint}
              bg={neutralBg}
              selected={filter.groupId === 'all'}
              onPress={() => onChange({ ...filter, groupId: 'all' })}
            />
            {joinedGroups.map(g => (
              <FilterChip
                key={g.id}
                label={g.name}
                icon={g.icon}
                tint={g.tint}
                bg={g.tint + '22'}
                selected={filter.groupId === g.id}
                onPress={() => onChange({ ...filter, groupId: g.id })}
              />
            ))}
          </View>

          <Text style={[styles.popupSectionLabel, { color: colors.textSecondary, marginTop: 12 }]}>Topic</Text>
          <View style={styles.popupChipRow}>
            {COMMUNITY_FILTER_TOPIC_OPTIONS.map(topic => {
              const selected = filter.topics.includes(topic.id);
              return (
                <FilterChip
                  key={topic.id}
                  label={topic.label}
                  icon={topic.icon}
                  tint={topic.tint}
                  bg={topic.bg}
                  selected={selected}
                  onPress={() => {
                    const next = selected
                      ? filter.topics.filter(t => t !== topic.id)
                      : [...filter.topics, topic.id];
                    onChange({ ...filter, topics: next });
                  }}
                />
              );
            })}
          </View>
        </View>
      </ModalPresent>
    </Modal>
  );
}

export function CommunityFeedToolbar({
  onSearch,
  onSettings,
  showSearch = true,
}: {
  onSearch?: () => void;
  onSettings: () => void;
  showSearch?: boolean;
}) {
  return (
    <View style={styles.toolbar}>
      <View style={{ flex: 1 }} />
      {showSearch && onSearch && (
        <AppHeaderIconButton name="search" size={40} onPress={onSearch} accessibilityLabel="Search" />
      )}
      <AppHeaderIconButton name="settings" size={40} onPress={onSettings} accessibilityLabel="Settings" />
    </View>
  );
}

export function CommunityLensChrome({ children }: { children: React.ReactNode }) {
  return <View style={styles.lensChrome}>{children}</View>;
}

export function CommunityCategoryBadge({ category }: { category: CommunityCategory }) {
  const { iconBg } = useTheme();
  const meta = getCategoryMeta(category);
  return (
    <View style={[styles.badge, { backgroundColor: iconBg(meta.bg) }]}>
      <Icon name={meta.icon} size={12} color={meta.tint} />
      <Text style={[styles.badgeText, { color: meta.tint }]}>{meta.label}</Text>
    </View>
  );
}

export function CommunityPostLabelBadge({ post }: { post: import('../../data/communityPosts').CommunityPost }) {
  const { iconBg } = useTheme();
  const meta = getCommunityPostLabelMeta(post);
  return (
    <View style={[styles.badge, { backgroundColor: iconBg(meta.bg) }]}>
      <Icon name={meta.icon} size={12} color={meta.tint} />
      <Text style={[styles.badgeText, { color: meta.tint }]}>{meta.label}</Text>
    </View>
  );
}

export function SettingsRow({
  icon,
  label,
  hint,
  onPress,
  trailing,
  destructive,
}: {
  icon: string;
  label: string;
  hint?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  destructive?: boolean;
}) {
  const { colors } = useTheme();
  const content = (
    <View style={[styles.settingsRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.settingsIcon, { backgroundColor: colors.surface2 }]}>
        <Icon name={icon} size={18} color={destructive ? colors.danger : colors.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.settingsLabel, { color: destructive ? colors.danger : colors.text }]}>
          {label}
        </Text>
        {hint ? (
          <Text style={[styles.settingsHint, { color: colors.textSecondary }]} numberOfLines={2}>{hint}</Text>
        ) : null}
      </View>
      {trailing ?? (onPress ? <Icon name="chevronRight" size={18} color={colors.textTertiary} /> : null)}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
      {content}
    </Pressable>
  );
}

export function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.settingsSection}>
      <Text style={[styles.settingsSectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lensChrome: {
    paddingHorizontal: 16,
    paddingTop: 6,
    gap: 6,
    ...Platform.select({
      web: { userSelect: 'none' as const },
      default: {},
    }),
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 0,
  },
  popupOverlay: { flex: 1, position: 'relative' },
  filterPopupCard: {
    position: 'absolute',
    borderRadius: radius.lg,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 12,
    maxHeight: sheetLayout.listScrollMax,
  },
  filterPopupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  filterPopupTitle: { fontSize: 14, fontWeight: '700' },
  filterPopupClear: { fontSize: 13, fontWeight: '600' },
  popupSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  popupChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radius.full,
  },
  filterChipLabel: { flexShrink: 1, fontSize: 12, fontWeight: '600' },
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
  settingsSection: { gap: 8, marginBottom: 20 },
  settingsSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 4,
  },
  settingsCard: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingsIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsLabel: { fontSize: 15, fontWeight: '600' },
  settingsHint: { fontSize: 12.5, marginTop: 2, lineHeight: 17 },
});
