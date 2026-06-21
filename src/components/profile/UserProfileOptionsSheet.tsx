import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../icons/Icon';
import { Sheet } from '../ui/Sheet';
import type { User } from '../../data/mockData';

type Option = {
  id: string;
  icon: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
};

function OptionRow({
  option,
  showDivider,
  onPress,
}: {
  option: Option;
  showDivider: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const iconBg = option.danger ? colors.dangerBg : colors.infoBg;
  const iconColor = option.danger ? colors.danger : colors.primary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionRow,
        showDivider && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Icon name={option.icon} size={16} color={iconColor} sw={2} />
      </View>
      <View style={styles.optionCopy}>
        <Text
          style={[
            styles.optionLabel,
            { color: option.danger ? colors.lost : colors.text },
          ]}
        >
          {option.label}
        </Text>
        {option.subtitle ? (
          <Text style={[styles.optionSubtitle, { color: colors.textTertiary }]} numberOfLines={1}>
            {option.subtitle}
          </Text>
        ) : null}
      </View>
      <Icon name="chevronRight" size={14} color={colors.textTertiary} />
    </Pressable>
  );
}

type Props = {
  visible: boolean;
  user: User;
  isBlocked: boolean;
  onClose: () => void;
  onShare: () => void;
  onReport: () => void;
  onBlock: () => void;
  onUnblock: () => void;
};

export function UserProfileOptionsSheet({
  visible,
  user,
  isBlocked,
  onClose,
  onShare,
  onReport,
  onBlock,
  onUnblock,
}: Props) {
  const { colors } = useTheme();
  const [confirmBlock, setConfirmBlock] = useState(false);

  const handleClose = () => {
    setConfirmBlock(false);
    onClose();
  };

  const primaryOptions: Option[] = [
    {
      id: 'share',
      icon: 'forward',
      label: 'Share profile',
      subtitle: 'Copy link to share',
      onPress: onShare,
    },
    {
      id: 'report',
      icon: 'flag',
      label: 'Report',
      subtitle: 'Help keep Parul safe',
      onPress: onReport,
    },
  ];

  const dangerOptions: Option[] = isBlocked
    ? [{
      id: 'unblock',
      icon: 'block',
      label: `Unblock ${user.name.split(' ')[0]}`,
      subtitle: 'Allow messages and profile again',
      onPress: onUnblock,
    }]
    : [{
      id: 'block',
      icon: 'block',
      label: `Block ${user.name.split(' ')[0]}`,
      subtitle: 'Stop messages and hide their profile',
      onPress: () => setConfirmBlock(true),
      danger: true,
    }];

  return (
    <Sheet
      visible={visible}
      onClose={handleClose}
      title={confirmBlock ? 'Block user?' : undefined}
      contentKey={confirmBlock ? 'confirm-block' : 'options'}
    >
      <View style={styles.body}>
        {confirmBlock ? (
          <>
            <Text style={[styles.confirmCopy, { color: colors.textSecondary }]}>
              {user.name} won&apos;t be able to message you. You can unblock them from Settings later.
            </Text>
            <Pressable
              onPress={() => {
                onBlock();
                handleClose();
              }}
              style={({ pressed }) => [styles.dangerBtn, pressed && styles.pressed]}
            >
              <Text style={[styles.dangerBtnText, { color: colors.lost }]}>Block {user.name}</Text>
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
              <Avatar user={user} size={44} />
              <View style={styles.heroText}>
                <Text style={[styles.heroName, { color: colors.text }]} numberOfLines={1}>
                  {user.name}
                </Text>
                <Text style={[styles.heroMetaLine, { color: colors.textSecondary }]} numberOfLines={1}>
                  @{user.handle}
                  {user.location ? ` · ${user.location}` : ''}
                </Text>
              </View>
            </View>

            <View style={styles.optionsList}>
              {primaryOptions.map((option, index) => (
                <OptionRow
                  key={option.id}
                  option={option}
                  showDivider={index > 0}
                  onPress={() => {
                    if (option.id === 'share') {
                      option.onPress();
                      return;
                    }
                    option.onPress();
                    handleClose();
                  }}
                />
              ))}
            </View>

            <View style={styles.optionsList}>
              {dangerOptions.map((option, index) => (
                <OptionRow
                  key={option.id}
                  option={option}
                  showDivider={index > 0 || primaryOptions.length > 0}
                  onPress={() => {
                    if (option.id === 'block') {
                      option.onPress();
                      return;
                    }
                    option.onPress();
                    handleClose();
                  }}
                />
              ))}
            </View>
          </>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 4,
    paddingHorizontal: 20,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 8,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  heroName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  heroMetaLine: {
    fontSize: 13,
    fontWeight: '500',
  },
  optionsList: {
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 0,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionCopy: { flex: 1, minWidth: 0, gap: 2 },
  optionLabel: { fontSize: 15, fontWeight: '600' },
  optionSubtitle: { fontSize: 12.5 },
  pressed: { opacity: 0.72 },
  confirmCopy: { fontSize: 14, lineHeight: 20, marginBottom: 8, textAlign: 'center' },
  dangerBtn: { paddingVertical: 14, alignItems: 'center' },
  dangerBtnText: { fontSize: 16, fontWeight: '700' },
  cancelBtn: { paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { fontSize: 16, fontWeight: '600' },
});
