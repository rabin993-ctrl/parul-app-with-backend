import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/icons/Icon';
import { Toast, ToastData } from '../../components/ui/Toast';
import { ProfileSubHeader } from '../../components/profile/ProfileChrome';
import {
  ProfileMenuIntro,
  ProfileMenuSubsection,
  profileMenuStyles,
} from '../../components/profile/ProfileSettingsRows';
import { useCommunityGroups } from '../../context/CommunityGroupsContext';
import type { CommunityStackParamList } from '../../navigation/CommunityNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
type Nav = NativeStackNavigationProp<CommunityStackParamList, 'PendingRequests'>;

export function CommunityPendingRequestsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const tabBarPad = useTabBarScrollPadding();
  const { modCommunities, getPendingRequests, acceptJoinRequest, declineJoinRequest } = useCommunityGroups();
  const [toast, setToast] = useState<ToastData | null>(null);

  const groupsWithRequests = useMemo(
    () => modCommunities
      .map(g => ({ community: g, requests: getPendingRequests(g.id) }))
      .filter(x => x.requests.length > 0),
    [modCommunities, getPendingRequests],
  );

  const openProfile = (userId: string) => {
    navigation.getParent()?.navigate('Circles', {
      screen: 'UserProfile',
      params: { userId },
    });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader title="Pending requests" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[profileMenuStyles.scroll, { paddingBottom: tabBarPad + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <ProfileMenuIntro>
          Review join requests for the groups you run or moderate.
        </ProfileMenuIntro>

        {groupsWithRequests.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            No pending requests right now.
          </Text>
        ) : (
          groupsWithRequests.map(({ community, requests }) => (
            <ProfileMenuSubsection
              key={community.id}
              title={community.name}
              showRule={false}
            >
              {requests.map(req => {
                const profile = req.authorProfile;
                const displayName = profile?.name ?? profile?.handle ?? req.userId.slice(0, 8);
                const displayHandle = profile?.handle ?? req.userId.slice(0, 8);
                const avatarUser = { id: req.userId, name: displayName, tint: profile?.tint ?? '#F2972E' };
                return (
                  <Pressable
                    key={req.id}
                    onPress={() => openProfile(req.userId)}
                    style={({ pressed }) => [
                      styles.requestRow,
                      { opacity: pressed ? 0.72 : 1 },
                    ]}
                  >
                    <View style={[styles.requestBar, { backgroundColor: community.tint }]} />
                    <Avatar user={avatarUser} size={40} />
                    <View style={styles.requestBody}>
                      <Text style={[styles.requestName, { color: colors.text }]}>{displayName}</Text>
                      <Text style={[styles.requestMeta, { color: colors.textTertiary }]}>
                        @{displayHandle} · {req.time}
                      </Text>
                    </View>
                    <View style={styles.requestActions}>
                      <Pressable
                        onPress={() => {
                          acceptJoinRequest(req.id);
                          setToast({ msg: `Approved ${displayName}`, icon: 'check', tone: 'success' });
                        }}
                        style={[styles.actionBtn, { backgroundColor: colors.success + '18' }]}
                        hitSlop={4}
                      >
                        <Icon name="check" size={14} color={colors.success} />
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          declineJoinRequest(req.id);
                          setToast({ msg: 'Request declined', icon: 'close', tone: 'neutral' });
                        }}
                        style={[styles.actionBtn, { backgroundColor: colors.surface2 }]}
                        hitSlop={4}
                      >
                        <Icon name="close" size={14} color={colors.textTertiary} />
                      </Pressable>
                    </View>
                  </Pressable>
                );
              })}
            </ProfileMenuSubsection>
          ))
        )}
      </ScrollView>

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  empty: { fontSize: 14, lineHeight: 20, marginTop: 8 },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  requestBar: { width: 2, alignSelf: 'stretch', borderRadius: 1, minHeight: 40 },
  requestBody: { flex: 1, minWidth: 0, gap: 2 },
  requestName: { fontSize: 14, fontWeight: '600' },
  requestMeta: { fontSize: 12.5 },
  requestActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
