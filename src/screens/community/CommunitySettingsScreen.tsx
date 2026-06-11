import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Button } from '../../components/ui/Button';
import { Toast, ToastData } from '../../components/ui/Toast';
import { Icon } from '../../components/icons/Icon';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { SettingsRow, SettingsSection } from '../../components/community/CommunityChrome';
import { useCommunityGroups } from '../../context/CommunityGroupsContext';
import type { CommunityStackParamList } from '../../navigation/CommunityNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';

type Nav = NativeStackNavigationProp<CommunityStackParamList, 'Settings'>;

export function CommunitySettingsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const tabBarPad = useTabBarScrollPadding();
  const {
    communities,
    joinedCommunities,
    modCommunities,
    toggleJoin,
    getCommunity,
  } = useCommunityGroups();

  const [notifyPosts, setNotifyPosts] = useState(true);
  const [notifyReplies, setNotifyReplies] = useState(true);
  const [toast, setToast] = useState<ToastData | null>(null);

  const discover = communities.filter(c => !c.joined);

  const handleJoin = (id: string, name: string) => {
    const joining = !getCommunity(id)?.joined;
    toggleJoin(id);
    setToast({
      msg: joining ? `Joined ${name}` : `Left ${name}`,
      icon: joining ? 'check' : 'close',
      tone: joining ? 'success' : 'neutral',
    });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="Community" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: tabBarPad }}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSection title="Community">
          <SettingsRow
            icon="shield"
            label="Guidelines"
            hint="How we keep discussions safe and helpful"
            onPress={() => navigation.navigate('Rules')}
          />
          <SettingsRow
            icon="user"
            label="Members"
            hint="People across your joined groups"
            onPress={() => navigation.navigate('Members')}
          />
          <SettingsRow
            icon="bell"
            label="Notifications"
            hint="Posts, replies, and mentions"
            trailing={(
              <Switch
                value={notifyPosts && notifyReplies}
                onValueChange={v => { setNotifyPosts(v); setNotifyReplies(v); }}
                trackColor={{ false: colors.border, true: colors.primary + '88' }}
                thumbColor="#fff"
              />
            )}
          />
        </SettingsSection>

        <SettingsSection title="My groups">
          {joinedCommunities.length === 0 ? (
            <View style={[styles.emptyGroups, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                You haven't joined any groups yet. Discover one below.
              </Text>
            </View>
          ) : (
            joinedCommunities.map(g => (
              <Pressable
                key={g.id}
                onPress={() => navigation.navigate('Group', { communityId: g.id })}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
              >
                <View style={[styles.groupRow, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
                  <LinearGradient
                    colors={[g.tint, g.tint + 'CC']}
                    style={styles.groupIcon}
                  >
                    <Icon name={g.icon} size={18} color="#fff" />
                  </LinearGradient>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.groupName, { color: colors.text }]} numberOfLines={1}>{g.name}</Text>
                    <Text style={[styles.groupMeta, { color: colors.textSecondary }]}>{g.members} members</Text>
                  </View>
                  {g.role === 'Moderator' && (
                    <View style={[styles.modBadge, { backgroundColor: colors.primary + '14' }]}>
                      <Text style={[styles.modBadgeText, { color: colors.primary }]}>Mod</Text>
                    </View>
                  )}
                  <Icon name="chevronRight" size={18} color={colors.textTertiary} />
                </View>
              </Pressable>
            ))
          )}
        </SettingsSection>

        {discover.length > 0 && (
          <SettingsSection title="Discover">
            {discover.map(g => (
              <View
                key={g.id}
                style={[styles.groupRow, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}
              >
                <LinearGradient colors={[g.tint, g.tint + 'CC']} style={styles.groupIcon}>
                  <Icon name={g.icon} size={18} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.groupName, { color: colors.text }]} numberOfLines={1}>{g.name}</Text>
                  <Text style={[styles.groupMeta, { color: colors.textSecondary }]} numberOfLines={1}>{g.about}</Text>
                </View>
                <Button size="sm" variant="soft" onPress={() => handleJoin(g.id, g.name)}>Join</Button>
              </View>
            ))}
          </SettingsSection>
        )}

        {modCommunities.length > 0 && (
          <SettingsSection title="Manage community">
            <Text style={[styles.adminNote, { color: colors.textSecondary }]}>
              You moderate {modCommunities.length} group{modCommunities.length > 1 ? 's' : ''}.
            </Text>
            {modCommunities.map(g => (
              <SettingsRow
                key={g.id}
                icon="settings"
                label={g.name}
                hint="General, rules, moderation, members, privacy"
                onPress={() => navigation.navigate('Admin', { communityId: g.id })}
              />
            ))}
          </SettingsSection>
        )}
      </ScrollView>

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  emptyGroups: {
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  emptyText: { fontSize: 14, lineHeight: 20 },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    marginBottom: 8,
  },
  groupIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupName: { fontSize: 15, fontWeight: '700' },
  groupMeta: { fontSize: 12.5, marginTop: 2 },
  modBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  modBadgeText: { fontSize: 11, fontWeight: '700' },
  adminNote: { fontSize: 13, paddingHorizontal: 4, marginBottom: 4 },
});
