import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Segmented } from '../../components/ui/Segmented';
import { Empty } from '../../components/ui/Empty';
import { ProfileSubHeader } from '../../components/profile/ProfileChrome';
import { RescueListCard } from '../../components/rescue/RescueCaseUI';
import {
  RESCUE_STATUS_META,
  type RescueStatus,
} from '../../data/profileData';
import type { ProfileStackParamList } from '../../navigation/ProfileNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';
import { Icon } from '../../components/icons/Icon';
import { useRescueFeedOptional } from '../../context/RescueFeedContext';
import { useAuth } from '../../context/AuthContext';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'Rescues'>;

export function RescuesScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const { user } = useAuth();
  const rescueFeed = useRescueFeedOptional();
  const all = useMemo(
    () => rescueFeed && user ? rescueFeed.cases.filter(c => c.userId === user.id) : [],
    [rescueFeed, user],
  );
  const [filter, setFilter] = useState<'all' | RescueStatus>('all');

  const stats = useMemo(() => ({
    total: all.length,
    recovered: all.filter(r => r.status === 'recovered').length,
    treatment: all.filter(r => r.status === 'under_treatment').length,
    active: all.filter(r => r.status === 'active').length,
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
          <SummaryCard value={stats.total} label="Total" icon="shield" tint="#E5424F" bg="#FFE8E8" colors={colors} />
          <SummaryCard value={stats.active} label="Needs Help" icon="megaphone" tint="#C98E2A" bg="#FDF6E8" colors={colors} />
          <SummaryCard
            value={stats.treatment}
            label={RESCUE_STATUS_META.under_treatment.shortLabel}
            icon={RESCUE_STATUS_META.under_treatment.icon}
            tint={RESCUE_STATUS_META.under_treatment.tint}
            bg={RESCUE_STATUS_META.under_treatment.bg}
            colors={colors}
          />
          <SummaryCard value={stats.recovered} label="Resolved" icon="check-circle" tint="#3A9B72" bg="#EAF7F0" colors={colors} />
        </View>

        <Segmented
          items={[
            { id: 'all', label: 'All' },
            { id: 'active', label: RESCUE_STATUS_META.active.label },
            { id: 'under_treatment', label: RESCUE_STATUS_META.under_treatment.label },
            { id: 'recovered', label: RESCUE_STATUS_META.recovered.label },
          ]}
          value={filter}
          onChange={id => setFilter(id as typeof filter)}
        />

        {shown.length === 0 ? (
          <Empty icon="shield" title="No rescues here" body="Rescue cases you post will appear in this list." />
        ) : (
          <View style={{ gap: 10 }}>
            {shown.map(item => (
              <RescueListCard
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
        <Icon name={icon} size={13} color={tint} />
      </View>
      <Text style={[styles.summaryVal, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 14, paddingTop: 4 },
  summaryRow: { flexDirection: 'row', gap: 6 },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  summaryIcon: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  summaryVal: { fontSize: 16, fontWeight: '800' },
  summaryLabel: { fontSize: 9.5, fontWeight: '600', textAlign: 'center', marginTop: 2 },
});
