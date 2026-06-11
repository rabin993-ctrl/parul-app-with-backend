import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography } from '../../theme/tokens';
import { Icon } from '../../components/icons/Icon';
import { Toast, ToastData } from '../../components/ui/Toast';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { useCommunityGroups } from '../../context/CommunityGroupsContext';
import type { CommunityStackParamList } from '../../navigation/CommunityNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';

type Nav = NativeStackNavigationProp<CommunityStackParamList, 'Settings'>;

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{title}</Text>
  );
}

function FlatRow({
  icon,
  iconTint,
  label,
  hint,
  trailing,
  onPress,
  danger,
  last,
}: {
  icon: string;
  iconTint?: string;
  label: string;
  hint?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  const { colors } = useTheme();
  const tint = iconTint ?? colors.primary;
  const content = (
    <View style={[styles.row, !last && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={[styles.rowIcon, { backgroundColor: tint + '18' }]}>
        <Icon name={icon} size={17} color={tint} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, { color: danger ? colors.danger : colors.text }]}>{label}</Text>
        {hint ? <Text style={[styles.rowHint, { color: colors.textTertiary }]}>{hint}</Text> : null}
      </View>
      {trailing ?? (onPress ? (
        <Icon name="chevronRight" size={17} color={colors.textTertiary} />
      ) : null)}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.65 }}>
      {content}
    </Pressable>
  );
}

function GroupRow({
  g,
  onPress,
  trailing,
  last,
}: {
  g: { id: string; name: string; about: string; members: number; tint: string; icon: string; role?: string | null };
  onPress?: () => void;
  trailing?: React.ReactNode;
  last?: boolean;
}) {
  const { colors } = useTheme();
  const content = (
    <View style={[styles.groupRow, !last && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <LinearGradient colors={[g.tint, g.tint + 'BB']} style={styles.groupIcon}>
        <Icon name={g.icon} size={16} color="#fff" />
      </LinearGradient>
      <View style={styles.groupBody}>
        <View style={styles.groupTitleRow}>
          <Text style={[styles.groupName, { color: colors.text }]} numberOfLines={1}>{g.name}</Text>
          {(g.role === 'Moderator' || g.role === 'Admin') && (
            <View style={[styles.modBadge, { backgroundColor: colors.primary + '14' }]}>
              <Text style={[styles.modBadgeText, { color: colors.primary }]}>
                {g.role === 'Admin' ? 'Admin' : 'Mod'}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.groupMeta, { color: colors.textTertiary }]}>
          {g.members.toLocaleString()} members
        </Text>
      </View>
      {trailing ?? (onPress ? (
        <Icon name="chevronRight" size={16} color={colors.textTertiary} />
      ) : null)}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.65 }}>
      {content}
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function CommunitySettingsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const tabBarPad = useTabBarScrollPadding();
  const {
    communities,
    joinedCommunities,
    modCommunities,
    getCommunity,
    toggleJoin,
  } = useCommunityGroups();

  const [notifyAll, setNotifyAll] = useState(true);
  const [notifyMentions, setNotifyMentions] = useState(true);
  const [toast, setToast] = useState<ToastData | null>(null);

  const discover = communities.filter(c => !c.joined);

  const handleLeave = (id: string) => {
    const g = getCommunity(id);
    if (!g) return;
    toggleJoin(id);
    setToast({ msg: `Left ${g.name}`, icon: 'close', tone: 'neutral' });
  };

  const handleJoin = (id: string) => {
    const g = getCommunity(id);
    if (!g) return;
    toggleJoin(id);
    setToast({ msg: `Joined ${g.name}!`, icon: 'check', tone: 'success' });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="Community" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Create ─────────────────────────────────────────────────── */}
        <FlatRow
          icon="plus"
          iconTint={colors.primary}
          label="Create a community"
          hint="Start a new group around a topic or location"
          onPress={() => setToast({ msg: 'Coming soon', icon: 'sparkle', tone: 'primary' })}
          last
        />

        {/* ── My groups ──────────────────────────────────────────────── */}
        <SectionLabel title="MY GROUPS" />
        {joinedCommunities.length === 0 ? (
          <View style={styles.emptyBanner}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No groups joined yet — explore some below.
            </Text>
          </View>
        ) : (
          joinedCommunities.map((g, i) => (
            <GroupRow
              key={g.id}
              g={g}
              onPress={() => navigation.navigate('Group', { communityId: g.id })}
              last={i === joinedCommunities.length - 1}
            />
          ))
        )}

        {/* ── Manage (mod) ───────────────────────────────────────────── */}
        {modCommunities.length > 0 && (
          <>
            <SectionLabel title="MANAGE" />
            {modCommunities.map((g, i) => (
              <GroupRow
                key={g.id}
                g={g}
                onPress={() => navigation.navigate('Admin', { communityId: g.id })}
                trailing={
                  <View style={[styles.managePill, { backgroundColor: colors.warning + '18' }]}>
                    <Icon name="settings" size={13} color={colors.warning} />
                    <Text style={[styles.managePillText, { color: colors.warning }]}>Manage</Text>
                  </View>
                }
                last={i === modCommunities.length - 1}
              />
            ))}
          </>
        )}

        {/* ── Members ────────────────────────────────────────────────── */}
        <SectionLabel title="MEMBERS" />
        <FlatRow
          icon="user"
          label="All members"
          hint="People across your joined groups"
          onPress={() => navigation.navigate('Members')}
        />
        <FlatRow
          icon="clock"
          label="Pending requests"
          hint="Join requests awaiting review"
          onPress={() => setToast({ msg: 'No pending requests', icon: 'check', tone: 'neutral' })}
        />
        <FlatRow
          icon="check"
          label="Invitations sent"
          hint="Track invites you've shared"
          onPress={() => setToast({ msg: 'No active invitations', icon: 'check', tone: 'neutral' })}
          last
        />

        {/* ── Notifications ──────────────────────────────────────────── */}
        <SectionLabel title="NOTIFICATIONS" />
        <FlatRow
          icon="bell"
          label="All group posts"
          trailing={
            <Switch
              value={notifyAll}
              onValueChange={setNotifyAll}
              trackColor={{ false: colors.border, true: colors.primary + '88' }}
              thumbColor="#fff"
            />
          }
        />
        <FlatRow
          icon="comment"
          label="Mentions & replies"
          trailing={
            <Switch
              value={notifyMentions}
              onValueChange={setNotifyMentions}
              trackColor={{ false: colors.border, true: colors.primary + '88' }}
              thumbColor="#fff"
            />
          }
          last
        />

        {/* ── Guidelines ─────────────────────────────────────────────── */}
        <SectionLabel title="COMMUNITY" />
        <FlatRow
          icon="shield"
          label="Community guidelines"
          hint="Rules and standards for all groups"
          onPress={() => navigation.navigate('Rules')}
          last
        />

        {/* ── Discover ───────────────────────────────────────────────── */}
        {discover.length > 0 && (
          <>
            <SectionLabel title="DISCOVER" />
            {discover.map((g, i) => (
              <GroupRow
                key={g.id}
                g={g}
                trailing={
                  <Pressable
                    onPress={() => handleJoin(g.id)}
                    style={({ pressed }) => [
                      styles.joinBtn,
                      { backgroundColor: colors.primary + '14', opacity: pressed ? 0.65 : 1 },
                    ]}
                  >
                    <Text style={[styles.joinBtnText, { color: colors.primary }]}>Join</Text>
                  </Pressable>
                }
                last={i === discover.length - 1}
              />
            ))}
          </>
        )}

        {/* ── Leave ──────────────────────────────────────────────────── */}
        {joinedCommunities.length > 0 && (
          <>
            <SectionLabel title="LEAVE" />
            {joinedCommunities.map((g, i) => (
              <FlatRow
                key={g.id}
                icon="close"
                iconTint={colors.danger}
                label={`Leave ${g.name}`}
                onPress={() => handleLeave(g.id)}
                danger
                last={i === joinedCommunities.length - 1}
              />
            ))}
          </>
        )}
      </ScrollView>

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingTop: 8 },
  sectionLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowLabel: { fontSize: 15, fontWeight: '600' },
  rowHint: { fontSize: 12, marginTop: 1.5, lineHeight: 16 },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  groupIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  groupBody: { flex: 1, minWidth: 0 },
  groupTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  groupName: { fontSize: 14.5, fontWeight: '700', flexShrink: 1 },
  groupMeta: { fontSize: 12, marginTop: 1.5 },
  modBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  modBadgeText: { fontSize: 10.5, fontWeight: '700' },
  managePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  managePillText: { fontSize: 12, fontWeight: '700' },
  joinBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  joinBtnText: { fontSize: 13, fontWeight: '700' },
  emptyBanner: {
    marginHorizontal: 16,
    paddingVertical: 12,
  },
  emptyText: { fontSize: 14, lineHeight: 20 },
});
