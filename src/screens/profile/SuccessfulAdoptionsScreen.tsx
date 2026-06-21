import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { PhotoSlot } from '../../components/ui/PhotoSlot';
import { Empty } from '../../components/ui/Empty';
import { ProfileSubHeader, ImpactBanner, StatusBadge } from '../../components/profile/ProfileChrome';
import type { AdoptionListing } from '../../data/adoptionData';
import type { ProfileStackParamList } from '../../navigation/ProfileNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';
import { Icon } from '../../components/icons/Icon';
import { useAuth } from '../../context/AuthContext';
import { useAdoptionFeed } from '../../context/AdoptionFeedContext';
import { useAdoption } from '../../context/AdoptionContext';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'SuccessfulAdoptions'>;

export function SuccessfulAdoptionsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { listings } = useAdoptionFeed();
  const { records } = useAdoption();
  const navigation = useNavigation<Nav>();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();

  const items = useMemo(
    () => listings.filter(l => l.userId === user?.id && l.status === 'Adopted'),
    [listings, user?.id],
  );

  const thisYear = useMemo(() => {
    const year = String(new Date().getFullYear());
    return items.filter(i => (i.adoptedDate ?? '').includes(year)).length;
  }, [items]);

  const endorsed = useMemo(() => {
    const listingIds = new Set(items.map(i => i.id));
    return records.filter(r => r.posterId === user?.id && r.posterEndorsed && listingIds.has(r.adoptionPostId)).length;
  }, [records, items, user?.id]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader title="Successful Adoptions" rightIcon="adoption" />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
      >
        <View style={styles.summaryRow}>
          <MiniStat value={items.length} label="Total" colors={colors} />
          <MiniStat value={thisYear} label="This Year" colors={colors} />
          <MiniStat value={endorsed} label="Endorsed" colors={colors} />
        </View>

        <ImpactBanner body="Every adoption is a new beginning. 🐾💙 Thank you for giving them a second chance." />

        {items.length === 0 ? (
          <Empty icon="adoption" title="No adoptions yet" body="When an animal you posted finds a home, it will show here." />
        ) : (
          <View style={styles.grid}>
            {items.map(item => (
              <AdoptionGridCard
                key={item.id}
                item={item}
                onPress={() => navigation.navigate('AdoptionDetail', { showcaseId: item.id })}
              />
            ))}
          </View>

        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MiniStat({ value, label, colors }: { value: number; label: string; colors: { text: string; textSecondary: string; surface: string; border: string } }) {
  return (
    <View style={[styles.miniStat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.miniVal, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function AdoptionGridCard({ item, onPress }: { item: AdoptionListing; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.gridCard,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={styles.gridPhoto}>
        <PhotoSlot height={120} imageKey={item.id} borderRadius={radius.lg} label="" />
        <View style={[styles.homeBadge, { backgroundColor: colors.successBg }]}>
          <Icon name="adoption" size={12} color={colors.success} />
        </View>
      </View>
      <View style={styles.gridBody}>
        <View style={styles.gridTitleRow}>
          <Text style={[styles.gridName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          <StatusBadge label="Adopted" tint={colors.success} bg={colors.successBg} />
        </View>
        <Text style={[styles.gridDate, { color: colors.textTertiary }]}>{item.adoptedDate}</Text>
        <Text style={[styles.gridHome, { color: colors.textSecondary }]} numberOfLines={2}>{item.adoptedNote}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 14, paddingTop: 4 },
  summaryRow: { flexDirection: 'row', gap: 8 },
  miniStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  miniVal: { fontSize: 17, fontWeight: '800' },
  miniLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCard: {
    width: '47.5%',
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  gridPhoto: { position: 'relative' },
  homeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridBody: { padding: 10, gap: 4 },
  gridTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  gridName: { flexShrink: 1, fontSize: 15, fontWeight: '700' },
  gridDate: { fontSize: 11.5 },
  gridHome: { fontSize: 12.5, lineHeight: 17 },
});
