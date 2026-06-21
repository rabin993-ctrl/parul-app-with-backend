import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/tokens';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../icons/Icon';
import { Sheet } from '../ui/Sheet';
import {
  circleMemberToAvatarUser,
  type CircleMemberProfile,
} from '../../hooks/useCircleMembers';
import { useUserOnlineStatus } from '../../hooks/useUserPrivacyFlags';

type Option = {
  id: string;
  icon: string;
  label: string;
  onPress: () => void;
};

export function CircleChatMemberSheet({
  visible,
  member,
  onClose,
  onSendMessage,
  onViewProfile,
}: {
  visible: boolean;
  member: CircleMemberProfile | null;
  onClose: () => void;
  onSendMessage: () => void;
  onViewProfile: () => void;
}) {
  const { colors } = useTheme();
  const memberIsOnline = useUserOnlineStatus(member?.userId);

  if (!member) return null;

  const avatarUser = circleMemberToAvatarUser(member);
  const options: Option[] = [
    { id: 'message', icon: 'send', label: 'Send personal message', onPress: onSendMessage },
    { id: 'profile', icon: 'user', label: 'View profile', onPress: onViewProfile },
  ];

  return (
    <Sheet visible={visible} onClose={onClose} title={member.name}>
      <View style={styles.body}>
        <View style={styles.hero}>
          <Avatar user={avatarUser} size={52} showOnlineIndicator />
          <Text style={[styles.heroHandle, { color: colors.primary }]}>@{member.handle}</Text>
          {memberIsOnline ? (
            <Text style={[styles.heroOnline, { color: '#22C55E' }]}>Online</Text>
          ) : null}
        </View>

        {options.map(option => (
          <Pressable
            key={option.id}
            onPress={() => {
              option.onPress();
              onClose();
            }}
            style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={option.label}
          >
            <Icon name={option.icon} size={18} color={colors.textSecondary} />
            <Text style={[styles.optionLabel, { color: colors.text }]}>{option.label}</Text>
            <Icon name="chevronRight" size={14} color={colors.textTertiary} />
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingBottom: 8, gap: 4 },
  hero: { alignItems: 'center', gap: 4, paddingVertical: 8, marginBottom: 8 },
  heroHandle: { ...typography.caption, fontSize: 13, fontWeight: '600' },
  heroOnline: { ...typography.caption, fontSize: 12, fontWeight: '600' },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  optionLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.55 },
});
