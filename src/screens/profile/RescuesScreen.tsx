import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { PhotoSlot } from '../../components/ui/PhotoSlot';
import { Segmented } from '../../components/ui/Segmented';
import { Empty } from '../../components/ui/Empty';
import { ProfileSubHeader, StatusBadge } from '../../components/profile/ProfileChrome';
import {
  getRescuesForUser,
  RESCUE_STATUS_META,
  type RescueCase,
  type RescueStatus,
} from '../../data/profileData';
import type { ProfileStackParamList } from '../../navigation/ProfileNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';
import { Icon } from '../../components/icons/Icon';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'Rescues'>;

export function RescuesScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const all = getRescuesForUser('you');
  const [filter, setFilter] = useState<'all' | RescueStatus>('all');

  const stats = useMemo(() => ({
    total: all.length,
    recovered: all.filter(r => r.status === 'recovered').length,
    treatment: all.filter(r => r.status === 'under_treatment').length,
  }), [all]);

  const shown = filter === 'all' ? all : all.filter(r => r.status === filter);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader title="Rescues" rightIcon="sliders" />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
      >
        <View style={styles.summaryRow}>
          <SummaryCard value={stats.total} label="Total Rescues" icon="shield" tint="#E5424F" bg="#FFE8E8" colors={colors} />
          <SummaryCard value={stats.recovered} label="Recovered" icon="heart" tint="#3A9B72" bg="#EAF7F0" colors={colors} />
          <SummaryCard value={stats.treatment} label="Under Treatment" icon="medical" tint="#7C5CBF" bg="#F0EBFA" colors={colors} />
        </View>

        <Segmented
          items={[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'recovered', label: 'Recovered' },
          ]}
          value={filter}
          onChange={id => setFilter(id as typeof filter)}
        />

        {shown.length === 0 ? (
          <Empty icon="shield" title="No rescues here" body="Rescue cases you post will appear in this list." />
        ) : (
          <View style={{ gap: 10 }}>
            {shown.map(item => (
              <RescueCard
                key={item.id}
                item={item}
                onPress={() => navigation.navigate('RescueDetail', { caseId: item.id })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({
  value, label, icon, tint, bg, colors,
}: {
  value: number;
  label: string;
  icon: string;
  tint: string;
  bg: string;
  colors: { surface: string; border: string; text: string; textSecondary: string };
}) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.summaryIcon, { backgroundColor: bg }]}>
        <Icon name={icon} size={14} color={tint} />
      </View>
      <Text style={[styles.summaryVal, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]} numberOfLines={2}>{label}</Text>
    </View>
  );
}

function RescueCard({ item, onPress }: { item: RescueCase; onPress: () => void }) {
  const { colors } = useTheme();
  const meta = RESCUE_STATUS_META[item.status];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.rescueCard,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <PhotoSlot height={72} tint={item.tint} borderRadius={radius.md} label="" icon={item.icon} style={{ width: 72 }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.rescueTop}>
          <Text style={[styles.rescueName, { color: colors.text }]}>{item.name}</Text>
          <StatusBadge label={meta.label} tint={meta.tint} bg={meta.bg} />
        </View>
        <Text style={[styles.rescueMeta, { color: colors.textTertiary }]}>{item.date} · {item.location}</Text>
        <Text style={[styles.rescueStory, { color: colors.textSecondary }]} numberOfLines={2}>{item.story}</Text>
        <Text style={[styles.rescueLink, { color: colors.primary }]}>View case</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 14, paddingTop: 4 },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  summaryIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  summaryVal: { fontSize: 17, fontWeight: '800' },
  summaryLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center', marginTop: 2 },
  rescueCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rescueTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rescueName: { fontSize: 15, fontWeight: '700', flex: 1 },
  rescueMeta: { fontSize: 12, marginTop: 4 },
  rescueStory: { fontSize: 13, lineHeight: 18, marginTop: 6 },
  rescueLink: { fontSize: 12.5, fontWeight: '700', marginTop: 8 },
});
