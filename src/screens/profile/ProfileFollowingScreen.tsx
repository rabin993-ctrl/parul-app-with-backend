import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { Empty } from '../../components/ui/Empty';
import { ProfileSubHeader } from '../../components/profile/ProfileChrome';
import { CompanionAvatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { CompanionFullProfile } from '../../components/CompanionProfile';
import { Toast, ToastData } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import { supabase } from '../../lib/supabase';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';
import {
  navigateToCompanionPostDetailFromNested,
} from '../../navigation/companionProfileRouting';

type FollowedCompanion = {
  id: string;
  name: string;
  species: string;
  icon: string;
  tint: string;
  followers: number;
};

function formatCount(n: number): string {
  if (n >= 1000) {
    const v = n / 1000;
    return (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10).toString().replace(/\.0$/, '') + 'K';
  }
  return String(n);
}

const SPECIES_META = {
  dog: { tint: '#14A697', icon: 'dog' },
  cat: { tint: '#7A5AE0', icon: 'cat' },
  other: { tint: '#C98E2A', icon: 'paw' },
} as const;

type FollowingRouteParams = { userId?: string };

export function ProfileFollowingScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const routeUserId = (route.params as FollowingRouteParams | undefined)?.userId;
  const fromPublicProfile = route.name === 'UserFollowing';
  const { user: authUser } = useAuth();
  const targetUserId = routeUserId ?? authUser?.id ?? '';
  const isOwnList = !!authUser?.id && targetUserId === authUser.id;
  const profileUser = useUserProfile(isOwnList ? null : targetUserId);
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const [loading, setLoading] = useState(true);
  const [companions, setCompanions] = useState<FollowedCompanion[]>([]);
  const [unfollowingId, setUnfollowingId] = useState<string | null>(null);
  const [companionProfileId, setCompanionProfileId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  const headerTitle = isOwnList
    ? 'Following'
    : profileUser?.handle
      ? `@${profileUser.handle} · Following`
      : 'Following';

  const load = useCallback(async () => {
    if (!targetUserId) {
      setCompanions([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: followRows } = await supabase
      .from('companion_followers')
      .select('companion_id')
      .eq('user_id', targetUserId);

    const companionIds = (followRows ?? []).map(r => r.companion_id);

    const companionsRes = companionIds.length > 0
      ? await supabase
          .from('companions')
          .select('id,name,species,icon,tint,owner_id')
          .in('id', companionIds)
          .is('deleted_at', null)
      : { data: [], error: null };

    const companionRows = companionsRes.data ?? [];

    const followerCounts = new Map<string, number>();
    if (companionIds.length > 0) {
      const { data: followerRows } = await supabase
        .from('companion_followers')
        .select('companion_id')
        .in('companion_id', companionIds);
      for (const row of followerRows ?? []) {
        followerCounts.set(row.companion_id, (followerCounts.get(row.companion_id) ?? 0) + 1);
      }
    }

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
        followers: followerCounts.get(row.id) ?? 0,
      };
    }));
    setLoading(false);
  }, [targetUserId]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const openCompanion = useCallback((companionId: string) => {
    if (fromPublicProfile) {
      setCompanionProfileId(companionId);
      return;
    }
    navigation.navigate('Companion' as never, { companionId } as never);
  }, [fromPublicProfile, navigation]);

  const handleUnfollowCompanion = useCallback(async (companionId: string) => {
    if (!authUser?.id || !isOwnList || unfollowingId) return;
    setUnfollowingId(companionId);
    setCompanions(prev => prev.filter(c => c.id !== companionId));
    const { error } = await supabase
      .from('companion_followers')
      .delete()
      .eq('companion_id', companionId)
      .eq('user_id', authUser.id);
    if (error) {
      await load();
    }
    setUnfollowingId(null);
  }, [authUser?.id, isOwnList, unfollowingId, load]);

  const empty = !loading && companions.length === 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader title={headerTitle} onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : empty ? (
        <View style={styles.emptyWrap}>
          <Empty
            icon="paw"
            title={isOwnList ? 'Not following any companions yet' : 'No followed companions'}
            body={
              isOwnList
                ? 'Follow pets from their profile and they’ll show up here.'
                : 'This person hasn’t followed any companions yet.'
            }
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}
          showsVerticalScrollIndicator={false}
          {...tabBarScrollProps}
        >
          <View style={styles.companionList}>
            {companions.map((item, index) => (
              <View key={item.id}>
                <View style={styles.companionRow}>
                  <Pressable
                    onPress={() => openCompanion(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${item.name}'s profile`}
                    style={({ pressed }) => [
                      styles.companionMain,
                      pressed && { opacity: 0.72 },
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
                      size={44}
                    />
                    <View style={styles.companionCopy}>
                      <Text style={[styles.companionName, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.companionMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                        {formatCount(item.followers)} follower{item.followers === 1 ? '' : 's'}
                      </Text>
                    </View>
                  </Pressable>
                  {isOwnList ? (
                    <Button
                      size="sm"
                      variant="soft"
                      loading={unfollowingId === item.id}
                      disabled={unfollowingId !== null && unfollowingId !== item.id}
                      onPress={() => { void handleUnfollowCompanion(item.id); }}
                    >
                      Unfollow
                    </Button>
                  ) : null}
                </View>
                {index < companions.length - 1 ? (
                  <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                ) : null}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {companionProfileId ? (
        <CompanionFullProfile
          companionId={companionProfileId}
          visible
          onClose={() => setCompanionProfileId(null)}
          onSwitchCompanion={setCompanionProfileId}
          onOwnerPress={ownerId => {
            setCompanionProfileId(null);
            if (ownerId !== targetUserId) {
              navigation.navigate('UserProfile' as never, { userId: ownerId } as never);
            }
          }}
          onToast={setToast}
          onOpenPostDetail={(postId, cid) => {
            setCompanionProfileId(null);
            if (fromPublicProfile) {
              navigateToCompanionPostDetailFromNested(navigation, { postId, companionId: cid });
            } else {
              navigation.navigate('CompanionPostDetail' as never, { postId, companionId: cid } as never);
            }
          }}
        />
      ) : null}
      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },
  companionList: { gap: 0 },
  companionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  companionMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  companionCopy: { flex: 1, minWidth: 0, gap: 2 },
  companionName: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  companionMeta: { fontSize: 13 },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 56,
  },
});
