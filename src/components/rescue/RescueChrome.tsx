import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, Modal, Dimensions, Animated, Easing, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows, sheetLayout } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import { ModalPresent } from '../ui/ModalScrim';
import {
  RESCUE_SPECIES_OPTIONS,
  RESCUE_SCOPE_OPTIONS,
  RESCUE_CONTENT_OPTIONS,
  formatRescueFilterSummary,
  countActiveRescueFilters,
  type RescueFilters,
  type RescueHubTab,
} from '../../data/rescueData';
import { RESCUE_STATUS_META, type RescueStatus } from '../../data/profileData';

const HUB_TABS = [
  { id: 'browse', label: 'Discover' },
  { id: 'following', label: 'Following' },
  { id: 'my-cases', label: 'My Cases' },
] as const;

const HUB_INDICATOR_INSET = 8;
const HUB_INDICATOR_H = 3;

export function RescueHubBar({
  tab,
  onTabChange,
}: {
  tab: RescueHubTab;
  onTabChange: (t: RescueHubTab) => void;
}) {
  const { colors } = useTheme();
  const [rowWidth, setRowWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const activeIndex = Math.max(0, HUB_TABS.findIndex(t => t.id === tab));
  const segmentW = rowWidth > 0 ? rowWidth / HUB_TABS.length : 0;
  const indicatorW = Math.max(0, segmentW - HUB_INDICATOR_INSET * 2);
  const targetX = segmentW * activeIndex + HUB_INDICATOR_INSET;

  useEffect(() => {
    if (rowWidth <= 0) return;
    Animated.timing(translateX, {
      toValue: targetX,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [targetX, rowWidth, translateX]);

  return (
    <View style={styles.hubBar}>
      <View
        style={styles.hubTrack}
        onLayout={e => setRowWidth(e.nativeEvent.layout.width)}
      >
        {rowWidth > 0 && indicatorW > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.hubIndicator,
              {
                width: indicatorW,
                backgroundColor: colors.primary,
                transform: [{ translateX }],
              },
            ]}
          />
        )}

        {HUB_TABS.map(item => {
          const selected = tab === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => onTabChange(item.id)}
              style={[styles.hubTab, Platform.OS === 'web' && styles.hubTabWeb]}
              accessibilityRole="tab"
              accessibilityState={selected ? { selected: true } : {}}
            >
              <Text
                style={[
                  styles.hubTabLabel,
                  {
                    color: selected ? colors.text : colors.textTertiary,
                    fontWeight: selected ? '700' : '600',
                  },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const STATUS_FILTER_ORDER = ['active', 'under_treatment'] as const;

const STATUS_OPTIONS: { id: RescueStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'Any status' },
  ...STATUS_FILTER_ORDER.map(id => ({ id, label: RESCUE_STATUS_META[id].label })),
];

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
      style={({ pressed }) => [
        styles.filterChip,
        {
          backgroundColor: selected ? iconBg(bg) : colors.surface2,
          opacity: pressed ? 0.88 : 1,
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

/** @deprecated Use RescueHubBar */
export const RescueToolbar = RescueHubBar;

export function RescueTabHint({ tab }: { tab: RescueHubTab }) {
  const { colors } = useTheme();
  const copy =
    tab === 'following'
      ? 'Cases you follow: updates appear here.'
      : tab === 'my-cases'
        ? 'Tap a case to manage updates, photos, and details.'
        : null;
  if (!copy) return null;
  return (
    <Text style={[styles.tabHint, { color: colors.textSecondary }]}>{copy}</Text>
  );
}

function RescueFilterControls({
  filters,
  onChange,
}: {
  filters: RescueFilters;
  onChange: (patch: Partial<RescueFilters>) => void;
}) {
  const { colors } = useTheme();
  const neutralTint = colors.text;
  const neutralBg = colors.surface2;
  const accentTint = colors.primary;
  const accentBg = colors.primary + '22';

  return (
    <View style={styles.filterControls}>
      <Text style={[styles.popupSectionLabel, { color: colors.textSecondary }]}>Where</Text>
      <View style={styles.popupChipRow}>
        {RESCUE_SCOPE_OPTIONS.map(opt => (
          <FilterChip
            key={opt.id}
            label={opt.label}
            icon={opt.icon}
            tint={accentTint}
            bg={accentBg}
            selected={filters.scope === opt.id}
            onPress={() => onChange({ scope: opt.id })}
          />
        ))}
      </View>

      <Text style={[styles.popupSectionLabel, { color: colors.textSecondary, marginTop: 12 }]}>Type</Text>
      <View style={styles.popupChipRow}>
        {RESCUE_CONTENT_OPTIONS.map(opt => (
          <FilterChip
            key={opt.id}
            label={opt.label}
            icon={opt.icon}
            tint={accentTint}
            bg={accentBg}
            selected={filters.contentType === opt.id}
            onPress={() => {
              const patch: Partial<RescueFilters> = { contentType: opt.id };
              if (opt.id !== 'cases') patch.status = 'all';
              onChange(patch);
            }}
          />
        ))}
      </View>

      <Text style={[styles.popupSectionLabel, { color: colors.textSecondary, marginTop: 12 }]}>Animal</Text>
      <View style={styles.popupChipRow}>
        {RESCUE_SPECIES_OPTIONS.map(opt => (
          <FilterChip
            key={opt.id}
            label={opt.label}
            icon={opt.icon}
            tint={accentTint}
            bg={accentBg}
            selected={filters.species === opt.id}
            onPress={() => onChange({ species: opt.id as RescueFilters['species'] })}
          />
        ))}
      </View>

      {filters.contentType === 'cases' ? (
        <>
          <Text style={[styles.popupSectionLabel, { color: colors.textSecondary, marginTop: 12 }]}>Status</Text>
          <View style={styles.popupChipRow}>
            {STATUS_OPTIONS.map(opt => {
              const meta = opt.id === 'all'
                ? { icon: 'shield', tint: neutralTint, bg: neutralBg, label: opt.label }
                : {
                  icon: RESCUE_STATUS_META[opt.id].icon,
                  tint: RESCUE_STATUS_META[opt.id].tint,
                  bg: RESCUE_STATUS_META[opt.id].bg,
                  label: opt.label,
                };
              return (
                <FilterChip
                  key={opt.id}
                  label={meta.label}
                  icon={meta.icon}
                  tint={meta.tint}
                  bg={meta.bg}
                  selected={filters.status === opt.id}
                  onPress={() => onChange({ status: opt.id })}
                />
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );
}

export function RescueFilterSummary({
  filters,
  onPress,
  triggerRef,
}: {
  filters: RescueFilters;
  onPress: () => void;
  triggerRef?: React.Ref<View>;
}) {
  const { colors } = useTheme();
  const customized = countActiveRescueFilters(filters) > 0;

  return (
    <Pressable
      ref={triggerRef}
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterSummary,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Icon name="sliders" size={15} color={customized ? colors.primary : colors.textSecondary} />
      <Text style={[styles.filterSummaryText, { color: colors.text }]} numberOfLines={1}>
        {formatRescueFilterSummary(filters)}
      </Text>
      <Icon name="chevronDown" size={14} color={colors.textTertiary} />
    </Pressable>
  );
}

export function RescueSpeciesRow({
  active,
  onChange,
}: {
  active: RescueFilters['species'];
  onChange: (id: RescueFilters['species']) => void;
}) {
  const { colors } = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.speciesRowLegacy}>
      {RESCUE_SPECIES_OPTIONS.map(opt => {
        const on = active === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange(opt.id as RescueFilters['species'])}
            style={({ pressed }) => [
              styles.speciesChipLegacy,
              {
                backgroundColor: on ? colors.primary + '14' : colors.surface2,
                borderColor: on ? colors.primary + '40' : 'transparent',
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[styles.speciesLabelLegacy, { color: on ? colors.primary : colors.textSecondary }]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const FILTER_POPUP_H_PAD = 16;
const FILTER_POPUP_WIDTH = Dimensions.get('window').width - FILTER_POPUP_H_PAD * 2;

function RescueFilterPopup({
  visible,
  anchor,
  filters,
  onChange,
  onClose,
  onReset,
}: {
  visible: boolean;
  anchor: { top: number };
  filters: RescueFilters;
  onChange: (f: RescueFilters) => void;
  onClose: () => void;
  onReset: () => void;
}) {
  const { colors } = useTheme();
  const customized = countActiveRescueFilters(filters) > 0;

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
            <Text style={[styles.filterPopupTitle, { color: colors.text }]}>Refine results</Text>
            {customized && (
              <Pressable onPress={onReset} hitSlop={8}>
                <Text style={[styles.filterPopupClear, { color: colors.textSecondary }]}>Clear</Text>
              </Pressable>
            )}
          </View>

          <ScrollView
            style={styles.filterPopupScroll}
            contentContainerStyle={styles.filterPopupScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <RescueFilterControls
              filters={filters}
              onChange={patch => onChange({ ...filters, ...patch })}
            />
          </ScrollView>
        </View>
      </ModalPresent>
    </Modal>
  );
}

export function RescueFilterField({
  filters,
  onChange,
  onReset,
}: {
  filters: RescueFilters;
  onChange: (f: RescueFilters) => void;
  onReset: () => void;
}) {
  const triggerRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ top: 100 });

  const openPopup = () => {
    triggerRef.current?.measureInWindow((_x, y, _w, height) => {
      setAnchor({ top: y + height + 6 });
      setOpen(true);
    });
  };

  useFocusEffect(useCallback(() => () => setOpen(false), []));

  return (
    <>
      <RescueFilterSummary
        triggerRef={triggerRef}
        filters={filters}
        onPress={openPopup}
      />
      <RescueFilterPopup
        visible={open}
        anchor={anchor}
        filters={filters}
        onChange={onChange}
        onClose={() => setOpen(false)}
        onReset={() => {
          onReset();
          setOpen(false);
        }}
      />
    </>
  );
}

export { countActiveRescueFilters } from '../../data/rescueData';

const styles = StyleSheet.create({
  hubBar: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  hubTrack: {
    flexDirection: 'row',
    width: '100%',
    position: 'relative',
  },
  hubIndicator: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: HUB_INDICATOR_H,
    borderRadius: HUB_INDICATOR_H,
  },
  hubTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingTop: 10,
    paddingBottom: 10 + HUB_INDICATOR_H,
    paddingHorizontal: 4,
  },
  hubTabWeb: { cursor: 'pointer' as const },
  hubTabLabel: {
    fontSize: 12.5,
    letterSpacing: -0.1,
  },
  tabHint: {
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  filterSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterSummaryText: { flex: 1, fontSize: 13, fontWeight: '600', minWidth: 0 },
  filterControls: { gap: 0 },
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
  speciesRowLegacy: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  speciesChipLegacy: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  speciesLabelLegacy: { fontSize: 12, fontWeight: '600' },
  popupOverlay: {
    flex: 1,
    position: 'relative',
  },
  filterPopupCard: {
    position: 'absolute',
    borderRadius: radius.lg,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 12,
    maxHeight: sheetLayout.listScrollMax,
    overflow: 'hidden',
  },
  filterPopupScroll: { flexGrow: 0 },
  filterPopupScrollContent: { paddingBottom: 2 },
  filterPopupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  filterPopupTitle: { fontSize: 14, fontWeight: '700' },
  filterPopupClear: { fontSize: 13, fontWeight: '600' },
});
