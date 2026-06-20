import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Share } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/tokens';
import { CompanionAvatar } from '../ui/Avatar';
import { Icon } from '../icons/Icon';
import { Sheet } from '../ui/Sheet';
import type { Companion } from '../../data/mockData';

type Option = {
  id: string;
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
};

async function shareCompanionLink(companionId: string): Promise<boolean> {
  const link = `parul://companion/${companionId}`;
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(link);
      return true;
    } catch {
      return false;
    }
  }
  try {
    await Share.share({ message: link });
    return true;
  } catch {
    return false;
  }
}

type Props = {
  visible: boolean;
  companion: Companion;
  ownPet: boolean;
  following: boolean;
  onClose: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onToggleFollow: () => void;
  onReport: () => void;
  onShareSuccess: () => void;
  onShareError: () => void;
};

export function CompanionOptionsSheet({
  visible,
  companion,
  ownPet,
  following,
  onClose,
  onEdit,
  onRemove,
  onToggleFollow,
  onReport,
  onShareSuccess,
  onShareError,
}: Props) {
  const { colors } = useTheme();
  const [confirmRemove, setConfirmRemove] = useState(false);

  const handleClose = () => {
    setConfirmRemove(false);
    onClose();
  };

  const handleShare = async () => {
    const ok = await shareCompanionLink(companion.id);
    if (ok) onShareSuccess();
    else onShareError();
    handleClose();
  };

  const ownerOptions: Option[] = [
    { id: 'edit', icon: 'edit', label: 'Edit profile', onPress: onEdit },
    { id: 'share', icon: 'forward', label: 'Share profile', onPress: () => { void handleShare(); } },
    {
      id: 'remove',
      icon: 'trash',
      label: 'Remove companion',
      onPress: () => setConfirmRemove(true),
      danger: true,
    },
  ];

  const visitorOptions: Option[] = [
    { id: 'share', icon: 'forward', label: 'Share profile', onPress: () => { void handleShare(); } },
    {
      id: 'follow',
      icon: 'user',
      label: following ? 'Unfollow' : 'Follow',
      onPress: onToggleFollow,
    },
    { id: 'report', icon: 'flag', label: 'Report', onPress: onReport },
  ];

  const options = ownPet ? ownerOptions : visitorOptions;

  return (
    <Sheet
      visible={visible}
      onClose={handleClose}
      title={confirmRemove ? 'Remove companion?' : companion.name}
      contentKey={confirmRemove ? 'confirm' : 'options'}
    >
      <View style={styles.body}>
        {confirmRemove ? (
          <>
            <Text style={[styles.confirmCopy, { color: colors.textSecondary }]}>
              {companion.name} and their posts will be removed from your profile. This cannot be undone.
            </Text>
            <Pressable
              onPress={() => {
                onRemove();
                handleClose();
              }}
              style={({ pressed }) => [styles.dangerBtn, pressed && styles.pressed]}
            >
              <Text style={[styles.dangerBtnText, { color: colors.lost }]}>Remove {companion.name}</Text>
            </Pressable>
            <Pressable
              onPress={() => setConfirmRemove(false)}
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
            >
              <Text style={[styles.cancelBtnText, { color: colors.primary }]}>Cancel</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.hero}>
              <CompanionAvatar companion={companion} size={52} />
              <Text style={[styles.heroHandle, { color: colors.primary }]}>
                @{companion.handle ?? companion.id.slice(0, 8)}
              </Text>
            </View>

            {options.map(option => (
              <Pressable
                key={option.id}
                onPress={() => {
                  if (option.id === 'remove') {
                    option.onPress();
                    return;
                  }
                  if (option.id === 'share') {
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
                  sw={2}
                />
                <Text
                  style={[
                    styles.optionLabel,
                    { color: option.danger ? colors.lost : colors.text },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 4, paddingBottom: 8 },
  hero: { alignItems: 'center', gap: 6, paddingVertical: 8, marginBottom: 4 },
  heroHandle: { ...typography.sectionLabel, textTransform: 'none', fontSize: 13 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  optionLabel: { fontSize: 16, fontWeight: '500' },
  pressed: { opacity: 0.72 },
  confirmCopy: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  dangerBtn: { paddingVertical: 14, alignItems: 'center' },
  dangerBtnText: { fontSize: 16, fontWeight: '700' },
  cancelBtn: { paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { fontSize: 16, fontWeight: '600' },
});
