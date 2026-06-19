import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing } from '../../theme/tokens';
import { Sheet } from '../ui/Sheet';
import { Icon } from '../icons/Icon';

export type CircleAttachAction =
  | 'photo_library'
  | 'camera'
  | 'file';

type AttachOption = {
  id: CircleAttachAction;
  label: string;
  hint: string;
  icon: string;
};

const OPTIONS: AttachOption[] = [
  { id: 'photo_library', label: 'Photo library', hint: 'Choose from your gallery', icon: 'image' },
  { id: 'camera', label: 'Take photo', hint: 'Open the camera', icon: 'camera' },
  { id: 'file', label: 'Attach file', hint: 'PDF, documents, and more', icon: 'paperclip' },
];

function AttachRow({
  option,
  onPress,
}: {
  option: AttachOption;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderColor: colors.border, opacity: pressed ? 0.82 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={option.label}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.primary + '14' }]}>
        <Icon name={option.icon} size={18} color={colors.primary} sw={2} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{option.label}</Text>
        <Text style={[styles.rowHint, { color: colors.textSecondary }]} numberOfLines={1}>
          {option.hint}
        </Text>
      </View>
      <Icon name="chevronRight" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

export function CircleAttachSheet({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (action: CircleAttachAction) => void;
}) {
  const { colors } = useTheme();

  return (
    <Sheet visible={visible} onClose={onClose} title="Add attachment">
      <View style={styles.body}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Share photos or files with your circle
        </Text>
        {OPTIONS.map(option => (
          <AttachRow
            key={option.id}
            option={option}
            onPress={() => {
              onSelect(option.id);
              onClose();
            }}
          />
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowBody: { flex: 1, minWidth: 0, gap: 2 },
  rowLabel: { fontSize: 15, fontWeight: '700' },
  rowHint: { fontSize: 13 },
});
