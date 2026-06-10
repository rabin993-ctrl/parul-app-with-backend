import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { PhotoSlot } from '../../components/ui/PhotoSlot';
import { Button } from '../../components/ui/Button';
import { ProfileSubHeader, StatusBadge } from '../../components/profile/ProfileChrome';
import { getRescueById, RESCUE_STATUS_META } from '../../data/profileData';
import type { ProfileStackParamList } from '../../navigation/ProfileNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { Icon } from '../../components/icons/Icon';

type Route = RouteProp<ProfileStackParamList, 'RescueDetail'>;

export function RescueCaseDetailScreen() {
  const { colors } = useTheme();
  const route = useRoute<Route>();
  const item = getRescueById(route.params.caseId);
  const tabBarPad = useTabBarScrollPadding();

  if (!item) return null;

  const meta = RESCUE_STATUS_META[item.status];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader title="Rescue case" />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]} showsVerticalScrollIndicator={false}>
        <PhotoSlot height={200} tint={item.tint} borderRadius={radius.xl} label={item.name} icon={item.icon} />

        <View style={styles.head}>
          <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
          <StatusBadge label={meta.label} tint={meta.tint} bg={meta.bg} />
        </View>

        <View style={styles.metaRow}>
          <Icon name="calendar" size={14} color={colors.textTertiary} />
          <Text style={[styles.meta, { color: colors.textSecondary }]}>{item.date}</Text>
        </View>
        <View style={styles.metaRow}>
          <Icon name="mapPin" size={14} color={colors.textTertiary} />
          <Text style={[styles.meta, { color: colors.textSecondary }]}>{item.location}</Text>
        </View>

        <Text style={[styles.section, { color: colors.textSecondary }]}>STORY</Text>
        <Text style={[styles.body, { color: colors.text }]}>{item.story}</Text>

        {item.status === 'recovered' && (
          <View style={[styles.successBox, { backgroundColor: colors.successBg }]}>
            <Icon name="check-circle" size={18} color={colors.success} />
            <Text style={[styles.successText, { color: colors.text }]}>This case is closed — animal recovered safely.</Text>
          </View>
        )}

        <Button variant="soft" icon="forward">Share update</Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 12, paddingTop: 4 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  name: { fontSize: 22, fontWeight: '800', flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { fontSize: 14 },
  section: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginTop: 8 },
  body: { fontSize: 15, lineHeight: 23 },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radius.lg,
  },
  successText: { flex: 1, fontSize: 13.5, lineHeight: 19 },
});
