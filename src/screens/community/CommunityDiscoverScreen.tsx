import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Icon } from '../../components/icons/Icon';
import { Button } from '../../components/ui/Button';
import { Empty } from '../../components/ui/Empty';
import { Toast, ToastData } from '../../components/ui/Toast';
import { ProfileSubHeader } from '../../components/profile/ProfileChrome';
import { useCommunityGroups } from '../../context/CommunityGroupsContext';
import type { Community } from '../../data/mockData';
import type { CommunityStackParamList } from '../../navigation/CommunityNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';

type Nav = NativeStackNavigationProp<CommunityStackParamList, 'Discover'>;

function shade(hex: string, pct: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const f = pct < 0 ? 0 : 255;
  const t = Math.abs(pct) / 100;
  r = Math.round((f - r) * t) + r;
  g = Math.round((f - g) * t) + g;
  b = Math.round((f - b) * t) + b;
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function DiscoverHero({ groups }: { groups: Community[] }) {
  const { colors } = useTheme();
  const preview = groups.slice(0, 3);

  return (
    <View style={styles.hero}>
      {preview.length > 0 && (
        <View style={styles.heroOrbs}>
          {preview.map((g, i) => (
            <LinearGradient
              key={g.id}
              colors={[g.tint, shade(g.tint, -18)]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.heroOrb,
                { marginLeft: i > 0 ? -14 : 0, zIndex: preview.length - i },
              ]}
            >
              <Icon
                name={g.icon}
                size={22}
                color="#fff"
                fill={g.icon === 'heart' || g.icon === 'dog' || g.icon === 'cat' ? '#fff' : 'none'}
              />
            </LinearGradient>
          ))}
        </View>
      )}

      <Text style={[styles.heroTitle, { color: colors.text }]}>Find your crowd</Text>
      <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
        {groups.length > 0
          ? `${groups.length} open group${groups.length !== 1 ? 's' : ''} around pets, rescue, and care.`
          : 'You\'re in every group for now.'}
      </Text>
    </View>
  );
}

function DiscoverGroupCard({
  group,
  onOpen,
  onJoin,
}: {
  group: Community;
  onOpen: () => void;
  onJoin: () => void;
}) {
  const { colors } = useTheme();
  const filled = group.icon === 'dog' || group.icon === 'cat' || group.icon === 'heart';

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.88 : 1 }]}
    >
      <LinearGradient
        colors={[group.tint, shade(group.tint, -16)]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardIcon}
      >
        <Icon name={group.icon} size={28} color="#fff" fill={filled ? '#fff' : 'none'} />
      </LinearGradient>

      <View style={styles.cardBody}>
        <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
          {group.name}
        </Text>
        <View style={styles.cardMetaRow}>
          <Icon name="user" size={12} color={colors.textTertiary} />
          <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
            {group.members} members
          </Text>
          <Text style={[styles.cardMetaDot, { color: colors.textTertiary }]}>·</Text>
          <Text style={[styles.cardMeta, { color: colors.textTertiary }]}>Public</Text>
        </View>
        <Text style={[styles.cardAbout, { color: colors.textSecondary }]} numberOfLines={2}>
          {group.about}
        </Text>
        <Button
          size="sm"
          variant="soft"
          onPress={onJoin}
          style={styles.cardJoin}
        >
          Join group
        </Button>
      </View>
    </Pressable>
  );
}

export function CommunityDiscoverScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const tabBarPad = useTabBarScrollPadding();
  const { communities, getCommunity, toggleJoin } = useCommunityGroups();
  const [toast, setToast] = useState<ToastData | null>(null);

  const discover = communities.filter(c => !c.joined);

  const handleJoin = (id: string) => {
    const g = getCommunity(id);
    if (!g) return;
    toggleJoin(id);
    setToast({ msg: `Joined ${g.name}!`, icon: 'check', tone: 'success' });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader title="Discover" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <DiscoverHero groups={discover} />

        {discover.length === 0 ? (
          <Empty
            icon="communities"
            title="All caught up"
            body="You've joined every community available. Check back when new groups open."
          />
        ) : (
          <View style={styles.list}>
            <View style={styles.kickerRow}>
              <View style={[styles.kickerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.kicker, { color: colors.textTertiary }]}>open now</Text>
              <View style={[styles.kickerLine, { backgroundColor: colors.border }]} />
            </View>

            {discover.map((g, i) => (
              <View key={g.id}>
                <DiscoverGroupCard
                  group={g}
                  onOpen={() => navigation.navigate('Group', { communityId: g.id })}
                  onJoin={() => handleJoin(g.id)}
                />
                {i < discover.length - 1 && (
                  <View style={[styles.rule, { backgroundColor: colors.border }]} />
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  hero: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 28,
    gap: 10,
  },
  heroOrbs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  heroOrb: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 300,
    paddingHorizontal: 8,
  },
  list: { gap: 0 },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  kickerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  kicker: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 16,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, minWidth: 0, gap: 4 },
  cardName: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  cardMeta: { fontSize: 12.5, fontWeight: '500' },
  cardMetaDot: { fontSize: 12.5 },
  cardAbout: { fontSize: 13.5, lineHeight: 19, marginTop: 4 },
  cardJoin: { alignSelf: 'flex-start', marginTop: 10 },
  rule: { height: StyleSheet.hairlineWidth, marginLeft: 70 },
});
