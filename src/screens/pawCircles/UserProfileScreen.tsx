import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography } from '../../theme/tokens';
import { Avatar, CompanionAvatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/icons/Icon';
import { IconButton } from '../../components/ui/Button';
import { PhotoSlot } from '../../components/ui/PhotoSlot';
import { ProfileTrustBadge, ProfileAdoptedStoryCard, ProfileStatsRow } from '../../components/profile/ProfileChrome';
import { useAdoption } from '../../context/AdoptionContext';
import {
  filterIncomingAdopted,
  filterOutgoingAdoptions,
  getAdopterTrustSummary,
} from '../../data/adoptionRecords';
import { getProfileTrust, getRescuesForUser } from '../../data/profileData';
import type { CirclesStackParamList } from '../../navigation/CirclesNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { companions, posts, users } from '../../data/mockData';
import { PawCircleSubHeader } from './PawCircleViews';

type Route = RouteProp<CirclesStackParamList, 'UserProfile'>;
type Nav = NativeStackNavigationProp<CirclesStackParamList, 'UserProfile'>;

type Tab = 'posts' | 'adopted';

// ─── Sub-components ───────────────────────────────────────────────────────────

function PostRow({ text, time, tint }: { text: string; time: string; tint: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.postRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.postAccent, { backgroundColor: tint + '55' }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.postText, { color: colors.text }]} numberOfLines={3}>{text}</Text>
        <Text style={[styles.postTime, { color: colors.textTertiary }]}>{time}</Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function UserProfileScreen() {
  const { colors } = useTheme();
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const tabBarPad = useTabBarScrollPadding();
  const { records } = useAdoption();
  const { userId, returnTo } = route.params;
  const user = users[userId as keyof typeof users];
  const isSelf = userId === 'you';

  const [tab, setTab] = useState<Tab>('posts');

  const handleBack = () => {
    if (returnTo === 'Feed' || returnTo === 'Messages') {
      navigation.getParent()?.navigate(returnTo);
      return;
    }
    navigation.goBack();
  };

  const userCompanions = useMemo(
    () => Object.values(companions).filter(c => c.ownerId === userId),
    [userId],
  );
  const userPosts = useMemo(
    () => posts.filter(p => p.userId === userId && !p.circle),
    [userId],
  );
  const rescues = useMemo(() => getRescuesForUser(userId), [userId]);
  const incomingAdopted = useMemo(
    () => filterIncomingAdopted(records, userId),
    [records, userId],
  );
  const outgoingCount = useMemo(
    () => filterOutgoingAdoptions(records, userId).length,
    [records, userId],
  );
  const adopterTrust = useMemo(
    () => getAdopterTrustSummary(records, userId),
    [records, userId],
  );
  const trust = useMemo(() => getProfileTrust(userId), [userId]);

  if (!user) return null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <IconButton name="chevronLeft" size={40} tone="soft" color={colors.textSecondary} onPress={handleBack} />
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {isSelf ? 'Your public profile' : user.name}
        </Text>
        <IconButton name="more" size={40} tone="soft" color={colors.textSecondary} onPress={() => {}} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarPad }}
      >
        {/* ── Hero with gradient crown ─────────────────────────────── */}
        <View style={styles.heroWrap}>
          <LinearGradient
            colors={[user.tint + '28', user.tint + '06', 'transparent']}
            style={styles.heroGradient}
          />
          <View style={styles.heroInner}>
            <Avatar user={user} size={88} />

            <View style={styles.nameBlock}>
              <View style={styles.nameRow}>
                <Text style={[styles.name, { color: colors.text }]}>{user.name}</Text>
                {user.verified && (
                  <View style={[styles.verifiedDot, { backgroundColor: colors.accent }]}>
                    <Icon name="check" size={10} color="#fff" />
                  </View>
                )}
              </View>
              <Text style={[styles.handle, { color: colors.primary }]}>@{user.handle}</Text>
            </View>

            {user.bio ? (
              <Text style={[styles.bio, { color: colors.textSecondary }]}>{user.bio}</Text>
            ) : null}

            {user.location ? (
              <View style={styles.locRow}>
                <Icon name="mapPin" size={13} color={colors.textTertiary} />
                <Text style={[styles.loc, { color: colors.textSecondary }]}>{user.location}</Text>
              </View>
            ) : null}

            <ProfileTrustBadge trust={trust} />

            <View style={styles.statsWrap}>
              <ProfileStatsRow
                items={[
                  { value: user.circleCount ?? 0, label: 'Circles' },
                  { value: userPosts.length, label: 'Posts' },
                  { value: rescues.length > 0 ? rescues.length : outgoingCount, label: rescues.length > 0 ? 'Rescues' : 'Rehomed' },
                  { value: incomingAdopted.length, label: 'Adopted' },
                ]}
              />
            </View>

            {/* Action buttons */}
            {!isSelf && (
              <View style={styles.actions}>
                <Pressable
                  onPress={() => navigation.getParent()?.navigate('Messages')}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    styles.actionBtnPrimary,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Icon name="send" size={15} color="#fff" />
                  <Text style={styles.actionBtnLabel}>Message</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionBtn,
                    styles.actionBtnSoft,
                    {
                      backgroundColor: colors.surface2,
                      borderColor: colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Icon name="plus" size={15} color={colors.text} />
                  <Text style={[styles.actionBtnLabelSoft, { color: colors.text }]}>Add to circle</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* ── Companions row ───────────────────────────────────────── */}
        {userCompanions.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>COMPANIONS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.companionScroll}>
              {userCompanions.map(c => (
                <View key={c.id} style={styles.companionChip}>
                  <CompanionAvatar companion={c} size={54} />
                  <Text style={[styles.companionName, { color: colors.text }]} numberOfLines={1}>{c.name}</Text>
                  <Text style={[styles.companionMeta, { color: colors.textTertiary }]} numberOfLines={1}>
                    {c.species === 'dog' ? 'Dog' : c.species === 'cat' ? 'Cat' : c.species}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Content tabs ─────────────────────────────────────────── */}
        <View style={[styles.tabs, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          {(['posts', 'adopted'] as Tab[]).map(t => {
            const active = tab === t;
            const label = t === 'posts' ? 'Posts' : 'Adopted';
            const icon = t === 'posts' ? 'grid' : 'heart';
            return (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                style={styles.tabBtn}
              >
                <Icon name={icon} size={18} color={active ? colors.text : colors.textTertiary} />
                <Text style={[styles.tabLabel, { color: active ? colors.text : colors.textTertiary, fontWeight: active ? '700' : '500' }]}>
                  {label}
                </Text>
                {active && <View style={[styles.tabIndicator, { backgroundColor: colors.text }]} />}
              </Pressable>
            );
          })}
        </View>

        {/* ── Tab content ──────────────────────────────────────────── */}
        <View style={styles.tabContent}>
          {tab === 'posts' && (
            userPosts.length === 0 ? (
              <EmptyTab icon="grid" label="No posts yet" />
            ) : (
              <View style={{ gap: 0 }}>
                {userPosts.slice(0, 6).map(p => (
                  <PostRow key={p.id} text={p.text} time={p.time} tint={user.tint} />
                ))}
              </View>
            )
          )}

          {tab === 'adopted' && (
            incomingAdopted.length === 0 ? (
              <EmptyTab icon="heart" label="No adopted pets yet" body="Confirmed adoptions they took in appear here." />
            ) : (
              <View style={{ gap: 0 }}>
                {incomingAdopted.map(record => (
                  <ProfileAdoptedStoryCard
                    key={record.id}
                    record={record}
                    compact
                    onPress={() => navigation.navigate('PublicAdoptedDetail', { recordId: record.id })}
                  />
                ))}
              </View>
            )
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function EmptyTab({ icon, label, body }: { icon: string; label: string; body?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.emptyTab}>
      <Icon name={icon} size={32} color={colors.textTertiary} />
      <Text style={[styles.emptyLabel, { color: colors.textSecondary }]}>{label}</Text>
      {body ? <Text style={[styles.emptyBody, { color: colors.textTertiary }]}>{body}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700' },

  // Hero
  heroWrap: { position: 'relative', paddingBottom: 20 },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  heroInner: {
    alignItems: 'center',
    paddingTop: 28,
    paddingHorizontal: 20,
    gap: 8,
  },
  nameBlock: { alignItems: 'center', gap: 2, marginTop: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  name: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  verifiedDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: { fontSize: 14, fontWeight: '500' },
  bio: { fontSize: 13.5, lineHeight: 19, textAlign: 'center', paddingHorizontal: 12 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  loc: { fontSize: 12.5 },

  statsWrap: { width: '100%', marginTop: 4 },

  // Action buttons
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.full,
  },
  actionBtnPrimary: {},
  actionBtnSoft: { borderWidth: StyleSheet.hairlineWidth },
  actionBtnLabel: { fontSize: 14, fontWeight: '700', color: '#fff' },
  actionBtnLabelSoft: { fontSize: 14, fontWeight: '700' },

  // Companions
  section: { paddingTop: 4, paddingBottom: 8 },
  sectionLabel: {
    ...typography.sectionLabel,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  companionScroll: { paddingHorizontal: 16, gap: 16 },
  companionChip: { alignItems: 'center', gap: 5, width: 64 },
  companionName: { fontSize: 11.5, fontWeight: '700', textAlign: 'center' },
  companionMeta: { fontSize: 10.5, textAlign: 'center' },

  // Tabs
  tabs: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    position: 'relative',
  },
  tabLabel: { fontSize: 13.5 },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '15%',
    right: '15%',
    height: 2,
    borderRadius: 1,
  },

  // Tab content
  tabContent: { paddingHorizontal: 16, paddingTop: 12 },
  postRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  postAccent: { width: 3, borderRadius: 2, flexShrink: 0, alignSelf: 'stretch' },
  postText: { fontSize: 14, lineHeight: 20 },
  postTime: { fontSize: 11.5, marginTop: 4 },
  emptyTab: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyLabel: { fontSize: 15, fontWeight: '700' },
  emptyBody: { fontSize: 13, textAlign: 'center', lineHeight: 18, paddingHorizontal: 16 },
});
