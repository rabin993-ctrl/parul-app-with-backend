import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { Avatar } from '../../components/ui/Avatar';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { useCommunityGroups } from '../../context/CommunityGroupsContext';
import { supabase } from '../../lib/supabase';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';

type MemberRow = {
  id: string;
  name: string;
  handle: string;
  tint: string | null;
  location: string | null;
};

export function CommunityMembersScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const tabBarPad = useTabBarScrollPadding();
  const { joinedCommunities } = useCommunityGroups();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = joinedCommunities.map(c => c.id);
    if (!ids.length) { setLoading(false); return; }

    supabase
      .from('community_members')
      .select('user:users!community_members_user_id_fkey(id, name, handle, tint, location)')
      .in('community_id', ids)
      .then(({ data }) => {
        const seen = new Set<string>();
        const unique: MemberRow[] = [];
        for (const row of (data ?? [])) {
          const u = row.user as MemberRow | null;
          if (u && !seen.has(u.id)) { seen.add(u.id); unique.push(u); }
        }
        setMembers(unique.sort((a, b) => a.name.localeCompare(b.name)));
        setLoading(false);
      });
  }, [joinedCommunities]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="Members" onBack={() => navigation.goBack()} />

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Across {joinedCommunities.length} joined group{joinedCommunities.length !== 1 ? 's' : ''}
      </Text>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={u => u.id}
          contentContainerStyle={{ paddingBottom: tabBarPad, paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                (navigation as any).getParent()?.navigate('Circles', {
                  screen: 'UserProfile',
                  params: { userId: item.id },
                });
              }}
              style={({ pressed }) => pressed && { opacity: 0.7 }}
            >
              <View style={[styles.row, { borderBottomColor: colors.border }]}>
                <Avatar user={{ id: item.id, name: item.name, tint: item.tint ?? '#F2972E' }} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.meta, { color: colors.textSecondary }]}>
                    @{item.handle}{item.location ? ` · ${item.location}` : ''}
                  </Text>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  subtitle: { fontSize: 13, paddingHorizontal: 16, paddingBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12.5, marginTop: 2 },
});
