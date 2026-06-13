import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import type { CommunityStackParamList } from '../../navigation/CommunityNavigator';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows } from '../../theme/tokens';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Sheet } from '../../components/ui/Sheet';
import { Tabs } from '../../components/ui/Tabs';
import { SectionHead } from '../../components/ui/SectionHead';
import { PhotoSlot } from '../../components/ui/PhotoSlot';
import { Toast, ToastData } from '../../components/ui/Toast';
import { Icon } from '../../components/icons/Icon';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import type { Community } from '../../data/mockData';
import { useCommunityGroups } from '../../context/CommunityGroupsContext';
import { useCommunityMembersWithProfiles } from '../../hooks/useCommunityMembersWithProfiles';
import { useCommunityEvents } from '../../hooks/useCommunityEvents';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';

function shade(hex: string, pct: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = pct < 0 ? 0 : 255, t = Math.abs(pct) / 100;
  r = Math.round((f - r) * t) + r; g = Math.round((f - g) * t) + g; b = Math.round((f - b) * t) + b;
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function CommunityHubScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { communities, toggleJoin, loading } = useCommunityGroups();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();

  useFocusEffect(useCallback(() => () => setDetailId(null), []));

  const joined = communities.filter(c => c.joined);
  const discover = communities.filter(c => !c.joined);
  const detail = detailId ? communities.find(c => c.id === detailId) ?? null : null;

  const handleToggleJoin = (id: string, name: string) => {
    const community = communities.find(c => c.id === id);
    const willJoin = !community?.joined;
    const isRequestPolicy = community?.joinPolicy === 'request';
    toggleJoin(id);
    if (willJoin && isRequestPolicy) {
      setToast({ msg: `Request sent to ${name}`, icon: 'clock', tone: 'primary' });
    } else {
      setToast({
        msg: willJoin ? `Joined ${name}` : `Left ${name}`,
        icon: willJoin ? 'check' : 'close',
        tone: willJoin ? 'success' : 'neutral',
      });
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="Groups" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: tabBarPad, gap: 10 }}
          showsVerticalScrollIndicator={false}
          {...tabBarScrollProps}
        >
          {joined.length > 0 && (
            <>
              <SectionHead title="Your communities" />
              {joined.map(c => (
                <CommunityRow key={c.id} c={c} onPress={() => setDetailId(c.id)} onAction={() => handleToggleJoin(c.id, c.name)} />
              ))}
              <View style={{ height: 8 }} />
            </>
          )}

          <SectionHead title="Discover" />
          {discover.map(c => (
            <CommunityRow
              key={c.id}
              c={c}
              onPress={() => setDetailId(c.id)}
              onAction={(e) => { e?.stopPropagation?.(); handleToggleJoin(c.id, c.name); }}
            />
          ))}
        </ScrollView>
      )}

      <Sheet visible={!!detail} onClose={() => setDetailId(null)}>
        {detail && (
          <CommunityDetail
            c={detail}
            onToast={setToast}
            onToggleJoin={() => handleToggleJoin(detail.id, detail.name)}
            onClose={() => setDetailId(null)}
          />
        )}
      </Sheet>

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

function CommunityRow({ c, onPress, onAction }: {
  c: Community;
  onPress: () => void;
  onAction?: (e?: { stopPropagation?: () => void }) => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.communityRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <LinearGradient
        colors={[c.tint, shade(c.tint, -16)]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.communityIcon}
      >
        <Icon name={c.icon} size={26} color="#fff" />
      </LinearGradient>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[styles.communityName, { color: colors.text }]}>{c.name}</Text>
          {c.role === 'Moderator' && <Badge tone="primary" icon="crown">Mod</Badge>}
        </View>
        <Text style={[styles.communityMembers, { color: colors.textSecondary }]}>{c.members} members</Text>
        <Text style={[styles.communityAbout, { color: colors.textTertiary }]} numberOfLines={1}>{c.about}</Text>
      </View>
      {c.joined
        ? <Icon name="chevronRight" size={20} color={colors.textTertiary} />
        : <Button size="sm" variant="soft" onPress={onAction}>Join</Button>
      }
    </Pressable>
  );
}

function CommunityDetail({ c, onToast, onToggleJoin, onClose }: {
  c: Community;
  onToast: (t: ToastData) => void;
  onToggleJoin: () => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<CommunityStackParamList>>();
  const [tab, setTab] = useState('about');
  const { members } = useCommunityMembersWithProfiles(c.id);
  const { events } = useCommunityEvents(c.id);
  const TABS = [
    { id: 'about', label: 'About' },
    { id: 'events', label: 'Events' },
    { id: 'members', label: 'Members' },
  ];

  const handleToggle = () => {
    onToggleJoin();
    onToast({
      msg: c.joined ? 'Left community' : `Joined ${c.name}`,
      icon: c.joined ? 'close' : 'check',
      tone: c.joined ? 'neutral' : 'success',
    });
  };

  return (
    <View style={{ marginHorizontal: -18 }}>
      <View style={{ position: 'relative' }}>
        <PhotoSlot height={120} borderRadius={0} imageKey={`community-cover-${c.id}`} label="" />
        <LinearGradient
          colors={[c.tint, shade(c.tint, -16)]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.detailFloatIcon, { borderColor: colors.surface }]}
        >
          <Icon name={c.icon} size={30} color="#fff" />
        </LinearGradient>
      </View>

      <View style={{ padding: 18, paddingTop: 34 }}>
        <View style={styles.detailHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.detailName, { color: colors.text }]}>{c.name}</Text>
            <Text style={[styles.detailMeta, { color: colors.textSecondary }]}>
              {c.members} members · {c.joinPolicy === 'open' ? 'Open' : c.joinPolicy === 'invite' ? 'Invite only' : 'Request to join'}
            </Text>
          </View>
          <Button size="sm" variant={c.joined ? 'outline' : 'primary'} onPress={handleToggle}>
            {c.joined ? 'Leave' : 'Join'}
          </Button>
          <Button size="sm" variant="soft" onPress={() => { onClose(); navigation.navigate('Group', { communityId: c.id }); }}>
            Open
          </Button>
        </View>

        <Text style={[styles.detailAbout, { color: colors.textSecondary }]}>{c.about}</Text>
        <Tabs tabs={TABS} active={tab} onChange={setTab} />

        <View style={{ paddingTop: 14 }}>
          {tab === 'events' && (
            <View style={{ gap: 10 }}>
              {events.length === 0 ? (
                <Text style={{ color: colors.textTertiary, textAlign: 'center', paddingVertical: 20 }}>
                  No upcoming events
                </Text>
              ) : (
                events.map(ev => {
                  const d = new Date(ev.startsAt);
                  const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                  return (
                    <View key={ev.id} style={[styles.eventCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                      <View style={[styles.eventDateBadge, { backgroundColor: (ev.tint ?? c.tint) + '22' }]}>
                        <Text style={[styles.eventDateText, { color: ev.tint ?? c.tint }]}>{dateStr}</Text>
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>{ev.title}</Text>
                        <Text style={[styles.eventMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                          {timeStr}{ev.location ? ` · ${ev.location}` : ''}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}
          {tab === 'members' && (
            <View style={{ gap: 8 }}>
              {members.slice(0, 4).map(u => (
                <View key={u.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 6 }}>
                  <Avatar user={{ id: u.id, name: u.name, tint: u.tint ?? '#F2972E' }} size={36} />
                  <Text style={[styles.communityName, { color: colors.text }]}>{u.name}</Text>
                </View>
              ))}
            </View>
          )}
          {tab === 'about' && (
            <Text style={[styles.detailAbout, { color: colors.textSecondary, marginTop: 0 }]}>
              {c.about}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  communityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    ...shadows.sm,
  },
  communityIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityName: { fontSize: 15, fontWeight: '700' },
  communityMembers: { fontSize: 12.5, marginTop: 1 },
  communityAbout: { fontSize: 12.5, marginTop: 2 },
  detailFloatIcon: {
    position: 'absolute',
    left: 18,
    bottom: -26,
    width: 62,
    height: 62,
    borderRadius: radius.md,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  detailName: { fontSize: 20, fontWeight: '800' },
  detailMeta: { fontSize: 13, marginTop: 2 },
  detailAbout: { fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 14 },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  eventDateBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  eventDateText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  eventTitle: { fontSize: 14, fontWeight: '700' },
  eventMeta: { fontSize: 12, marginTop: 2 },
});
