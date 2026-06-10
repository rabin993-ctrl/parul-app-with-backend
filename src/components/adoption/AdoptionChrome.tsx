import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import { Tabs } from '../ui/Tabs';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import {
  ADOPTION_LOCATIONS,
  ADOPTION_SPECIES_OPTIONS,
  AdoptionFilters,
  DEFAULT_ADOPTION_FILTERS,
} from '../../data/adoptionData';

export type AdoptionHubTab = 'browse' | 'saved' | 'requested' | 'my-listings';

const HUB_TABS = [
  { id: 'browse', label: 'Browse' },
  { id: 'saved', label: 'Saved' },
  { id: 'requested', label: 'Requested' },
  { id: 'my-listings', label: 'My Posts' },
];

export function AdoptionToolbar({
  tab,
  onTabChange,
  onSearch,
  onFilter,
  onCreate,
  activeFilterCount,
}: {
  tab: AdoptionHubTab;
  onTabChange: (t: AdoptionHubTab) => void;
  onSearch: () => void;
  onFilter: () => void;
  onCreate: () => void;
  activeFilterCount: number;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.toolbar}>
      <View style={styles.toolbarTop}>
        <Text style={[styles.title, { color: colors.text }]}>Adoption</Text>
        <View style={styles.actions}>
          <Pressable
            onPress={onCreate}
            style={({ pressed }) => [styles.iconChip, { backgroundColor: colors.primary + '14', opacity: pressed ? 0.8 : 1 }]}
          >
            <Icon name="plus" size={18} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={onSearch}
            style={({ pressed }) => [styles.iconChip, { backgroundColor: colors.surface2, opacity: pressed ? 0.8 : 1 }]}
          >
            <Icon name="search" size={18} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={onFilter}
            style={({ pressed }) => [styles.iconChip, { backgroundColor: colors.surface2, opacity: pressed ? 0.8 : 1 }]}
          >
            <Icon name="sliders" size={18} color={colors.textSecondary} />
            {activeFilterCount > 0 && (
              <View style={[styles.filterDot, { backgroundColor: colors.primary }]}>
                <Text style={styles.filterDotText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>
      <Tabs tabs={HUB_TABS} active={tab} onChange={id => onTabChange(id as AdoptionHubTab)} />
    </View>
  );
}

export function AdoptionSpeciesRow({
  active,
  onChange,
}: {
  active: AdoptionFilters['species'];
  onChange: (id: AdoptionFilters['species']) => void;
}) {
  const { colors } = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.speciesRow}>
      {ADOPTION_SPECIES_OPTIONS.map(opt => {
        const on = active === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange(opt.id as AdoptionFilters['species'])}
            style={({ pressed }) => [
              styles.speciesChip,
              {
                backgroundColor: on ? colors.primary + '14' : colors.surface2,
                borderColor: on ? colors.primary + '40' : 'transparent',
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Icon name={opt.icon} size={14} color={on ? colors.primary : colors.textSecondary} />
            <Text style={[styles.speciesLabel, { color: on ? colors.primary : colors.textSecondary }]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
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
            { id: 'Pending', label: 'Pending' },
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
  toolbar: { gap: 10, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 6 },
  toolbarTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 8 },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterDotText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  speciesRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  speciesChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  speciesLabel: { fontSize: 12.5, fontWeight: '600' },
  sheetTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  filterSection: { marginBottom: 14 },
  filterLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  sheetFooter: { flexDirection: 'row', gap: 10, marginTop: 8, paddingBottom: 8 },
});
