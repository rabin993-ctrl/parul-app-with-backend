import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { Avatar, CompanionAvatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/icons/Icon';
import type { CirclesStackParamList } from '../../navigation/CirclesNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { companions, posts, users } from '../../data/mockData';
import { PawCircleSubHeader } from './PawCircleViews';

type Route = RouteProp<CirclesStackParamList, 'UserProfile'>;

export function UserProfileScreen() {
  const { colors } = useTheme();
  const route = useRoute<Route>();
  const user = users[route.params.userId];
  const tabBarPad = useTabBarScrollPadding();

  const userCompanions = useMemo(
    () => Object.values(companions).filter(c => c.ownerId === route.params.userId),
    [route.params.userId],
  );
  const userPosts = useMemo(
    () => posts.filter(p => p.userId === route.params.userId),
    [route.params.userId],
  );

  if (!user) return null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="Profile" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}
      >
        <View style={styles.hero}>
          <Avatar user={user} size={72} />
          <View style={styles.heroText}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.text }]}>{user.name}</Text>
              {user.verified && (
                <View style={[styles.verified, { backgroundColor: colors.accent }]}>
                  <Icon name="check" size={10} color="#fff" />
                </View>
              )}
            </View>
            <Text style={[styles.handle, { color: colors.textSecondary }]}>@{user.handle}</Text>
          </View>
        </View>

        {user.bio ? (
          <Text style={[styles.bio, { color: colors.textSecondary }]}>{user.bio}</Text>
        ) : null}

        {user.location ? (
          <View style={styles.locRow}>
            <Icon name="mapPin" size={12} color={colors.textTertiary} />
            <Text style={[styles.locText, { color: colors.textSecondary }]}>{user.location}</Text>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <StatChip value={user.circleCount ?? 0} label="Circles" colors={colors} />
          <StatChip value={userCompanions.length} label="Companions" colors={colors} />
          <StatChip value={userPosts.length} label="Posts" colors={colors} />
        </View>

        {userCompanions.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Companions</Text>
            <View style={styles.companionRow}>
              {userCompanions.map(c => (
                <View key={c.id} style={styles.companionItem}>
                  <CompanionAvatar companion={c} size={44} />
                  <Text style={[styles.companionName, { color: colors.text }]} numberOfLines={1}>
                    {c.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {userPosts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Recent posts</Text>
            {userPosts.slice(0, 3).map((p, index) => (
              <View key={p.id}>
                <Text style={[styles.postText, { color: colors.text }]} numberOfLines={3}>{p.text}</Text>
                <Text style={[styles.postTime, { color: colors.textTertiary }]}>{p.time}</Text>
                {index < Math.min(userPosts.length, 3) - 1 && (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatChip({
  value,
  label,
  colors,
}: {
  value: number;
  label: string;
  colors: { text: string; textSecondary: string };
}) {
  return (
    <View style={styles.statChip}>
      <Text style={[styles.statVal, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 14 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 4,
  },
  heroText: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  verified: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: { fontSize: 13 },
  bio: { fontSize: 14, lineHeight: 20 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locText: { fontSize: 12.5 },
  statsRow: { flexDirection: 'row', gap: 20 },
  statChip: { gap: 1 },
  statVal: { fontSize: 16, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600' },
  section: { gap: 10 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  companionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  companionItem: { alignItems: 'center', gap: 4, width: 56 },
  companionName: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  postText: { fontSize: 14, lineHeight: 20 },
  postTime: { fontSize: 11, marginTop: 4, marginBottom: 12 },
  divider: { height: StyleSheet.hairlineWidth, marginBottom: 12 },
});
