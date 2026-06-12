import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography } from '../../theme/tokens';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/icons/Icon';
import { Sheet } from '../../components/ui/Sheet';
import { PawCircle } from '../../data/pawCircles';
import { PawCircleHairline } from './PawCircleChrome';

export function CircleHeroCard({
  circle,
  bio,
  role,
  canEdit,
  onEdit,
}: {
  circle: PawCircle;
  bio: string;
  role?: string;
  canEdit?: boolean;
  onEdit?: () => void;
}) {
  const { colors, iconBg } = useTheme();
  const displayBio = bio || 'Add a short bio to tell members what this circle is about.';

  return (
    <View style={styles.hero}>
      {canEdit && onEdit && (
        <Pressable
          onPress={onEdit}
          style={({ pressed }) => [styles.heroEditBtn, pressed && styles.pressed]}
          hitSlop={8}
        >
          <Icon name="edit" size={16} color={colors.textSecondary} />
          <Text style={[styles.heroEditText, { color: colors.textSecondary }]}>Edit</Text>
        </Pressable>
      )}
      <View style={styles.heroTop}>
        <View style={[styles.heroIcon, { backgroundColor: iconBg(circle.iconBg) }]}>
          <Icon
            name={circle.icon}
            size={26}
            color={circle.tint}
            fill={circle.icon === 'paw' || circle.icon === 'cat' ? circle.tint : 'none'}
          />
        </View>
        <View style={styles.heroMeta}>
          <Text style={[styles.heroName, { color: colors.text }]} numberOfLines={2}>
            {circle.name}
          </Text>
          <Text style={[styles.heroLocation, { color: colors.primary }]} numberOfLines={1}>
            {circle.location}
          </Text>
          {role ? (
            <Text style={[styles.heroRole, { color: colors.text }]}>{role}</Text>
          ) : null}
          <Text
            style={[styles.heroBio, { color: bio ? colors.textSecondary : colors.textTertiary }]}
            numberOfLines={3}
          >
            {displayBio}
          </Text>
        </View>
      </View>
      <PawCircleHairline style={{ marginTop: spacing.xs }} />
    </View>
  );
}

export function EditCircleSheet({
  visible,
  circle,
  onClose,
  onSave,
  saving,
}: {
  visible: boolean;
  circle: PawCircle;
  onClose: () => void;
  onSave: (name: string, bio: string) => void;
  saving?: boolean;
}) {
  const { colors } = useTheme();
  const [name, setName] = useState(circle.name);
  const [bio, setBio] = useState(circle.bio ?? circle.tagline ?? '');

  useEffect(() => {
    if (visible) {
      setName(circle.name);
      setBio(circle.bio ?? circle.tagline ?? '');
    }
  }, [visible, circle.name, circle.bio, circle.tagline]);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Edit circle"
      footer={
        <Button
          full
          variant="primary"
          loading={saving}
          disabled={!name.trim()}
          onPress={() => onSave(name, bio)}
        >
          Save changes
        </Button>
      }
    >
      <View style={styles.sheetBody}>
        <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Circle name</Text>
        <TextInput
          style={[styles.editInput, { color: colors.text, borderBottomColor: colors.border }]}
          value={name}
          onChangeText={setName}
          placeholder="Circle name"
          placeholderTextColor={colors.textTertiary}
          maxLength={60}
        />
        <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Bio</Text>
        <TextInput
          style={[
            styles.editInput,
            styles.editBioInput,
            { color: colors.text, borderBottomColor: colors.border },
          ]}
          value={bio}
          onChangeText={setBio}
          placeholder="What is this circle about?"
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={200}
        />
        <Text style={[styles.editHint, { color: colors.textTertiary }]}>
          {bio.length}/200 characters
        </Text>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingBottom: spacing.sm,
    position: 'relative',
  },
  heroEditBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    zIndex: 1,
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  heroEditText: { fontSize: 13, fontWeight: '600' },
  pressed: { opacity: 0.55 },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingRight: spacing.xl2,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heroMeta: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
    paddingTop: 4,
  },
  heroName: {
    ...typography.title,
    fontSize: 20,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  heroLocation: {
    ...typography.small,
    lineHeight: 18,
    fontWeight: '600',
  },
  heroRole: {
    ...typography.caption,
    lineHeight: 16,
    fontWeight: '700',
  },
  heroBio: {
    ...typography.small,
    lineHeight: 19,
  },
  sheetBody: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm, gap: spacing.sm },
  editLabel: { ...typography.caption, marginTop: spacing.xs },
  editInput: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 0,
    paddingVertical: 11,
    fontSize: 15,
  },
  editBioInput: { minHeight: 80, paddingTop: 11 },
  editHint: { ...typography.meta, textAlign: 'right' },
});
