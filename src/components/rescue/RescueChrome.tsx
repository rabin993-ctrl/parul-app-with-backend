import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, Modal, Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows, sheetLayout } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import { HubToggleBar } from '../ui/HubToggleBar';
import { Button } from '../ui/Button';
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
];

const STATUS_FILTER_ORDER = ['active', 'under_treatment'] as const;

const STATUS_OPTIONS: { id: RescueStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'Any status' },
  ...STATUS_FILTER_ORDER.map(id => ({ id, label: RESCUE_STATUS_META[id].label })),
];

export function RescueHubBar({
  tab,
  onTabChange,
}: {
  tab: RescueHubTab;
  onTabChange: (t: RescueHubTab) => void;
}) {
  return (
    <HubToggleBar
      items={HUB_TABS}
      value={tab}
      onChange={id => onTabChange(id as RescueHubTab)}
      bordered={false}
    />
  );
}

/** @deprecated Use RescueHubBar */
export const RescueToolbar = RescueHubBar;

export function RescueTabHint({ tab }: { tab: RescueHubTab }) {
  const { colors } = useTheme();
  const copy =
    tab === 'following'
      ? 'Cases you follow — updates appear here.'
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

  return (
    <View style={styles.filterControls}>
      <View style={styles.filterSection}>
        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Where</Text>
        <View style={[styles.segmentTrack, { backgroundColor: colors.surface2 }]}>
          {RESCUE_SCOPE_OPTIONS.map(opt => {
            const on = filters.scope === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => onChange({ scope: opt.id })}
                style={[
                  styles.segmentOption,
                  on && [styles.segmentOptionOn, { backgroundColor: colors.bg }],
                ]}
              >
                <Icon name={opt.icon} size={13} color={on ? colors.text : colors.textTertiary} />
                <Text
                  style={[
                    styles.segmentText,
                    { color: on ? colors.text : colors.textTertiary },
                    on && styles.segmentTextOn,
                  ]}
                  numberOfLines={1}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.filterSection}>
        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Type</Text>
        <View style={[styles.segmentTrack, { backgroundColor: colors.surface2 }]}>
          {RESCUE_CONTENT_OPTIONS.map(opt => {
            const on = filters.contentType === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => {
                  const patch: Partial<RescueFilters> = { contentType: opt.id };
                  if (opt.id !== 'cases') patch.status = 'all';
                  onChange(patch);
                }}
                style={[
                  styles.segmentOption,
                  on && [styles.segmentOptionOn, { backgroundColor: colors.bg }],
                ]}
              >
                <Icon name={opt.icon} size={13} color={on ? colors.text : colors.textTertiary} />
                <Text
                  style={[
                    styles.segmentText,
                    { color: on ? colors.text : colors.textTertiary },
                    on && styles.segmentTextOn,
                  ]}
                  numberOfLines={1}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.filterSection}>
        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Animal</Text>
        <View style={styles.animalRow}>
          {RESCUE_SPECIES_OPTIONS.map(opt => {
            const on = filters.species === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => onChange({ species: opt.id as RescueFilters['species'] })}
                style={[
                  styles.animalChip,
                  {
                    backgroundColor: on ? colors.primary + '14' : 'transparent',
                    borderColor: on ? colors.primary + '50' : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.animalChipText,
                    { color: on ? colors.primary : colors.textSecondary },
                    on && { fontWeight: '700' },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
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
  const { colors, scrim } = useTheme();
  const customized = countActiveRescueFilters(filters) > 0;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.popupOverlay}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: scrim }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.filterPopupCard,
            {
              top: anchor.top,
              left: FILTER_POPUP_H_PAD,
              width: FILTER_POPUP_WIDTH,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              ...shadows.md,
            },
          ]}
        >
          <View style={styles.filterPopupHeader}>
            <Text style={[styles.filterPopupTitle, { color: colors.text }]}>Refine results</Text>
            {customized && (
              <Pressable onPress={onReset} hitSlop={8}>
                <Text style={[styles.filterPopupClear, { color: colors.primary }]}>Reset</Text>
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

            {filters.contentType === 'cases' && (
              <>
                <Text style={[styles.popupSectionLabel, { color: colors.textSecondary }]}>Status</Text>
                <View style={styles.popupStatusRow}>
                  {STATUS_OPTIONS.map(opt => (
                    <Button
                      key={opt.id}
                      size="sm"
                      variant={filters.status === opt.id ? 'primary' : 'soft'}
                      onPress={() => onChange({ ...filters, status: opt.id })}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
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
  filterControls: { gap: 14 },
  filterSection: { gap: 8 },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  segmentTrack: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: 3,
    gap: 3,
  },
  segmentOption: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: radius.sm,
  },
  segmentOptionOn: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  segmentText: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
  segmentTextOn: { fontWeight: '700' },
  animalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  animalChip: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 64,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  animalChipText: { fontSize: 12.5, fontWeight: '600' },
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
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 14,
    maxHeight: `${Math.round(sheetLayout.maxHeightRatio * 100)}%`,
    overflow: 'hidden',
  },
  filterPopupScroll: { flexGrow: 0 },
  filterPopupScrollContent: { gap: 4, paddingBottom: 2 },
  filterPopupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  filterPopupTitle: { fontSize: 14, fontWeight: '700' },
  filterPopupClear: { fontSize: 13, fontWeight: '600' },
  popupSectionLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  popupStatusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
