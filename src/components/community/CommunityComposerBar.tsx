import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, Pressable, Modal, StyleSheet, Platform, Keyboard, Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import {
  CommunityFeedFilter,
  DEFAULT_COMMUNITY_FILTER,
} from '../../data/communityPosts';
import type { Community } from '../../data/mockData';
import { CommunityFilterPopup } from './CommunityChrome';
import { ModalPresent } from '../ui/ModalScrim';

const POST_CATEGORIES = [
  { id: 'rescue', label: 'Rescue', icon: 'shield', tint: '#E5424F', iconBg: '#FFE8E8' },
  { id: 'adoption', label: 'Adoption', icon: 'adoption', tint: '#E0503F', iconBg: '#FFE8CC' },
  { id: 'lost', label: 'Lost', icon: 'alert', tint: '#E5424F', iconBg: '#FFD4D4' },
  { id: 'found', label: 'Found', icon: 'check', tint: '#2FA46A', iconBg: '#D6F5E8' },
  { id: 'discussion', label: 'Discussion', icon: 'comment', tint: '#7C5CBF', iconBg: '#F0EBFA' },
  { id: 'meme', label: 'Meme', icon: 'sparkle', tint: '#7A5AE0', iconBg: '#EDE8FC' },
];

const CATEGORY_POPUP_WIDTH = 248;
const POPUP_EDGE_PAD = 16;

function anchorCategoryPopup(
  triggerX: number,
  triggerY: number,
  triggerWidth: number,
  triggerHeight: number,
) {
  const screenWidth = Dimensions.get('window').width;
  const idealLeft = triggerX + triggerWidth - CATEGORY_POPUP_WIDTH;
  const left = Math.max(
    POPUP_EDGE_PAD,
    Math.min(idealLeft, screenWidth - CATEGORY_POPUP_WIDTH - POPUP_EDGE_PAD),
  );
  const caretLeft = Math.max(
    16,
    Math.min(triggerX + triggerWidth / 2 - left - 6, CATEGORY_POPUP_WIDTH - 28),
  );
  return { x: left, top: triggerY + triggerHeight + 6, caretLeft };
}

function PostCategoryPopup({
  visible,
  anchor,
  onClose,
  onSelect,
  onOpenCase,
}: {
  visible: boolean;
  anchor: { x: number; top: number; caretLeft?: number };
  onClose: () => void;
  onSelect: (id: string) => void;
  onOpenCase?: () => void;
}) {
  const { colors, iconBg } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <ModalPresent onDismiss={onClose} style={styles.popupOverlay} animatedScale={false}>
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
          <View style={[styles.popupCaretRow, { paddingLeft: anchor.caretLeft ?? 20 }]}>
            <View style={[styles.popupCaret, { borderBottomColor: colors.surface }]} />
          </View>

          {onOpenCase ? (
            <>
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
            </>
          ) : null}

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
      </ModalPresent>
    </Modal>
  );
}

export function CommunityComposerBar({
  filter,
  joinedGroups,
  onFilterChange,
  onOpen,
  onCategorySelect,
  onOpenCase,
  hideComposer = false,
}: {
  filter: CommunityFeedFilter;
  joinedGroups: Community[];
  onFilterChange: (next: CommunityFeedFilter) => void;
  onOpen: () => void;
  onCategorySelect: (category: string) => void;
  onOpenCase?: () => void;
  hideComposer?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const plusRef = useRef<View>(null);
  const filterRef = useRef<View>(null);
  const [categoryPopupOpen, setCategoryPopupOpen] = useState(false);
  const [filterPopupOpen, setFilterPopupOpen] = useState(false);
  const [categoryAnchor, setCategoryAnchor] = useState({ x: 16, top: 100, caretLeft: 20 });
  const [filterAnchor, setFilterAnchor] = useState({ top: 100 });

  const filterActive = filter.groupId !== 'all' || filter.topics.length > 0;

  const openCategoryPopup = () => {
    setFilterPopupOpen(false);
    plusRef.current?.measureInWindow((x, y, width, height) => {
      setCategoryAnchor(anchorCategoryPopup(x, y, width, height));
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

  const openComposerFromBar = () => {
    Keyboard.dismiss();
    onOpen();
  };

  return (
    <View style={[styles.composerRow, hideComposer && styles.composerRowFilterOnly]}>
      {!hideComposer && (
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
      )}

      <Pressable
        ref={filterRef}
        onPress={openFilterPopup}
        style={[
          styles.composerFilterBtn,
          hideComposer && styles.composerFilterBtnStandalone,
          {
            backgroundColor: 'transparent',
            borderWidth: 0,
          },
        ]}
      >
        <Icon
          name="sliders"
          size={22}
          color={filterActive ? colors.primary : colors.textSecondary}
        />
      </Pressable>

      {!hideComposer && (
        <PostCategoryPopup
          visible={categoryPopupOpen}
          anchor={categoryAnchor}
          onClose={() => setCategoryPopupOpen(false)}
          onSelect={id => {
            setCategoryPopupOpen(false);
            onCategorySelect(id);
          }}
          onOpenCase={onOpenCase ? () => {
            setCategoryPopupOpen(false);
            onOpenCase();
          } : undefined}
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
    marginBottom: 4,
    ...Platform.select({
      web: { userSelect: 'none' as const },
      default: {},
    }),
  },
  composerRowFilterOnly: {
    justifyContent: 'flex-end',
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
  composerFilterBtnStandalone: {
    marginLeft: 'auto',
  },
  popupOverlay: { flex: 1, position: 'relative' },
  categoryPopupCard: {
    position: 'absolute',
    width: CATEGORY_POPUP_WIDTH,
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
