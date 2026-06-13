import React from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { PhotoSlot } from '../../components/ui/PhotoSlot';
import { Button } from '../../components/ui/Button';
import { Empty } from '../../components/ui/Empty';
import { ProfileSubHeader, StatusBadge } from '../../components/profile/ProfileChrome';
import { useAdoptionFeed } from '../../context/AdoptionFeedContext';
import type { ProfileStackParamList } from '../../navigation/ProfileNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { Icon } from '../../components/icons/Icon';

type Route = RouteProp<ProfileStackParamList, 'AdoptionDetail'>;

export function AdoptionShowcaseDetailScreen() {
  const { colors } = useTheme();
  const route = useRoute<Route>();
  const { listings, listingsLoaded } = useAdoptionFeed();
  const item = listings.find(l => l.id === route.params.showcaseId);
  const tabBarPad = useTabBarScrollPadding();

  if (!listingsLoaded) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <ProfileSubHeader title="Adoption story" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <ProfileSubHeader title="Adoption story" />
        <Empty icon="adoption" title="Story not found" body="This adoption record may have been removed." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader title="Adoption story" />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]} showsVerticalScrollIndicator={false}>
        <PhotoSlot height={220} imageKey={item.id} borderRadius={radius.xl} label="" />

        <View style={styles.head}>
          <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
          <StatusBadge label="Adopted" tint={colors.success} bg={colors.successBg} />
        </View>

        <View style={styles.metaRow}>
          <Icon name="calendar" size={14} color={colors.textTertiary} />
          <Text style={[styles.meta, { color: colors.textSecondary }]}>Adopted {item.adoptedDate}</Text>
        </View>
        <View style={styles.metaRow}>
          <Icon name="adoption" size={14} color={colors.textTertiary} />
          <Text style={[styles.meta, { color: colors.textSecondary }]}>{item.adoptedNote}</Text>
        </View>

        <Text style={[styles.section, { color: colors.textSecondary }]}>HOW IT HAPPENED</Text>
        <Text style={[styles.body, { color: colors.text }]}>{item.story}</Text>

        <Button variant="soft" icon="heart">Celebrate adoption</Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, gap: 12, paddingTop: 4 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  name: { fontSize: 22, fontWeight: '800', flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { fontSize: 14 },
  section: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginTop: 8 },
  body: { fontSize: 15, lineHeight: 23 },
});
