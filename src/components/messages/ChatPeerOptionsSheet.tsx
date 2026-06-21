import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/tokens';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../icons/Icon';
import { Sheet } from '../ui/Sheet';
import type { User } from '../../data/mockData';
import { useUserOnlineStatus } from '../../hooks/useUserPrivacyFlags';

type Props = {
  visible: boolean;
  peer: User;
  onClose: () => void;
  onViewProfile: () => void;
  onBlock: () => void;
  onReport: () => void;
  muted: boolean;
  onMuteChange: (muted: boolean) => void;
};

type Option = {
  id: string;
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
};

export function ChatPeerOptionsSheet({
  visible,
  peer,
  onClose,
  onViewProfile,
  onBlock,
  onReport,
  muted,
  onMuteChange,
}: Props) {
  const { colors } = useTheme();
  const [confirmBlock, setConfirmBlock] = useState(false);
  const peerIsOnline = useUserOnlineStatus(peer.id);

  const handleClose = () => {
    setConfirmBlock(false);
    onClose();
  };

  const options: Option[] = [
    { id: 'profile', icon: 'user', label: 'View profile', onPress: onViewProfile },
    {
      id: 'mute',
      icon: 'bell',
      label: muted ? 'Unmute conversation' : 'Mute conversation',
      onPress: () => onMuteChange(!muted),
    },
    { id: 'report', icon: 'flag', label: 'Report', onPress: onReport },
    {
      id: 'block',
      icon: 'block',
      label: `Block ${peer.name.split(' ')[0]}`,
      onPress: () => setConfirmBlock(true),
      danger: true,
    },
  ];

  return (
    <Sheet
      visible={visible}
      onClose={handleClose}
      title={confirmBlock ? 'Block user?' : peer.name}
      contentKey={confirmBlock ? 'confirm' : 'options'}
    >
      <View style={styles.body}>
        {confirmBlock ? (
          <>
            <Text style={[styles.confirmCopy, { color: colors.textSecondary }]}>
              {peer.name} won&apos;t be able to message you. You can unblock them from Settings later.
            </Text>
            <Pressable
              onPress={() => {
                onBlock();
                handleClose();
              }}
              style={({ pressed }) => [styles.dangerBtn, pressed && styles.pressed]}
            >
              <Text style={[styles.dangerBtnText, { color: colors.lost }]}>Block {peer.name}</Text>
            </Pressable>
            <Pressable
              onPress={() => setConfirmBlock(false)}
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
            >
              <Text style={[styles.cancelBtnText, { color: colors.primary }]}>Cancel</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.hero}>
              <Avatar user={peer} size={52} showOnlineIndicator />
              <Text style={[styles.heroHandle, { color: colors.primary }]}>@{peer.handle}</Text>
              {peerIsOnline ? (
                <Text style={[styles.heroOnline, { color: '#22C55E' }]}>Online</Text>
              ) : null}
              {peer.loc ? (
                <Text style={[styles.heroMeta, { color: colors.textTertiary }]}>{peer.loc}</Text>
              ) : null}
            </View>

            {options.map(option => (
              <Pressable
                key={option.id}
                onPress={() => {
                  if (option.id === 'block') {
                    option.onPress();
                    return;
                  }
                  option.onPress();
                  handleClose();
                }}
                style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}
              >
                <Icon
                  name={option.icon}
                  size={18}
                  color={option.danger ? colors.lost : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.optionLabel,
                    { color: option.danger ? colors.lost : colors.text },
                  ]}
                >
                  {option.label}
                </Text>
                {option.id !== 'block' && (
                  <Icon name="chevronRight" size={14} color={colors.textTertiary} />
                )}
              </Pressable>
            ))}
          </>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingBottom: 8, gap: 4 },
  hero: { alignItems: 'center', gap: 4, paddingVertical: 8, marginBottom: 8 },
  heroHandle: { ...typography.caption, fontSize: 13, fontWeight: '600' },
  heroOnline: { ...typography.caption, fontSize: 12, fontWeight: '600' },
  heroMeta: { ...typography.meta, fontSize: 12 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  optionLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  confirmCopy: {
    ...typography.small,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  dangerBtn: { paddingVertical: 14, alignItems: 'center' },
  dangerBtnText: { fontSize: 16, fontWeight: '700' },
  cancelBtn: { paddingVertical: 10, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.55 },
});
