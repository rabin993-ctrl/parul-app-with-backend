import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { CompanionAvatar } from '../ui/Avatar';
import { getPetAvatarFrameSize } from '../ui/PawPadShape';
import { AdoptionStatusTag } from './AdoptionStatusTag';
import type { AdoptionRecord } from '../../data/adoptionRecords';
import type { ProfileAdoptionRowDisplay } from '../../utils/profileAdoptionDisplay';

const AVATAR = 48;
const FRAME = getPetAvatarFrameSize(AVATAR);

export function ProfileAdoptionShowcaseRow({
  record,
  display,
  onPress,
}: {
  record: AdoptionRecord;
  display: ProfileAdoptionRowDisplay;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${display.petName}, ${display.statusLabel}`}
      style={({ pressed }) => [
        styles.row,
        { opacity: pressed ? 0.72 : 1 },
        Platform.OS === 'web' && styles.rowWeb,
      ]}
    >
      <View style={[styles.avatarWrap, { width: FRAME.width }]}>
        <CompanionAvatar
          pet={{ icon: record.icon, tint: record.tint, name: record.petName }}
          size={AVATAR}
        />
      </View>

      <View style={styles.meta}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {display.petName}
        </Text>
        <Text style={[styles.subline, { color: colors.textTertiary }]} numberOfLines={1}>
          {display.subline}
        </Text>
      </View>

      <AdoptionStatusTag label={display.statusLabel} tone={display.statusTone} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  rowWeb: { cursor: 'pointer' as const },
  avatarWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
    flexShrink: 0,
  },
  meta: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
  subline: {
    fontSize: 12.5,
    fontWeight: '500',
  },
});
