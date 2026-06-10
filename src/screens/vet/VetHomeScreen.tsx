import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Icon } from '../../components/icons/Icon';
import { IconButton } from '../../components/ui/Button';
import { VetModeCard } from '../../components/vet/VetChrome';
import { useVetConsult } from '../../context/VetConsultContext';
import type { VetStackParamList } from '../../navigation/VetNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';

type Nav = NativeStackNavigationProp<VetStackParamList, 'Home'>;

export function VetHomeScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { consultations } = useVetConsult();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const [loading, setLoading] = useState(true);

  const upcoming = consultations.filter(c =>
    !['completed', 'cancelled'].includes(c.status),
  );
  const recent = consultations.filter(c => c.status === 'completed').slice(0, 2);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Vet</Text>
        <View style={styles.headerActions}>
          <IconButton
            name="clock"
            size={40}
            tone="soft"
            color={colors.textSecondary}
            onPress={() => navigation.navigate('History')}
          />
          <IconButton
            name="search"
            size={40}
            tone="soft"
            color={colors.textSecondary}
            onPress={() => navigation.navigate('Browse')}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: tabBarPad, gap: 14 }}
          showsVerticalScrollIndicator={false}
          {...tabBarScrollProps}
        >
          <View style={[styles.hero, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '22' }]}>
            <View style={[styles.heroIcon, { backgroundColor: colors.primary + '18' }]}>
              <Icon name="medical" size={26} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroTitle, { color: colors.text }]}>On-demand pet care</Text>
              <Text style={[styles.heroBody, { color: colors.textSecondary }]}>
                Licensed vets available in minutes. Pay in advance, then start your consultation with confidence.
              </Text>
            </View>
          </View>

          <VetModeCard
            title="Urgent Vet Consultancy"
            body="Describe the issue — we'll match you with the next available vet, like a ride request."
            icon="alert"
            tint="#D94452"
            badge="Fast"
            onPress={() => navigation.navigate('UrgentIssue')}
          />

          <VetModeCard
            title="Choose a Vet"
            body="Browse trusted vets, compare fees and ratings, and book the right specialist for your pet."
            icon="search"
            tint="#14A697"
            onPress={() => navigation.navigate('Browse')}
          />

          {upcoming.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Active consultations</Text>
              {upcoming.map(c => (
                <Pressable
                  key={c.id}
                  onPress={() => navigation.navigate('Status', { consultId: c.id })}
                  style={[styles.activeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.activePet, { color: colors.text }]}>{c.petName} · {c.issueLabel}</Text>
                    <Text style={[styles.activeMeta, { color: colors.textSecondary }]}>
                      {c.vetName ?? 'Matching in progress…'}
                    </Text>
                  </View>
                  <Icon name="chevronRight" size={16} color={colors.textTertiary} />
                </Pressable>
              ))}
            </>
          )}

          {recent.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent</Text>
              {recent.map(c => (
                <Pressable
                  key={c.id}
                  onPress={() => navigation.navigate('Receipt', { consultId: c.id })}
                  style={[styles.activeCard, { backgroundColor: colors.surface2 }]}
                >
                  <Icon name="check-circle" size={18} color={colors.success} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.activePet, { color: colors.text }]}>{c.petName} with {c.vetName}</Text>
                    <Text style={[styles.activeMeta, { color: colors.textTertiary }]}>{c.createdAt}</Text>
                  </View>
                </Pressable>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', gap: 4 },
  hero: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: 17, fontWeight: '800' },
  heroBody: { fontSize: 13.5, lineHeight: 20, marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  activeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  activePet: { fontSize: 14, fontWeight: '700' },
  activeMeta: { fontSize: 12.5, marginTop: 2 },
});
