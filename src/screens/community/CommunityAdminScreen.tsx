import React, { useMemo, useState } from 'react';
import {
  ScrollView, StyleSheet, Text, View, TextInput, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Icon } from '../../components/icons/Icon';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Toast, ToastData } from '../../components/ui/Toast';
import { ProfileSubHeader } from '../../components/profile/ProfileChrome';
import {
  ProfileMenuAccordion,
  ProfileMenuIntro,
  ProfileMenuLink,
  ProfileMenuToggleRow,
  profileMenuStyles,
} from '../../components/profile/ProfileSettingsRows';
import { useCommunityGroups } from '../../context/CommunityGroupsContext';
import { useCommunityMembersWithProfiles } from '../../hooks/useCommunityMembersWithProfiles';
import { COMMUNITY_TOPIC_OPTIONS } from '../../data/communityPosts';
import type { CommunityStackParamList } from '../../navigation/CommunityNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
const MEMBER_PREVIEW = 3;

type Route = RouteProp<CommunityStackParamList, 'Admin'>;
type Nav = NativeStackNavigationProp<CommunityStackParamList, 'Admin'>;

export function CommunityAdminScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { communityId } = useRoute<Route>().params;
  const tabBarPad = useTabBarScrollPadding();
  const {
    getCommunity,
    getAdminSettings,
    updateAdminSettings,
    getPendingRequestCount,
    getCommunityMemberCount,
    removeCommunityMember,
    isAdmin,
    isMod,
  } = useCommunityGroups();
  const { members, isSelf } = useCommunityMembersWithProfiles(communityId);

  const community = getCommunity(communityId);
  const [settings, setSettings] = useState(() => getAdminSettings(communityId));
  const [toast, setToast] = useState<ToastData | null>(null);

  if (!community || !isMod(communityId)) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <ProfileSubHeader onBack={() => navigation.goBack()} />
        <View style={styles.missing}>
          <Text style={{ color: colors.textSecondary }}>Manage access only.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const creator = isAdmin(communityId);

  const patch = (p: Partial<typeof settings>) => {
    setSettings(prev => ({ ...prev, ...p }));
  };

  const save = () => {
    updateAdminSettings(communityId, settings);
    setToast({ msg: 'Settings saved', icon: 'check', tone: 'success' });
  };

  const toggleTopic = (id: string) => {
    const enabled = settings.enabledTopics.includes(id);
    const next = enabled
      ? (settings.enabledTopics.length > 1 ? settings.enabledTopics.filter(t => t !== id) : settings.enabledTopics)
      : [...settings.enabledTopics, id];
    patch({ enabledTopics: next });
  };

  const pending = getPendingRequestCount(communityId);

  const handleRemoveMember = (userId: string, name: string) => {
    if (removeCommunityMember(communityId, userId)) {
      setToast({ msg: `Removed ${name} from the group`, icon: 'close', tone: 'neutral' });
    }
  };

  const openMemberProfile = (userId: string) => {
    navigation.getParent()?.navigate('Circles', {
      screen: 'UserProfile',
      params: { userId },
    });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[profileMenuStyles.scroll, { paddingBottom: tabBarPad + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <LinearGradient
            colors={[community.tint, community.tint + 'AA']}
            style={styles.heroIcon}
          >
            <Icon name={community.icon} size={30} color="#fff" fill="#fff" />
          </LinearGradient>
          <Text style={[styles.heroName, { color: colors.text }]}>{community.name}</Text>
          <Text style={[styles.heroBadge, { color: community.tint }]}>
            {creator ? 'Creator' : 'Moderator'}
          </Text>
        </View>

        <ProfileMenuIntro>
          Shape how your group looks, who joins, and what gets posted.
        </ProfileMenuIntro>

        <ProfileMenuAccordion
          items={[
            ...(creator ? [{
              id: 'identity',
              title: 'Identity',
              content: (
                <View style={profileMenuStyles.linkStack}>
                  <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Name</Text>
                  <TextInput
                    value={settings.name}
                    onChangeText={v => patch({ name: v })}
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }]}
                  />
                  <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>About</Text>
                  <TextInput
                    value={settings.about}
                    onChangeText={v => patch({ about: v })}
                    multiline
                    style={[styles.input, styles.inputMulti, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }]}
                  />
                </View>
              ),
            }] : []),
            {
              id: 'topics',
              title: 'Topics',
              content: (
                <View style={profileMenuStyles.linkStack}>
                  <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
                    Adoption posts belong in the Adoption tab.
                  </Text>
                  <View style={styles.topicWrap}>
                    {COMMUNITY_TOPIC_OPTIONS.map(cat => {
                      const on = settings.enabledTopics.includes(cat.id);
                      return (
                        <Pressable
                          key={cat.id}
                          onPress={() => toggleTopic(cat.id)}
                          style={[
                            styles.topicChip,
                            {
                              backgroundColor: on ? cat.tint + '18' : colors.surface2,
                              borderColor: on ? cat.tint + '55' : 'transparent',
                            },
                          ]}
                        >
                          <Text style={{ color: on ? cat.tint : colors.textSecondary, fontWeight: '600', fontSize: 12.5 }}>
                            {cat.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ),
            },
            {
              id: 'posting',
              title: 'Posting rules',
              content: (
                <View style={profileMenuStyles.linkStack}>
                  <ProfileMenuToggleRow
                    icon="image"
                    label="Photo required for Lost & Found"
                    barTint={community.tint}
                    value={settings.requirePhotoLostFound}
                    onValueChange={v => patch({ requirePhotoLostFound: v })}
                  />
                  <ProfileMenuToggleRow
                    icon="forward"
                    label="Allow links in posts"
                    barTint={community.tint}
                    value={settings.allowLinks}
                    onValueChange={v => patch({ allowLinks: v })}
                  />
                  <ProfileMenuToggleRow
                    icon="clock"
                    label="Post approval queue"
                    barTint={community.tint}
                    value={settings.postApproval}
                    onValueChange={v => patch({ postApproval: v })}
                  />
                </View>
              ),
            },
            {
              id: 'members',
              title: 'Members & access',
              content: (
                <View style={profileMenuStyles.linkStack}>
                  <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Join policy</Text>
                  <View style={styles.policyRow}>
                    {(['open', 'request', 'invite'] as const).map(p => {
                      const on = settings.joinPolicy === p;
                      return (
                        <Pressable
                          key={p}
                          onPress={() => patch({ joinPolicy: p })}
                          style={[
                            styles.policyChip,
                            {
                              backgroundColor: on ? community.tint + '18' : colors.surface2,
                              borderColor: on ? community.tint + '55' : 'transparent',
                            },
                          ]}
                        >
                          <Text style={[styles.policyText, { color: on ? community.tint : colors.textSecondary }]}>
                            {p === 'open' ? 'Open' : p === 'request' ? 'Request' : 'Invite'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={[styles.fieldLabel, { color: colors.textTertiary, marginTop: 8 }]}>
                    Members · {getCommunityMemberCount(communityId)}
                  </Text>
                  <View style={styles.memberList}>
                    {members.slice(0, MEMBER_PREVIEW).map((user, index, arr) => {
                      const selfMember = isSelf(user.id);
                      const isLast = index === arr.length - 1;
                      return (
                        <View
                          key={user.id}
                          style={[
                            styles.memberRow,
                            !isLast && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
                          ]}
                        >
                          <Pressable
                            onPress={() => openMemberProfile(user.id)}
                            style={({ pressed }) => [
                              styles.memberMain,
                              pressed && { opacity: 0.72 },
                            ]}
                          >
                            <Avatar user={{ id: user.id, name: user.name, tint: user.tint ?? '#F2972E' }} size={40} />
                            <View style={styles.memberBody}>
                              <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                                {user.name}
                                {selfMember ? ' (you)' : ''}
                              </Text>
                              <Text style={[styles.memberMeta, { color: colors.textTertiary }]} numberOfLines={1}>
                                @{user.handle}
                              </Text>
                            </View>
                          </Pressable>
                          {!selfMember && (
                            <Pressable
                              onPress={() => handleRemoveMember(user.id, user.name)}
                              hitSlop={8}
                              accessibilityLabel={`Remove ${user.name}`}
                              style={({ pressed }) => [
                                styles.removeBtn,
                                { backgroundColor: colors.surface2, opacity: pressed ? 0.7 : 1 },
                              ]}
                            >
                              <Icon name="close" size={14} color={colors.danger} />
                            </Pressable>
                          )}
                        </View>
                      );
                    })}
                  </View>
                  {members.length > 0 && (
                    <Pressable
                      onPress={() => navigation.navigate('GroupMembers', { communityId })}
                      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginTop: 4 }]}
                    >
                      <Text style={[styles.showAll, { color: community.tint }]}>
                        Show all…
                      </Text>
                    </Pressable>
                  )}
                  {pending > 0 && (
                    <ProfileMenuLink
                      icon="clock"
                      label="Pending requests"
                      hint={`${pending} waiting`}
                      onPress={() => navigation.navigate('PendingRequests')}
                    />
                  )}
                  <ProfileMenuLink
                    icon="user"
                    label="Invite members"
                    onPress={() => setToast({ msg: 'Invites coming soon', icon: 'sparkle', tone: 'primary' })}
                  />
                  <ProfileMenuLink
                    icon="flag"
                    label="Reported posts"
                    hint="0 pending"
                    onPress={() => setToast({ msg: 'No reports', icon: 'check', tone: 'neutral' })}
                  />
                </View>
              ),
            },
            ...(creator ? [{
              id: 'privacy',
              title: 'Privacy & visibility',
              content: (
                <View style={profileMenuStyles.linkStack}>
                  <ProfileMenuToggleRow
                    icon="shield"
                    label="Members-only feed"
                    barTint={community.tint}
                    value={settings.membersOnly}
                    onValueChange={v => patch({ membersOnly: v })}
                  />
                  <ProfileMenuToggleRow
                    icon="mapPin"
                    label="Show location on posts"
                    barTint={community.tint}
                    value={settings.showLocation}
                    onValueChange={v => patch({ showLocation: v })}
                  />
                  <ProfileMenuToggleRow
                    icon="search"
                    label="Discoverable in search"
                    barTint={community.tint}
                    value={settings.discoverable}
                    onValueChange={v => patch({ discoverable: v })}
                  />
                </View>
              ),
            }] : []),
          ]}
        />
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
        <Button full variant="primary" onPress={save}>Save changes</Button>
      </View>

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', gap: 6, marginBottom: 4, paddingTop: 4 },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3, textAlign: 'center' },
  heroBadge: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  fieldHint: { fontSize: 13, lineHeight: 18 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  topicWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  topicChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  policyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  policyChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  policyText: { fontSize: 13, fontWeight: '700' },
  memberList: { gap: 0 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  memberMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  memberBody: { flex: 1, gap: 2, minWidth: 0 },
  memberName: { fontSize: 14, fontWeight: '600' },
  memberMeta: { fontSize: 12.5 },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showAll: { fontSize: 13, fontWeight: '700' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
