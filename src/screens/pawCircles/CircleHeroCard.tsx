import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/icons/Icon';
import { Sheet } from '../../components/ui/Sheet';
import { PawCircle } from '../../data/pawCircles';

export function CircleHeroCard({
  circle,
  memberCount,
  bio,
  role,
  canEdit,
  onEdit,
}: {
  circle: PawCircle;
  memberCount?: number;
  bio: string;
  role?: string;
  canEdit?: boolean;
  onEdit?: () => void;
}) {
  const { colors } = useTheme();
  const count = memberCount ?? circle.memberCount;
  const displayBio = bio || 'Add a short bio to tell members what this circle is about.';

  return (
    <View style={[styles.hero, { backgroundColor: colors.surface }]}>
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
      <View style={[styles.heroIcon, { backgroundColor: circle.iconBg }]}>
        <Icon
          name={circle.icon}
          size={28}
          color={circle.tint}
          fill={circle.icon === 'paw' || circle.icon === 'cat' ? circle.tint : 'none'}
        />
      </View>
      <Text style={[styles.heroName, { color: colors.text }]} numberOfLines={2}>
        {circle.name}
      </Text>
      <Text style={[styles.heroMeta, { color: colors.textSecondary }]} numberOfLines={1}>
        {circle.location} · {count} {count === 1 ? 'member' : 'members'}
      </Text>
      {role && (
        <Text style={[styles.heroRole, { color: colors.textSecondary }]}>{role}</Text>
      )}
      <Text
        style={[styles.heroBio, { color: bio ? colors.textSecondary : colors.textTertiary }]}
        numberOfLines={4}
      >
        {displayBio}
      </Text>
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
          style={[styles.editInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
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
            { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
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
    alignItems: 'center',
    borderRadius: radius.xl,
    paddingVertical: 22,
    paddingHorizontal: 16,
    gap: 6,
    position: 'relative',
  },
  heroEditBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
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
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  heroMeta: { fontSize: 13, textAlign: 'center' },
  heroRole: { fontSize: 12, textAlign: 'center', marginTop: 2 },
  heroBio: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
  },
  sheetBody: { paddingHorizontal: 20, paddingBottom: 8, gap: 8 },
  editLabel: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  editInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
  },
  editBioInput: { minHeight: 96, paddingTop: 11 },
  editHint: { fontSize: 11, textAlign: 'right' },
});
