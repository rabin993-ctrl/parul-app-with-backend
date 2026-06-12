import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, Pressable, Modal, StyleSheet, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import { IconButton } from '../ui/Button';
import {
  CommunityComposerLabel,
  CommunityFeedFilter,
  DEFAULT_COMMUNITY_FILTER,
  formatCommunityFilterSummary,
} from '../../data/communityPosts';
import type { Community } from '../../data/mockData';
import { CommunityFilterPopup } from './CommunityChrome';

/** Matches feed POST_CATEGORIES minus adoption and discussion. */
const PLUS_MENU_ITEMS: {
  id: CommunityComposerLabel;
  label: string;
  icon: string;
  tint: string;
  iconBg: string;
  fill?: boolean;
}[] = [
  { id: 'lost', label: 'Lost', icon: 'alert', tint: '#E5424F', iconBg: '#FFD4D4' },
  { id: 'found', label: 'Found', icon: 'check', tint: '#2FA46A', iconBg: '#D6F5E8', fill: true },
  { id: 'rescue', label: 'Rescue', icon: 'shield', tint: '#E5424F', iconBg: '#FFE8E8' },
  { id: 'meme', label: 'Meme', icon: 'sparkle', tint: '#7A5AE0', iconBg: '#EDE8FC' },
];

function PostCategoryPopup({
  visible,
  anchor,
  onClose,
  onSelect,
}: {
  visible: boolean;
  anchor: { x: number; top: number };
  onClose: () => void;
  onSelect: (id: CommunityComposerLabel) => void;
}) {
  const { colors, scrim, iconBg } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.popupOverlay}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: scrim }]} />
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

          <Text style={[styles.popupSectionLabel, { color: colors.textTertiary }]}>New post</Text>

          {PLUS_MENU_ITEMS.map(item => (
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
                  fill={item.fill ? item.tint : 'none'}
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

export function CommunityComposerBar({
  filter,
  joinedGroups,
  onFilterChange,
  onOpen,
  onTopicSelect,
  onSettings,
  onDiscover,
  hideComposer = false,
}: {
  filter: CommunityFeedFilter;
  joinedGroups: Community[];
  onFilterChange: (next: CommunityFeedFilter) => void;
  onOpen: () => void;
  onTopicSelect: (label: CommunityComposerLabel) => void;
  onSettings?: () => void;
  onDiscover?: () => void;
  hideComposer?: boolean;
}) {
  const { colors } = useTheme();
  const plusRef = useRef<View>(null);
  const filterRef = useRef<View>(null);
  const [categoryPopupOpen, setCategoryPopupOpen] = useState(false);
  const [filterPopupOpen, setFilterPopupOpen] = useState(false);
  const [categoryAnchor, setCategoryAnchor] = useState({ x: 16, top: 100 });
  const [filterAnchor, setFilterAnchor] = useState({ top: 100 });

  const filterActive = filter.groupId !== 'all' || filter.topics.length > 0;

  const openCategoryPopup = () => {
    setFilterPopupOpen(false);
    plusRef.current?.measureInWindow((x, y, _w, height) => {
      setCategoryAnchor({ x, top: y + height + 6 });
      setCategoryPopupOpen(true);
    });
  };

  const openFilterPopup = () => {
    setCategoryPopupOpen(false);
    filterRef.current?.measureInWindow((_x, y, _w, height) => {
      setFilterAnchor({ top: y + height + 6 });
      setFilterPopupOpen(prev => !prev);
    });
  };

  useFocusEffect(useCallback(() => () => {
    setCategoryPopupOpen(false);
    setFilterPopupOpen(false);
  }, []));

  return (
    <View style={styles.composerRow}>
      {!hideComposer && (
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
      )}

      {/* Wide filter pill — same style as RescueFilterSummary */}
      <Pressable
        ref={filterRef}
        onPress={openFilterPopup}
        style={({ pressed }) => [
          styles.filterPill,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <Icon name="sliders" size={15} color={filterActive ? colors.primary : colors.textSecondary} />
        <Text style={[styles.filterPillText, { color: colors.text }]} numberOfLines={1}>
          {formatCommunityFilterSummary(filter)}
        </Text>
        <Icon name="chevronDown" size={14} color={colors.textTertiary} />
      </Pressable>

      {onDiscover && (
        <IconButton
          name="communities"
          size={40}
          tone="soft"
          color={colors.textSecondary}
          onPress={onDiscover}
        />
      )}

      {onSettings && (
        <IconButton
          name="settings"
          size={40}
          tone="soft"
          color={colors.textSecondary}
          onPress={onSettings}
        />
      )}

      {!hideComposer && (
        <PostCategoryPopup
          visible={categoryPopupOpen}
          anchor={categoryAnchor}
          onClose={() => setCategoryPopupOpen(false)}
          onSelect={id => {
            setCategoryPopupOpen(false);
            onTopicSelect(id);
          }}
        />
      )}

      <CommunityFilterPopup
        visible={filterPopupOpen}
        anchor={filterAnchor}
        filter={filter}
        joinedGroups={joinedGroups}
        onChange={onFilterChange}
        onClose={() => setFilterPopupOpen(false)}
        onReset={() => onFilterChange(DEFAULT_COMMUNITY_FILTER)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    ...Platform.select({
      web: { userSelect: 'none' as const },
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
  filterPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    ...shadows.sm,
    ...Platform.select({
      web: { cursor: 'pointer' as const, userSelect: 'none' as const },
      default: {},
    }),
  },
  filterPillText: { flex: 1, fontSize: 13, fontWeight: '600', minWidth: 0 },
  popupOverlay: { flex: 1, position: 'relative' },
  categoryPopupCard: {
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
});
