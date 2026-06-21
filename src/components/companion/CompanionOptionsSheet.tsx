import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { CompanionAvatar } from '../ui/Avatar';
import { Icon } from '../icons/Icon';
import { Sheet } from '../ui/Sheet';
import type { Companion } from '../../data/mockData';
import { shareCompanionProfileLink } from '../../utils/shareLinks';

type Option = {
  id: string;
  icon: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
};

async function shareCompanionLink(companionId: string): Promise<boolean> {
  return shareCompanionProfileLink(companionId);
}

function formatMetaLine(companion: Companion): string | null {
  const breed = companion.breed && companion.breed !== '—' ? companion.breed : null;
  const age = companion.age && companion.age !== '—' ? companion.age : null;
  if (breed && age) return `${breed} · ${age}`;
  return breed ?? age;
}

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
        <Icon
          name={option.icon}
          size={16}
          color={iconColor}
          sw={2}
        />
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

  const primaryOptions: Option[] = ownPet
    ? [
      {
        id: 'edit',
        icon: 'edit',
        label: 'Edit profile',
        subtitle: 'Bio, mood, health…',
        onPress: onEdit,
      },
      {
        id: 'share',
        icon: 'forward',
        label: 'Share profile',
        subtitle: 'Copy link to share',
        onPress: () => { void handleShare(); },
      },
    ]
    : [
      {
        id: 'share',
        icon: 'forward',
        label: 'Share profile',
        subtitle: 'Copy link to share',
        onPress: () => { void handleShare(); },
      },
      {
        id: 'follow',
        icon: 'user',
        label: following ? 'Unfollow' : 'Follow',
        subtitle: following ? 'Stop seeing updates' : 'Follow this companion',
        onPress: onToggleFollow,
      },
      {
        id: 'report',
        icon: 'flag',
        label: 'Report',
        subtitle: 'Help keep Parul safe',
        onPress: onReport,
      },
    ];

  const dangerOptions: Option[] = ownPet
    ? [{
      id: 'remove',
      icon: 'trash',
      label: 'Remove companion',
      subtitle: 'Permanently remove from profile',
      onPress: () => setConfirmRemove(true),
      danger: true,
    }]
    : [];

  const metaLine = formatMetaLine(companion);
  const handle = companion.handle ?? companion.id.slice(0, 8);

  return (
    <Sheet
      visible={visible}
      onClose={handleClose}
      title={confirmRemove ? 'Remove companion?' : undefined}
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
              <CompanionAvatar companion={companion} size={44} />
              <View style={styles.heroText}>
                <Text style={[styles.heroName, { color: colors.text }]} numberOfLines={1}>
                  {companion.name}
                </Text>
                <Text style={[styles.heroMetaLine, { color: colors.textSecondary }]} numberOfLines={1}>
                  @{handle}
                  {metaLine ? ` · ${metaLine}` : ''}
                </Text>
              </View>
            </View>

            {primaryOptions.length > 0 ? (
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
            ) : null}

            {dangerOptions.length > 0 ? (
              <View style={styles.optionsList}>
                {dangerOptions.map((option, index) => (
                  <OptionRow
                    key={option.id}
                    option={option}
                    showDivider={index > 0 || primaryOptions.length > 0}
                    onPress={() => {
                      if (option.id === 'remove') {
                        option.onPress();
                        return;
                      }
                      option.onPress();
                      handleClose();
                    }}
                  />
                ))}
              </View>
            ) : null}
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
