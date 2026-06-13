import React, { useState } from 'react';
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
import { useUserProfile } from '../../hooks/useUserProfile';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';

function BlockedUserRow({
  userId,
  onUnblock,
}: {
  userId: string;
  onUnblock: (userId: string, name: string) => void;
}) {
  const { colors } = useTheme();
  const profile = useUserProfile(userId);
  const name = profile?.name ?? userId.slice(0, 8);
  const handle = profile?.handle ?? userId.slice(0, 8);
  const user = { id: userId, name, tint: profile?.tint ?? '#888888' };

  return (
    <View style={styles.blockedRow}>
      <Avatar user={user} size={40} />
      <View style={profileMenuStyles.menuLinkBody}>
        <Text style={[profileMenuStyles.menuLinkLabel, { color: colors.text }]}>
          {name}
        </Text>
        <Text style={[profileMenuStyles.menuLinkHint, { color: colors.textTertiary }]}>
          @{handle}
        </Text>
      </View>
      <Pressable
        onPress={() => onUnblock(userId, name)}
        hitSlop={8}
        style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}
      >
        <Text style={[styles.unblockLabel, { color: colors.primary }]}>Unblock</Text>
      </Pressable>
    </View>
  );
}

export function ProfileBlockedUsersScreen() {
  const { colors } = useTheme();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const { blockedUserIds, unblockUser } = useUserPrivacy();
  const [toast, setToast] = useState<ToastData | null>(null);

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
        {blockedUserIds.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Empty
              icon="block"
              title="No blocked users"
              body="People you block can't message you or see your profile. Block someone from a chat or their profile."
            />
          </View>
        ) : (
          <ProfileMenuSection title="Blocked" first>
            {blockedUserIds.map(id => (
              <BlockedUserRow key={id} userId={id} onUnblock={handleUnblock} />
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
