import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Empty } from '../../components/ui/Empty';
import { Icon } from '../../components/icons/Icon';
import { Badge } from '../../components/ui/Badge';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { useVetConsult } from '../../context/VetConsultContext';
import { statusLabel, statusTone } from '../../data/vetData';
import type { VetStackParamList } from '../../navigation/VetNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';

type Nav = NativeStackNavigationProp<VetStackParamList, 'History'>;

export function VetHistoryScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { consultations } = useVetConsult();
  const tabBarPad = useTabBarScrollPadding();

  const upcoming = consultations.filter(c => !['completed', 'cancelled'].includes(c.status));
  const past = consultations.filter(c => ['completed', 'cancelled'].includes(c.status));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="Consultations" onBack={() => navigation.goBack()} />

      <FlatList
        data={[...upcoming, ...past]}
        keyExtractor={c => c.id}
        contentContainerStyle={{ padding: 16, paddingBottom: tabBarPad, gap: 10, flexGrow: 1 }}
        ListHeaderComponent={
          upcoming.length > 0 ? (
            <Text style={[styles.section, { color: colors.text }]}>Upcoming & active</Text>
          ) : null
        }
        renderItem={({ item, index }) => {
          const showPastHeader = upcoming.length > 0 && index === upcoming.length;
          return (
            <>
              {showPastHeader && (
                <Text style={[styles.section, { color: colors.text, marginTop: 8 }]}>Past</Text>
              )}
              <Pressable
                onPress={() => {
                  if (item.status === 'completed') navigation.navigate('Receipt', { consultId: item.id });
                  else if (['active', 'session_ready'].includes(item.status)) navigation.navigate('Chat', { consultId: item.id });
                  else navigation.navigate('Status', { consultId: item.id });
                }}
                style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={[styles.icon, { backgroundColor: colors.primary + '14' }]}>
                  <Icon name="medical" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pet, { color: colors.text }]}>{item.petName} · {item.issueLabel}</Text>
                  <Text style={[styles.meta, { color: colors.textSecondary }]}>
                    {item.vetName ?? 'Matching…'} · {item.createdAt}
                  </Text>
                </View>
                <Badge tone={statusTone(item.status)}>{statusLabel(item.status).split('…')[0]}</Badge>
              </Pressable>
            </>
          );
        }}
        ListEmptyComponent={
          <Empty icon="medical" title="No consultations yet" body="Request urgent help or choose a vet to get started." />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  section: { fontSize: 14, fontWeight: '800', marginBottom: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pet: { fontSize: 14, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 2 },
});
