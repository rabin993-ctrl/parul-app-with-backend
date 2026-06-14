import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Animated, Easing, Platform, Modal,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import { Sheet } from '../ui/Sheet';
import { Button, IconButton } from '../ui/Button';
import { GlossyPill } from '../ui/GlossyPill';
import { ChatSegmentBar, type ChatSegment } from './AdoptionChatsList';
import {
  ADOPTION_LOCATIONS,
  ADOPTION_SPECIES_OPTIONS,
  AdoptionFilters,
  DEFAULT_ADOPTION_FILTERS,
} from '../../data/adoptionData';

export type AdoptionHubTab = 'discover' | 'threads' | 'listings';

export type AdoptionBrowseFilter = AdoptionFilters['species'] | 'requested';

export function AdoptionChatsHubBar({
  segment,
  onSegmentChange,
  onBack,
  showSegmentBar,
  adoptingUrgent,
}: {
  segment: ChatSegment;
  onSegmentChange: (segment: ChatSegment) => void;
  onBack: () => void;
  showSegmentBar: boolean;
  adoptingUrgent: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.chatsHubBar}>
      <IconButton
        name="chevronLeft"
        size={40}
        tone="soft"
        color={colors.textSecondary}
        onPress={onBack}
      />
      {showSegmentBar ? (
        <View style={styles.chatsHubSegments}>
          <ChatSegmentBar
            value={segment}
            onChange={onSegmentChange}
            adoptingUrgent={adoptingUrgent}
            pinned
          />
        </View>
      ) : null}
    </View>
  );
}

export function AdoptionHubBar({
  tab,
  onTabChange,
  browseFilter,
  onBrowseFilterChange,
  requestedCount = 0,
  chatUrgent = false,
  chatBadgeCount,
}: {
  tab: AdoptionHubTab;
  onTabChange: (t: AdoptionHubTab) => void;
  browseFilter: AdoptionBrowseFilter;
  onBrowseFilterChange: (id: AdoptionBrowseFilter) => void;
  requestedCount?: number;
  chatUrgent?: boolean;
  chatBadgeCount?: number;
}) {
  const { colors } = useTheme();
  const [rowWidth, setRowWidth] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [browseMenuOpen, setBrowseMenuOpen] = useState(false);
  const [browseMenuAnchor, setBrowseMenuAnchor] = useState({ x: 0, top: 0, width: 0 });
  const discoverRef = useRef<View>(null);
  const translateX = useRef(new Animated.Value(0)).current;

  const onDiscover = tab === 'discover';
  const onRequested = browseFilter === 'requested';
  const activeSpecies = ADOPTION_SPECIES_OPTIONS.find(o => o.id === browseFilter)
    ?? ADOPTION_SPECIES_OPTIONS[0];
  const discoverLabel = onRequested ? 'Requested' : activeSpecies.label;

  const showChatBadge = chatUrgent || (chatBadgeCount !== undefined && chatBadgeCount > 0);
  const chatBadgeLabel = chatBadgeCount && chatBadgeCount > 0
    ? (chatBadgeCount > 99 ? '99+' : String(chatBadgeCount))
    : null;

  const segments = [
    { id: 'discover' as const, label: discoverLabel, showChevron: true },
    { id: 'listings' as const, label: 'My listings', showChevron: false },
    { id: 'threads' as const, label: 'Chats', showChevron: false },
  ];

  const activeIndex = Math.max(0, segments.findIndex(s => s.id === tab));
  const targetIndex = hoveredIndex ?? activeIndex;
  const segmentW = rowWidth > 0 ? rowWidth / segments.length : 0;
  const targetX = segmentW * targetIndex;

  useEffect(() => {
    if (rowWidth <= 0) return;
    Animated.timing(translateX, {
      toValue: targetX,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [targetX, rowWidth, translateX]);

  const openBrowseMenu = () => {
    discoverRef.current?.measureInWindow((x, y, width, height) => {
      setBrowseMenuAnchor({ x, top: y + height + 4, width });
      setBrowseMenuOpen(true);
    });
  };

  const selectBrowseFilter = (id: AdoptionBrowseFilter) => {
    setBrowseMenuOpen(false);
    onBrowseFilterChange(id);
    onTabChange('discover');
  };

  const onDiscoverPress = () => {
    if (!onDiscover) {
      onTabChange('discover');
      return;
    }
    openBrowseMenu();
  };

  return (
    <View style={styles.adoptionToolbar}>
      <View style={[styles.hubSegmentTrack, { backgroundColor: colors.bg }]}>
        <View
          style={styles.hubSegmentRow}
          onLayout={e => setRowWidth(e.nativeEvent.layout.width)}
        >
          {rowWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.hubSegmentIndicatorWrap,
                { width: segmentW, transform: [{ translateX }] },
              ]}
            >
              <GlossyPill borderRadius={radius.sm - 1} />
            </Animated.View>
          )}

          {segments.map((segment, index) => {
            const selected = tab === segment.id;
            const highlighted = selected || hoveredIndex === index;
            const onPress = segment.id === 'discover'
              ? onDiscoverPress
              : () => onTabChange(segment.id);

            return (
              <Pressable
                key={segment.id}
                ref={segment.id === 'discover' ? discoverRef : undefined}
                onPress={onPress}
                onHoverIn={() => setHoveredIndex(index)}
                onHoverOut={() => setHoveredIndex(null)}
                style={[
                  styles.hubSegment,
                  Platform.OS === 'web' && styles.hubSegmentWeb,
                ]}
                accessibilityRole="tab"
                accessibilityState={selected ? { selected: true } : {}}
                accessibilityLabel={segment.id === 'threads' ? 'Adoption chats' : segment.label}
              >
                {segment.id === 'threads' && (
                  <Icon
                    name="comment"
                    size={14}
                    color={highlighted ? colors.primary : colors.textTertiary}
                    fill={highlighted ? colors.primary : 'none'}
                  />
                )}
                <Text
                  style={[
                    styles.hubSegmentLabel,
                    { color: highlighted ? colors.primary : colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {segment.label}
                </Text>
                {segment.showChevron && (
                  <Icon name="chevronDown" size={12} color={colors.textTertiary} />
                )}
                {segment.id === 'threads' && showChatBadge && (
                  <View
                    style={[
                      chatBadgeLabel ? styles.chatsBadgeCount : styles.chatsBadgeDot,
                      { backgroundColor: chatUrgent ? colors.warning : colors.primary },
                    ]}
                  >
                    {chatBadgeLabel ? (
                      <Text style={styles.chatsBadgeText}>{chatBadgeLabel}</Text>
                    ) : null}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <AdoptionBrowseMenu
        visible={browseMenuOpen}
        anchor={browseMenuAnchor}
        browseFilter={browseFilter}
        onRequested={onRequested}
        requestedCount={requestedCount}
        onClose={() => setBrowseMenuOpen(false)}
        onSelect={selectBrowseFilter}
      />
    </View>
  );
}

function AdoptionBrowseMenu({
  visible,
  anchor,
  browseFilter,
  onRequested,
  requestedCount,
  onClose,
  onSelect,
}: {
  visible: boolean;
  anchor: { x: number; top: number; width: number };
  browseFilter: AdoptionBrowseFilter;
  onRequested: boolean;
  requestedCount: number;
  onClose: () => void;
  onSelect: (id: AdoptionBrowseFilter) => void;
}) {
  const { colors, scrim } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: scrim }]}
        onPress={onClose}
      />
      <View
        style={[
          styles.browseMenu,
          {
            top: anchor.top,
            left: anchor.x,
            minWidth: Math.max(anchor.width, 148),
            backgroundColor: colors.surface,
            borderColor: colors.border,
            ...shadows.md,
          },
        ]}
      >
        {ADOPTION_SPECIES_OPTIONS.map(opt => {
          const active = !onRequested && browseFilter === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => onSelect(opt.id as AdoptionFilters['species'])}
              style={({ pressed }) => [
                styles.browseMenuItem,
                {
                  backgroundColor: active
                    ? colors.primary + '12'
                    : pressed
                      ? colors.surface2
                      : 'transparent',
                },
              ]}
            >
              <Icon
                name={opt.icon}
                size={14}
                color={active ? colors.primary : colors.textTertiary}
              />
              <Text
                style={[
                  styles.browseMenuItemLabel,
                  {
                    color: active ? colors.primary : colors.text,
                    fontWeight: active ? '700' : '600',
                  },
                ]}
              >
                {opt.label}
              </Text>
              {active ? <Icon name="check" size={13} color={colors.primary} /> : null}
            </Pressable>
          );
        })}

        <View style={[styles.browseMenuDivider, { backgroundColor: colors.border }]} />

        <Pressable
          onPress={() => onSelect('requested')}
          style={({ pressed }) => [
            styles.browseMenuItem,
            {
              backgroundColor: onRequested
                ? colors.primary + '12'
                : pressed
                  ? colors.surface2
                  : 'transparent',
            },
          ]}
        >
          <Icon
            name="comment"
            size={14}
            color={onRequested ? colors.primary : colors.textTertiary}
          />
          <Text
            style={[
              styles.browseMenuItemLabel,
              {
                color: onRequested ? colors.primary : colors.text,
                fontWeight: onRequested ? '700' : '600',
              },
            ]}
          >
            Requested
          </Text>
          {requestedCount > 0 ? (
            <View style={[styles.browseMenuBadge, { backgroundColor: colors.primary + '18' }]}>
              <Text style={[styles.browseMenuBadgeText, { color: colors.primary }]}>
                {requestedCount}
              </Text>
            </View>
          ) : null}
          {onRequested ? <Icon name="check" size={13} color={colors.primary} /> : null}
        </Pressable>
      </View>
    </Modal>
  );
}

const SPECIES_INDICATOR_INSET = 8;
const SPECIES_INDICATOR_H = 3;

export function AdoptionSpeciesRow({
  active,
  onChange,
  pinned = false,
}: {
  active: AdoptionFilters['species'];
  onChange: (id: AdoptionFilters['species']) => void;
  /** Fixed slot below hub bar (matches rescue filter placement). */
  pinned?: boolean;
}) {
  const { colors } = useTheme();
  const [rowWidth, setRowWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const activeIndex = Math.max(0, ADOPTION_SPECIES_OPTIONS.findIndex(o => o.id === active));
  const segmentW = rowWidth > 0 ? rowWidth / ADOPTION_SPECIES_OPTIONS.length : 0;
  const indicatorW = Math.max(0, segmentW - SPECIES_INDICATOR_INSET * 2);
  const targetX = segmentW * activeIndex + SPECIES_INDICATOR_INSET;

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
    <View style={pinned ? styles.speciesFieldPinned : styles.speciesField}>
      <View
        style={styles.speciesTrack}
        onLayout={e => setRowWidth(e.nativeEvent.layout.width)}
      >
        {rowWidth > 0 && indicatorW > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.speciesIndicator,
              {
                width: indicatorW,
                backgroundColor: colors.primary,
                transform: [{ translateX }],
              },
            ]}
          />
        )}

        {ADOPTION_SPECIES_OPTIONS.map(opt => {
          const on = active === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => onChange(opt.id as AdoptionFilters['species'])}
              style={[styles.speciesOption, Platform.OS === 'web' && styles.speciesOptionWeb]}
              accessibilityRole="tab"
              accessibilityState={on ? { selected: true } : {}}
            >
              <Icon name={opt.icon} size={13} color={on ? colors.primary : colors.textTertiary} />
              <Text
                style={[
                  styles.speciesOptionText,
                  { color: on ? colors.primary : colors.textTertiary },
                  on && styles.speciesOptionTextOn,
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
  );
}

export function AdoptionFilterSheet({
  visible,
  filters,
  onChange,
  onClose,
  onReset,
}: {
  visible: boolean;
  filters: AdoptionFilters;
  onChange: (f: AdoptionFilters) => void;
  onClose: () => void;
  onReset: () => void;
}) {
  const { colors } = useTheme();

  const set = <K extends keyof AdoptionFilters>(key: K, value: AdoptionFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text style={[styles.sheetTitle, { color: colors.text }]}>Filters</Text>

      <FilterSection title="Location" colors={colors}>
        <ChipRow
          options={[{ id: 'all', label: 'All' }, ...ADOPTION_LOCATIONS.map(l => ({ id: l, label: l }))]}
          value={filters.location}
          onChange={v => set('location', v as AdoptionFilters['location'])}
          colors={colors}
        />
      </FilterSection>

      <FilterSection title="Age" colors={colors}>
        <ChipRow
          options={[
            { id: 'all', label: 'All ages' },
            { id: 'puppy-kitten', label: 'Baby' },
            { id: 'young', label: 'Young' },
            { id: 'adult', label: 'Adult' },
            { id: 'senior', label: 'Senior' },
          ]}
          value={filters.ageGroup}
          onChange={v => set('ageGroup', v as AdoptionFilters['ageGroup'])}
          colors={colors}
        />
      </FilterSection>

      <FilterSection title="Gender" colors={colors}>
        <ChipRow
          options={[
            { id: 'all', label: 'Any' },
            { id: 'Male', label: 'Male' },
            { id: 'Female', label: 'Female' },
          ]}
          value={filters.gender}
          onChange={v => set('gender', v as AdoptionFilters['gender'])}
          colors={colors}
        />
      </FilterSection>

      <FilterSection title="Status" colors={colors}>
        <ChipRow
          options={[
            { id: 'available-only', label: 'Open' },
            { id: 'all', label: 'All' },
            { id: 'Available', label: 'Available' },
            { id: 'Urgent', label: 'Urgent' },
            { id: 'Adopted', label: 'Adopted' },
          ]}
          value={filters.status}
          onChange={v => set('status', v as AdoptionFilters['status'])}
          colors={colors}
        />
      </FilterSection>

      <FilterSection title="Vaccinated" colors={colors}>
        <ChipRow
          options={[
            { id: 'all', label: 'Any' },
            { id: 'yes', label: 'Yes' },
            { id: 'no', label: 'Not fully' },
          ]}
          value={filters.vaccinated}
          onChange={v => set('vaccinated', v as AdoptionFilters['vaccinated'])}
          colors={colors}
        />
      </FilterSection>

      <FilterSection title="Urgency" colors={colors}>
        <ChipRow
          options={[
            { id: 'all', label: 'Any' },
            { id: 'urgent', label: 'Urgent only' },
            { id: 'not-urgent', label: 'Not urgent' },
          ]}
          value={filters.urgency}
          onChange={v => set('urgency', v as AdoptionFilters['urgency'])}
          colors={colors}
        />
      </FilterSection>

      <View style={styles.sheetFooter}>
        <Button variant="outline" onPress={onReset}>Reset</Button>
        <Button variant="primary" onPress={onClose} style={{ flex: 1 }}>Apply</Button>
      </View>
    </Sheet>
  );
}

function FilterSection({ title, children, colors }: { title: string; children: React.ReactNode; colors: { textSecondary: string } }) {
  return (
    <View style={styles.filterSection}>
      <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>{title}</Text>
      {children}
    </View>
  );
}

function ChipRow({
  options,
  value,
  onChange,
  colors,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  colors: { text: string; bg: string; surface2: string; border: string; textSecondary: string };
}) {
  return (
    <View style={styles.chipRow}>
      {options.map(opt => {
        const on = value === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange(opt.id)}
            style={[
              styles.chip,
              {
                backgroundColor: on ? colors.text : colors.surface2,
                borderColor: on ? colors.text : colors.border,
              },
            ]}
          >
            <Text style={[styles.chipText, { color: on ? colors.bg : colors.textSecondary }]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function countActiveFilters(filters: AdoptionFilters) {
  let n = 0;
  if (filters.species !== DEFAULT_ADOPTION_FILTERS.species) n += 1;
  if (filters.location !== DEFAULT_ADOPTION_FILTERS.location) n += 1;
  if (filters.ageGroup !== DEFAULT_ADOPTION_FILTERS.ageGroup) n += 1;
  if (filters.gender !== DEFAULT_ADOPTION_FILTERS.gender) n += 1;
  if (filters.urgency !== DEFAULT_ADOPTION_FILTERS.urgency) n += 1;
  if (filters.vaccinated !== DEFAULT_ADOPTION_FILTERS.vaccinated) n += 1;
  if (filters.status !== DEFAULT_ADOPTION_FILTERS.status) n += 1;
  return n;
}

const styles = StyleSheet.create({
  chatsHubBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 16,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 4,
  },
  chatsHubSegments: {
    flex: 1,
    minWidth: 0,
  },
  adoptionToolbar: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  hubSegmentTrack: {
    padding: 3,
    borderRadius: radius.md,
  },
  hubSegmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    minHeight: 32,
  },
  hubSegmentIndicatorWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 0,
  },
  hubSegment: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 4,
    zIndex: 1,
  },
  hubSegmentWeb: { cursor: 'pointer' as const },
  hubSegmentLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: -0.1,
    flexShrink: 1,
  },
  chatsBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chatsBadgeCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  chatsBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  browseMenu: {
    position: 'absolute',
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  browseMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
  },
  browseMenuItemLabel: {
    flex: 1,
    fontSize: 13.5,
    letterSpacing: -0.1,
  },
  browseMenuDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
    marginHorizontal: 8,
  },
  browseMenuBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  browseMenuBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  speciesField: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  speciesFieldPinned: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  speciesTrack: {
    flexDirection: 'row',
    width: '100%',
    position: 'relative',
  },
  speciesIndicator: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: SPECIES_INDICATOR_H,
    borderRadius: SPECIES_INDICATOR_H,
  },
  speciesOption: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 6,
    paddingBottom: 6 + SPECIES_INDICATOR_H,
    paddingHorizontal: 2,
  },
  speciesOptionWeb: { cursor: 'pointer' as const },
  speciesOptionText: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
  speciesOptionTextOn: { fontWeight: '700' },
  sheetTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  filterSection: { marginBottom: 14 },
  filterLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  sheetFooter: { flexDirection: 'row', gap: 10, marginTop: 8, paddingBottom: 8 },
});
