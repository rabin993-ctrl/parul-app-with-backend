import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { Avatar } from '../../components/ui/Avatar';
import { Empty } from '../../components/ui/Empty';
import { Toast, ToastData } from '../../components/ui/Toast';
import { ProfileSubHeader } from '../../components/profile/ProfileChrome';
import {
  ProfileMenuSection,
  profileMenuStyles,
} from '../../components/profile/ProfileSettingsRows';
import { useUserPrivacy } from '../../context/UserPrivacyContext';
import { users } from '../../data/mockData';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';

export function ProfileBlockedUsersScreen() {
  const { colors } = useTheme();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const { blockedUserIds, unblockUser } = useUserPrivacy();
  const [toast, setToast] = useState<ToastData | null>(null);

  const blockedUsers = useMemo(
    () => blockedUserIds
      .map(id => users[id])
      .filter(Boolean),
    [blockedUserIds],
  );

  const handleUnblock = (userId: string, name: string) => {
    unblockUser(userId);
    setToast({ msg: `${name} unblocked`, icon: 'check', tone: 'success' });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader title="Blocked users" />

      <ScrollView
        contentContainerStyle={[profileMenuStyles.scroll, styles.scroll, { paddingBottom: tabBarPad + 32 }]}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
      >
        {blockedUsers.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Empty
              icon="block"
              title="No blocked users"
              body="People you block can't message you or see your profile. Block someone from a chat or their profile."
            />
          </View>
        ) : (
          <ProfileMenuSection title="Blocked" first>
            {blockedUsers.map(user => (
              <View key={user.id} style={styles.blockedRow}>
                <Avatar user={user} size={40} />
                <View style={profileMenuStyles.menuLinkBody}>
                  <Text style={[profileMenuStyles.menuLinkLabel, { color: colors.text }]}>
                    {user.name}
                  </Text>
                  <Text style={[profileMenuStyles.menuLinkHint, { color: colors.textTertiary }]}>
                    @{user.handle}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleUnblock(user.id, user.name)}
                  hitSlop={8}
                  style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}
                >
                  <Text style={[styles.unblockLabel, { color: colors.primary }]}>Unblock</Text>
                </Pressable>
              </View>
            ))}
          </ProfileMenuSection>
        )}
      </ScrollView>

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1 },
  emptyWrap: { paddingTop: 24 },
  blockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  unblockLabel: { fontSize: 13, fontWeight: '700' },
});
