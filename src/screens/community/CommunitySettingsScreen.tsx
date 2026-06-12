import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { Toast, ToastData } from '../../components/ui/Toast';
import { ProfileSubHeader } from '../../components/profile/ProfileChrome';
import {
  ProfileMenuGroupRail,
  ProfileMenuIntro,
  ProfileMenuLink,
  ProfileMenuSection,
  ProfileMenuSubsection,
  ProfileMenuToggleRow,
  profileMenuStyles,
} from '../../components/profile/ProfileSettingsRows';
import { useCommunityGroups } from '../../context/CommunityGroupsContext';
import { useCommunityFeed } from '../../context/CommunityFeedContext';
import type { Community } from '../../data/mockData';
import type { CommunityStackParamList } from '../../navigation/CommunityNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';

type Nav = NativeStackNavigationProp<CommunityStackParamList, 'Settings'>;

export function CommunitySettingsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const tabBarPad = useTabBarScrollPadding();
  const {
    joinedCommunities,
    modCommunities,
    getCommunity,
    getPendingRequestCount,
    formatCommunityMemberLabel,
    toggleJoin,
    isAdmin,
    isMod,
  } = useCommunityGroups();
  const { savedPosts } = useCommunityFeed();

  const [notifyAll, setNotifyAll] = useState(true);
  const [notifyMentions, setNotifyMentions] = useState(true);
  const [toast, setToast] = useState<ToastData | null>(null);

  const runGroups = modCommunities;

  const memberGroups = useMemo(
    () => joinedCommunities.filter(g => !isMod(g.id)),
    [joinedCommunities, isMod],
  );

  const totalPending = useMemo(
    () => runGroups.reduce((n, g) => n + getPendingRequestCount(g.id), 0),
    [runGroups, getPendingRequestCount],
  );

  const handleLeave = (id: string) => {
    if (isMod(id)) return;
    const g = getCommunity(id);
    if (!g) return;
    toggleJoin(id);
    setToast({ msg: `Left ${g.name}`, icon: 'close', tone: 'neutral' });
  };

  const groupMeta = (g: Community) => {
    const membersLabel = formatCommunityMemberLabel(g.id);
    if (isAdmin(g.id)) return `Creator · ${membersLabel}`;
    if (g.role === 'Moderator') return `Mod · ${membersLabel}`;
    return membersLabel;
  };

  const groupRail = (g: Community, onPress: () => void) => (
    <ProfileMenuGroupRail
      key={g.id}
      tint={g.tint}
      icon={g.icon}
      name={g.name}
      meta={groupMeta(g)}
      onPress={onPress}
    />
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[profileMenuStyles.scroll, { paddingBottom: tabBarPad + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <ProfileMenuIntro>
          {runGroups.length > 0
            ? `You help run ${runGroups.length} group${runGroups.length !== 1 ? 's' : ''} — tap a group to manage it.`
            : 'Manage your groups, people, and alerts.'}
        </ProfileMenuIntro>

        <ProfileMenuSection title="your shelf" kicker first>
          <ProfileMenuLink
            icon="plus"
            label="Create a community"
            onPress={() => navigation.navigate('Create')}
          />
          <ProfileMenuLink
            icon="bookmark"
            label="Saved discussions"
            hint={savedPosts.length > 0 ? `${savedPosts.length} bookmarked` : undefined}
            onPress={() => navigation.navigate('Saved')}
          />
        </ProfileMenuSection>

        <ProfileMenuSection title="communities" kicker bare>
          {runGroups.length > 0 && (
            <ProfileMenuSubsection title="Groups you run">
              {runGroups.map(g => groupRail(
                g,
                () => navigation.navigate('Admin', { communityId: g.id }),
              ))}
            </ProfileMenuSubsection>
          )}

          <ProfileMenuSubsection title="Your groups" showRule={false}>
            {memberGroups.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {runGroups.length > 0
                  ? 'Groups you joined but don\'t run appear here.'
                  : 'No groups joined yet.'}
              </Text>
            ) : (
              <>
                {memberGroups.map(g => groupRail(
                  g,
                  () => navigation.navigate('Group', { communityId: g.id }),
                ))}
                {memberGroups.map(g => (
                  <ProfileMenuLink
                    key={`leave-${g.id}`}
                    icon="close"
                    label={`Leave ${g.name}`}
                    danger
                    onPress={() => handleLeave(g.id)}
                  />
                ))}
              </>
            )}
          </ProfileMenuSubsection>
        </ProfileMenuSection>

        <ProfileMenuSection title="people" kicker>
          <ProfileMenuLink
            icon="clock"
            label="Pending requests"
            hint={totalPending > 0 ? `${totalPending} waiting` : undefined}
            onPress={() => navigation.navigate('PendingRequests')}
          />
          <ProfileMenuLink
            icon="check"
            label="Invitations sent"
            onPress={() => setToast({ msg: 'No active invitations', icon: 'check', tone: 'neutral' })}
          />
        </ProfileMenuSection>

        <ProfileMenuSection title="alerts" kicker>
          <ProfileMenuToggleRow
            icon="bell"
            label="All group posts"
            barTint={colors.primary}
            value={notifyAll}
            onValueChange={setNotifyAll}
          />
          <ProfileMenuToggleRow
            icon="comment"
            label="Mentions & replies"
            barTint={colors.primary}
            value={notifyMentions}
            onValueChange={setNotifyMentions}
          />
          <ProfileMenuLink
            icon="shield"
            label="Community guidelines"
            onPress={() => navigation.navigate('Rules')}
          />
        </ProfileMenuSection>
      </ScrollView>

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  emptyText: { fontSize: 14, lineHeight: 20 },
});
