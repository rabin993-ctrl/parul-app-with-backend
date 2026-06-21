import React from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing } from '../../theme/tokens';
import { webFieldInputStyle } from '../../theme/webInput';
import { Icon } from '../icons/Icon';
import { Avatar } from '../ui/Avatar';
import { useCurrentUserProfile } from '../../context/CurrentUserProfileContext';
import {
  formatRescueUpdateTime,
  RESCUE_STATUS_META,
  type RescueCase,
  type RescueStatus,
} from '../../data/profileData';
import { RescueUpdatePhotoPicker } from './RescueUpdatePhotoPicker';
import type { PickedAsset } from '../../hooks/useMediaPicker';

const STATUS_ORDER = ['active', 'under_treatment', 'recovered'] as const;
type RescueStatusKey = typeof STATUS_ORDER[number];

type Props = {
  item: RescueCase;
  text: string;
  onTextChange: (value: string) => void;
  selectedStatus: RescueStatusKey;
  onStatusChange: (status: RescueStatusKey) => void;
  photos: PickedAsset[];
  onPhotosChange: (photos: PickedAsset[]) => void;
  showPhotoRequiredHint?: boolean;
};

export function RescuePostUpdateForm({
  item,
  text,
  onTextChange,
  selectedStatus,
  onStatusChange,
  photos,
  onPhotosChange,
  showPhotoRequiredHint = false,
}: Props) {
  const { colors } = useTheme();
  const { me } = useCurrentUserProfile();
  const autoDate = formatRescueUpdateTime();

  return (
    <View style={styles.wrap}>
      <View style={styles.authorRow}>
        {me ? <Avatar user={me} size={40} /> : null}
        <View style={styles.authorCopy}>
          <Text style={[styles.authorName, { color: colors.text }]}>
            Posting for {item.name}
          </Text>
          <View style={[styles.updateBadge, { backgroundColor: colors.successBg, borderColor: colors.border }]}>
            <Icon name="shield" size={12} color={colors.success} />
            <Text style={[styles.updateBadgeText, { color: colors.success }]}>Rescue update</Text>
            <Text style={[styles.updateBadgeMeta, { color: colors.textTertiary }]}>· {autoDate}</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.sectionLabel, styles.firstSectionLabel, { color: colors.textSecondary }]}>
        UPDATE · REQUIRED
      </Text>
      <TextInput
        value={text}
        onChangeText={onTextChange}
        placeholder="Vet visit, appetite, mood, next steps..."
        placeholderTextColor={colors.textTertiary}
        multiline
        textAlignVertical="top"
        style={[
          styles.textBox,
          styles.updateInput,
          { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 },
          webFieldInputStyle,
        ]}
      />

      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>STATUS</Text>
      <View style={styles.chipRow}>
        {STATUS_ORDER.map(statusKey => {
          const meta = RESCUE_STATUS_META[statusKey as RescueStatus];
          const active = selectedStatus === statusKey;
          return (
            <Pressable
              key={statusKey}
              onPress={() => onStatusChange(statusKey)}
              style={[
                styles.chip,
                {
                  borderColor: active ? meta.tint : colors.border,
                  backgroundColor: active ? meta.tint + '14' : colors.surface,
                },
              ]}
            >
              <Icon name={meta.icon} size={13} color={active ? meta.tint : colors.textSecondary} />
              <Text style={[styles.chipText, { color: active ? colors.text : colors.textSecondary }, active && { fontWeight: '700' }]}>
                {meta.shortLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.photoSection}>
        <RescueUpdatePhotoPicker
          photos={photos}
          onChange={onPhotosChange}
          showRequiredHint={showPhotoRequiredHint}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 0 },
  authorRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  authorCopy: { flex: 1, gap: 6, paddingTop: 2 },
  authorName: { fontSize: 15.5, fontWeight: '700' },
  updateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  updateBadgeText: { fontSize: 11.5, fontWeight: '700' },
  updateBadgeMeta: { fontSize: 11, fontWeight: '600' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  firstSectionLabel: { marginTop: spacing.sm },
  textBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '100%',
  },
  updateInput: {
    fontSize: 15,
    lineHeight: 22,
    minHeight: 112,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.xs,
  },
  photoSection: {
    marginTop: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: { fontSize: 12.5, fontWeight: '600' },
});
