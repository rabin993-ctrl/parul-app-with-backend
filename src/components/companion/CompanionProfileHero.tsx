import React from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, ActivityIndicator, TextInput,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { CompanionAvatar } from '../ui/Avatar';
import { getPetAvatarFrameSize, getPetMainCircleCenterY } from '../ui/PawPadShape';
import { TreatGiftBurst } from '../TreatGiftBurst';
import { useAuth } from '../../context/AuthContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import { CompanionHealthMetaLine } from './CompanionDetailsCard';
import { Icon } from '../icons/Icon';
import type { Companion } from '../../data/mockData';

const FULL_AVATAR = 88;
const COMPACT_AVATAR = 72;

function heroMetaPaddingTop(
  avatarSize: number,
  compact: boolean,
): number {
  const nameH = compact ? 24 : 28;
  const ownerH = 18;
  const rowGap = 3;
  const circleCenterY = getPetMainCircleCenterY(avatarSize);
  // Align "with you · …" row to the DP circle center; name sits above.
  return Math.max(0, circleCenterY - (nameH + rowGap + ownerH / 2));
}

function BorderedAvatar({
  companion,
  size,
  giftBurstKey = 0,
  editable = false,
  uploading = false,
  onEditPress,
}: {
  companion: Companion;
  size: number;
  giftBurstKey?: number;
  editable?: boolean;
  uploading?: boolean;
  onEditPress?: () => void;
}) {
  const frame = getPetAvatarFrameSize(size);

  const inner = (
    <>
      <CompanionAvatar companion={companion} size={size} />
      {editable && uploading ? (
        <View style={[StyleSheet.absoluteFill, styles.avatarUploadingOverlay]}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : null}
      <TreatGiftBurst
        trigger={giftBurstKey}
        avatarSize={size}
        frameWidth={frame.width}
        frameHeight={frame.height}
      />
    </>
  );

  if (editable) {
    return (
      <Pressable
        onPress={onEditPress}
        disabled={uploading || !onEditPress}
        accessibilityRole="button"
        accessibilityLabel={`Change ${companion.name}'s profile photo`}
        style={({ pressed }) => [
          styles.avatarSlot,
          { width: frame.width, minHeight: frame.height, opacity: pressed ? 0.75 : 1 },
        ]}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View style={[styles.avatarSlot, { width: frame.width, minHeight: frame.height }]}>
      {inner}
    </View>
  );
}

function OwnerAssociation({
  companion,
  onOwnerPress,
  genderLabel,
}: {
  companion: Companion;
  onOwnerPress?: (ownerId: string) => void;
  genderLabel?: string | null;
}) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const owner = useUserProfile(companion.ownerId);

  const isYou = companion.ownerId === user?.id;
  const ownerLabel = owner?.name ?? '…';
  const pressable = !!onOwnerPress && !isYou;

  const handlePress = () => {
    if (pressable) onOwnerPress?.(companion.ownerId);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!pressable}
      hitSlop={pressable ? 6 : 0}
      accessibilityRole={pressable ? 'button' : 'text'}
      accessibilityLabel={`${companion.name} with ${ownerLabel}${genderLabel ? `, ${genderLabel}` : ''}`}
      style={({ pressed }) => [
        styles.ownerInline,
        pressable && styles.ownerPressable,
        pressed && pressable && styles.pressed,
      ]}
    >
      <Text style={styles.ownerLine} numberOfLines={1}>
        <Text style={{ color: colors.textTertiary, fontWeight: '400' }}>with </Text>
        <Text
          style={{ color: colors.text, fontWeight: '600' }}
          onPress={pressable ? handlePress : undefined}
          suppressHighlighting
        >
          {ownerLabel}
        </Text>
        {genderLabel ? (
          <Text style={{ color: colors.textTertiary, fontWeight: '400' }}>
            {` · ${genderLabel}`}
          </Text>
        ) : null}
      </Text>
    </Pressable>
  );
}

export function CompanionProfileHero({
  companion,
  giftBurstKey = 0,
  compact = false,
  onAvatarPress,
  onOwnerPress,
  onEditPress,
  ownPet = false,
  editing = false,
  avatarEditable = false,
  avatarUploading = false,
  about,
  onAboutChange,
  vaccinated = false,
  neutered = false,
  showBioInHero = true,
}: {
  companion: Companion;
  giftBurstKey?: number;
  /** Mini sheet — smaller avatar */
  compact?: boolean;
  onAvatarPress?: () => void;
  onOwnerPress?: (ownerId: string) => void;
  onEditPress?: () => void;
  ownPet?: boolean;
  editing?: boolean;
  avatarEditable?: boolean;
  avatarUploading?: boolean;
  about?: string;
  onAboutChange?: (value: string) => void;
  vaccinated?: boolean;
  neutered?: boolean;
  /** Full profile renders bio below stats; mini sheet keeps it in the hero. */
  showBioInHero?: boolean;
}) {
  const { colors } = useTheme();
  const avatarSize = compact ? COMPACT_AVATAR : FULL_AVATAR;
  const bio = about ?? companion.about?.trim();
  const genderLabel = companion.gender && companion.gender !== '—' ? companion.gender : null;
  const showEditIcon = ownPet && !!onEditPress && !editing;
  const metaPaddingTop = heroMetaPaddingTop(avatarSize, compact);

  const avatar = avatarEditable ? (
    <BorderedAvatar
      companion={companion}
      size={avatarSize}
      giftBurstKey={giftBurstKey}
      editable
      uploading={avatarUploading}
      onEditPress={onAvatarPress}
    />
  ) : onAvatarPress ? (
    <Pressable
      onPress={onAvatarPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`View ${companion.name}'s profile`}
      style={({ pressed }) => [styles.avatarPressable, pressed && styles.pressed]}
    >
      <BorderedAvatar companion={companion} size={avatarSize} giftBurstKey={giftBurstKey} />
    </Pressable>
  ) : (
    <BorderedAvatar companion={companion} size={avatarSize} giftBurstKey={giftBurstKey} />
  );

  return (
    <View style={styles.heroRow}>
      {avatar}
      <View style={[styles.heroMeta, { paddingTop: metaPaddingTop }]}>
        <View style={styles.nameRow}>
          <Text
            style={[styles.heroName, compact && styles.heroNameCompact, { color: colors.text }]}
            numberOfLines={1}
          >
            {companion.name}
          </Text>
          {showEditIcon ? (
            <Pressable
              onPress={onEditPress}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
              style={({ pressed }) => [styles.editIconBtn, pressed && styles.pressed]}
            >
              <Icon name="edit" size={16} color={colors.textTertiary} sw={2} />
            </Pressable>
          ) : null}
        </View>
        <OwnerAssociation
          companion={companion}
          onOwnerPress={onOwnerPress}
          genderLabel={genderLabel}
        />
        {showBioInHero && editing && onAboutChange ? (
          <TextInput
            value={about ?? ''}
            onChangeText={onAboutChange}
            placeholder={`Tell people about ${companion.name}…`}
            placeholderTextColor={colors.textTertiary}
            multiline
            style={[
              styles.heroBioInput,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 },
            ]}
          />
        ) : showBioInHero && bio ? (
          <Text
            style={[styles.heroBio, { color: colors.textSecondary }]}
            numberOfLines={compact ? 2 : 3}
          >
            {bio}
          </Text>
        ) : null}
        {showBioInHero && !editing ? (
          <CompanionHealthMetaLine
            vaccinated={vaccinated}
            neutered={neutered}
            gender={companion.gender}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroMeta: { flex: 1, gap: 3, minWidth: 0 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  heroName: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  heroNameCompact: { fontSize: 18 },
  editIconBtn: {
    padding: 4,
    flexShrink: 0,
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  heroBio: { fontSize: 13, lineHeight: 19, marginTop: 2 },
  heroBioInput: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  ownerInline: { alignSelf: 'flex-start' },
  ownerPressable: Platform.select({
    web: { cursor: 'pointer' },
    default: {},
  }),
  ownerLine: { fontSize: 13.5, lineHeight: 18 },
  avatarPressable: Platform.select({
    web: { cursor: 'pointer' },
    default: {},
  }),
  pressed: { opacity: 0.7 },
  avatarSlot: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
    flexShrink: 0,
  },
  avatarUploadingOverlay: {
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
