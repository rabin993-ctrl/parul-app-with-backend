import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography } from '../../theme/tokens';
import { Empty } from '../../components/ui/Empty';
import { ProfileSubHeader } from '../../components/profile/ProfileChrome';
import { RescueListCard } from '../../components/rescue/RescueCaseUI';
import { CompanionAvatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/icons/Icon';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatRescueUpdateTime, type RescueCase } from '../../data/profileData';
import type { ProfileStackParamList } from '../../navigation/ProfileNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'Following'>;

type FollowedCompanion = {
  id: string;
  name: string;
  species: string;
  icon: string;
  tint: string;
  ownerId: string;
  ownerName: string;
};

const SPECIES_META = {
  dog: { tint: '#14A697', icon: 'dog' },
  cat: { tint: '#7A5AE0', icon: 'cat' },
  other: { tint: '#C98E2A', icon: 'paw' },
} as const;

function mapRescueRow(row: {
  id: string;
  poster_user_id: string;
  case_code: string | null;
  name: string;
  species: string;
  icon: string | null;
  tint: string | null;
  status: string;
  location: string | null;
  story: string | null;
  headline: string | null;
  tags: string[];
  created_at: string;
}): RescueCase {
  const speciesKey = (row.species as keyof typeof SPECIES_META) in SPECIES_META
    ? (row.species as keyof typeof SPECIES_META)
    : 'other';
  return {
    id: row.id,
    userId: row.poster_user_id,
    name: row.name,
    species: row.species,
    icon: row.icon ?? SPECIES_META[speciesKey].icon,
    tint: row.tint ?? SPECIES_META[speciesKey].tint,
    status: (row.status ?? 'active') as RescueCase['status'],
    date: formatRescueUpdateTime(new Date(row.created_at)),
    location: row.location ?? '',
    story: row.story ?? '',
    headline: row.headline ?? undefined,
    caseId: row.case_code ?? undefined,
    tags: row.tags ?? [],
    followers: 0,
    updates: [],
  };
}

export function ProfileFollowingScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const [loading, setLoading] = useState(true);
  const [rescues, setRescues] = useState<RescueCase[]>([]);
  const [companions, setCompanions] = useState<FollowedCompanion[]>([]);

  const load = useCallback(async () => {
    if (!user?.id) {
      setRescues([]);
      setCompanions([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const [rescueFollowRes, companionFollowRes] = await Promise.all([
      supabase.from('rescue_case_followers').select('case_id').eq('user_id', user.id),
      supabase.from('companion_followers').select('companion_id').eq('user_id', user.id),
    ]);

    const rescueIds = (rescueFollowRes.data ?? []).map(r => r.case_id);
    const companionIds = (companionFollowRes.data ?? []).map(r => r.companion_id);

    const [rescueCasesRes, companionsRes] = await Promise.all([
      rescueIds.length > 0
        ? supabase
            .from('rescue_cases')
            .select('id,poster_user_id,case_code,name,species,icon,tint,status,location,story,headline,tags,created_at')
            .in('id', rescueIds)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      companionIds.length > 0
        ? supabase
            .from('companions')
            .select('id,name,species,icon,tint,owner_id')
            .in('id', companionIds)
            .is('deleted_at', null)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const rescueRows = rescueCasesRes.data ?? [];
    const companionRows = companionsRes.data ?? [];

    const ownerIds = [...new Set(companionRows.map(c => c.owner_id))];
    const { data: ownerRows } = ownerIds.length > 0
      ? await supabase.from('users').select('id,name').in('id', ownerIds)
      : { data: [] as { id: string; name: string }[] };
    const ownerNames = new Map((ownerRows ?? []).map(o => [o.id, o.name ?? 'Owner']));

    setRescues(rescueRows.map(mapRescueRow));
    setCompanions(companionRows.map(row => {
      const speciesKey = (row.species as keyof typeof SPECIES_META) in SPECIES_META
        ? (row.species as keyof typeof SPECIES_META)
        : 'other';
      return {
        id: row.id,
        name: row.name,
        species: row.species,
        icon: row.icon ?? SPECIES_META[speciesKey].icon,
        tint: row.tint ?? SPECIES_META[speciesKey].tint,
        ownerId: row.owner_id,
        ownerName: ownerNames.get(row.owner_id) ?? 'Owner',
      };
    }));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const empty = !loading && rescues.length === 0 && companions.length === 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader title="Following" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : empty ? (
        <View style={styles.emptyWrap}>
          <Empty
            icon="user"
            title="Not following anyone yet"
            body="Follow rescue cases from Rescues, or companions from their profile, and they’ll show up here."
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}
          showsVerticalScrollIndicator={false}
          {...tabBarScrollProps}
        >
          {rescues.length > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Rescue cases</Text>
              <View style={styles.list}>
                {rescues.map(item => (
                  <RescueListCard
                    key={item.id}
                    item={item}
                    onPress={() => navigation.navigate('RescueDetail', { caseId: item.id })}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {companions.length > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Companions</Text>
              <View style={styles.list}>
                {companions.map(item => (
                  <Pressable
                    key={item.id}
                    onPress={() => navigation.navigate('Companion', { companionId: item.id })}
                    style={({ pressed }) => [
                      styles.companionRow,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <CompanionAvatar
                      companion={{
                        id: item.id,
                        name: item.name,
                        species: item.species,
                        icon: item.icon,
                        tint: item.tint,
                      }}
                      size={48}
                    />
                    <View style={styles.companionCopy}>
                      <Text style={[styles.companionName, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.companionMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.ownerName}
                      </Text>
                    </View>
                    <Icon name="chevronRight" size={16} color={colors.textTertiary} />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 20 },
  section: { gap: 10 },
  sectionTitle: { ...typography.label, fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  list: { gap: 10 },
  companionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  companionCopy: { flex: 1, minWidth: 0, gap: 2 },
  companionName: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  companionMeta: { fontSize: 13 },
});
