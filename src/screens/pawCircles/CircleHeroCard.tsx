import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/tokens';
import { Button } from '../../components/ui/Button';
import { CircleAvatar } from '../../components/ui/CircleAvatar';
import { Icon } from '../../components/icons/Icon';
import { PawCircle } from '../../data/pawCircles';
import {
  CircleSlugStatus,
  circleSlugIndicator,
  fetchCircleSlugAvailability,
  slugStatusFromDraft,
  toSlugDraft,
} from '../../lib/circleSlug';

export type CircleHeroSavePayload = {
  name: string;
  bio: string;
  slug: string;
  location: string;
};

export function CircleHeroCard({
  circle,
  bio,
  role,
  canEdit,
  onSave,
  onPhotoPress,
  photoUploading,
  saving,
}: {
  circle: PawCircle;
  bio: string;
  role?: string;
  canEdit?: boolean;
  onSave?: (payload: CircleHeroSavePayload) => void | Promise<void>;
  onPhotoPress?: () => void;
  photoUploading?: boolean;
  saving?: boolean;
}) {
  const { colors } = useTheme();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(circle.name);
  const [editBio, setEditBio] = useState(bio);
  const [editSlug, setEditSlug] = useState(circle.id);
  const [editLocation, setEditLocation] = useState(circle.location ?? '');
  const [slugStatus, setSlugStatus] = useState<CircleSlugStatus>('available');
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkSlug = useCallback((raw: string) => {
    if (checkTimer.current) clearTimeout(checkTimer.current);
    const next = slugStatusFromDraft(raw);
    if (next !== 'checking') {
      setSlugStatus(next);
      return;
    }
    setSlugStatus('checking');
    checkTimer.current = setTimeout(async () => {
      const status = await fetchCircleSlugAvailability(raw, { excludeSlug: circle.id });
      setSlugStatus(status);
    }, 420);
  }, [circle.id]);

  useEffect(() => {
    if (!editing) {
      setEditName(circle.name);
      setEditBio(bio);
      setEditSlug(circle.id);
      setEditLocation(circle.location ?? '');
      setSlugStatus('available');
    }
  }, [circle.name, circle.id, circle.location, bio, editing]);

  const hasBio = !!bio.trim();
  const displayBio = bio || 'Add a short bio to tell members what this circle is about.';
  const circleTint = circle.tint ?? colors.primary;
  const slugIndicator = circleSlugIndicator(slugStatus, colors);

  const resetDraft = () => {
    setEditName(circle.name);
    setEditBio(bio);
    setEditSlug(circle.id);
    setEditLocation(circle.location ?? '');
    setSlugStatus('available');
  };

  const startEditing = () => {
    resetDraft();
    setEditing(true);
  };

  const cancelEditing = () => {
    resetDraft();
    setEditing(false);
  };

  const handleSlugChange = (text: string) => {
    const raw = text.replace(/[^a-z0-9-]/gi, '').toLowerCase();
    setEditSlug(raw);
    checkSlug(raw);
  };

  const handleSave = async () => {
    if (!editName.trim() || !onSave) return;
    const finalSlug = toSlugDraft(editSlug);
    if (!finalSlug || finalSlug.length < 2) return;
    if (slugStatus === 'taken' || slugStatus === 'invalid' || slugStatus === 'checking') return;

    try {
      await onSave({
        name: editName,
        bio: editBio,
        slug: finalSlug,
        location: editLocation.trim(),
      });
      setEditing(false);
    } catch {
      // Stay in edit mode; parent shows error toast.
    }
  };

  const saveDisabled = !editName.trim()
    || slugStatus === 'taken'
    || slugStatus === 'invalid'
    || slugStatus === 'checking';

  return (
    <View style={styles.card}>
      <View style={styles.heroHeader}>
        {canEdit && onSave ? (
          editing ? (
            <Pressable
              onPress={cancelEditing}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Cancel editing circle"
              style={({ pressed }) => [
                styles.cancelBtn,
                { backgroundColor: colors.surface2 },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.editBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={startEditing}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Edit circle"
              style={({ pressed }) => [
                styles.editBtn,
                pressed && styles.pressed,
              ]}
            >
              <Icon name="edit" size={22} color={colors.textSecondary} sw={2.2} />
            </Pressable>
          )
        ) : null}

        <View style={styles.identity}>
          {onPhotoPress ? (
          <Pressable
            onPress={onPhotoPress}
            disabled={photoUploading || saving}
            accessibilityRole="button"
            accessibilityLabel="Change circle photo"
            style={({ pressed }) => [
              styles.avatarWrap,
              (pressed || photoUploading) && styles.pressed,
            ]}
          >
            <View style={styles.avatar}>
              <CircleAvatar circle={circle} size={64} iconSize={30} label={circle.name} />
              {photoUploading ? (
                <View style={[styles.avatarOverlay, { backgroundColor: colors.bg + 'AA' }]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : null}
            </View>
            <View style={[styles.photoBadge, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
              <Icon name="camera" size={11} color="#fff" sw={2.2} />
            </View>
          </Pressable>
        ) : (
          <CircleAvatar circle={circle} size={64} iconSize={30} label={circle.name} />
        )}

        {editing ? (
          <View style={[styles.editFieldShell, { borderBottomColor: colors.border }]}>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Circle name"
              placeholderTextColor={colors.textTertiary}
              maxLength={60}
              style={[styles.nameInput, { color: colors.text }]}
            />
          </View>
        ) : (
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
            {circle.name}
          </Text>
        )}

        {editing ? (
          <View style={styles.slugEditBlock}>
            <View style={styles.slugLabelRow}>
              <Text style={[styles.slugFieldLabel, { color: colors.textSecondary }]}>Username</Text>
              {slugIndicator && (
                <Text style={[styles.slugIndicator, { color: slugIndicator.color }]}>
                  {slugIndicator.label}
                </Text>
              )}
            </View>
            <View style={[styles.editFieldShell, { borderBottomColor: colors.border }]}>
              <View style={styles.slugInputRow}>
                <Text style={[styles.slugAt, { color: colors.textTertiary }]}>@</Text>
                <TextInput
                  value={editSlug}
                  onChangeText={handleSlugChange}
                  placeholder="circle-username"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.slugInput, { color: colors.text }]}
                />
              </View>
            </View>
          </View>
        ) : (
          <Text style={[styles.username, { color: colors.textSecondary }]} numberOfLines={1}>
            @{circle.id}
          </Text>
        )}

        {editing ? (
          <View style={styles.slugEditBlock}>
            <View style={styles.slugLabelRow}>
              <Text style={[styles.slugFieldLabel, { color: colors.textSecondary }]}>Location</Text>
            </View>
            <View style={[styles.editFieldShell, { borderBottomColor: colors.border }]}>
              <TextInput
                value={editLocation}
                onChangeText={setEditLocation}
                placeholder="Neighbourhood or area"
                placeholderTextColor={colors.textTertiary}
                style={[styles.locationInput, { color: colors.text }]}
              />
            </View>
          </View>
        ) : circle.location ? (
          <View style={[styles.metaPill, { backgroundColor: colors.infoBg }]}>
            <Icon name="mapPin" size={12} color={colors.primary} />
            <Text style={[styles.metaPillText, { color: colors.primary }]} numberOfLines={1}>
              {circle.location}
            </Text>
            <Text style={[styles.metaDot, { color: colors.primary + '66' }]}>·</Text>
            <Text style={[styles.metaPillText, { color: colors.primary }]}>
              {circle.memberCount} member{circle.memberCount === 1 ? '' : 's'}
            </Text>
          </View>
        ) : null}

        {role && !editing ? (
          <View style={[styles.rolePill, { backgroundColor: circleTint + '14' }]}>
            <Text style={[styles.roleText, { color: circleTint }]}>{role}</Text>
          </View>
        ) : null}
        </View>
      </View>

      <View style={styles.bioBlock}>
        <Text style={[styles.bioLabel, { color: colors.textTertiary }]}>About</Text>
        {editing ? (
          <>
            <View style={[styles.editFieldShell, { borderBottomColor: colors.border }]}>
              <TextInput
                value={editBio}
                onChangeText={setEditBio}
                placeholder="What is this circle about?"
                placeholderTextColor={colors.textTertiary}
                multiline
                textAlignVertical="top"
                maxLength={200}
                style={[styles.bioInput, { color: colors.text }]}
              />
            </View>
            <Text style={[styles.bioHint, { color: colors.textTertiary }]}>
              {editBio.length}/200 characters
            </Text>
            <Button
              variant="primary"
              full
              loading={saving}
              disabled={saveDisabled}
              onPress={handleSave}
            >
              Save changes
            </Button>
          </>
        ) : (
          <Text
            style={[
              styles.bioText,
              {
                color: hasBio ? colors.textSecondary : colors.textTertiary,
                fontStyle: hasBio ? 'normal' : 'italic',
              },
            ]}
          >
            {displayBio}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.lg,
  },
  heroHeader: {
    position: 'relative',
    width: '100%',
  },
  editBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingVertical: 4,
    paddingLeft: 8,
    zIndex: 1,
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  cancelBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    zIndex: 1,
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  editBtnText: { fontSize: 12.5, fontWeight: '700' },
  pressed: { opacity: 0.65 },
  identity: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    width: '100%',
  },
  avatarWrap: {
    position: 'relative',
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 64,
    height: 64,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.35,
    lineHeight: 27,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  nameInput: {
    width: '100%',
    paddingHorizontal: 0,
    paddingVertical: 0,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.35,
    lineHeight: 26,
    textAlign: 'center',
    ...(Platform.OS === 'web'
      ? { outlineStyle: 'none', borderWidth: 0, backgroundColor: 'transparent' }
      : null),
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  slugEditBlock: {
    alignSelf: 'stretch',
    gap: spacing.xs,
  },
  slugLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slugFieldLabel: { ...typography.caption },
  slugIndicator: { fontSize: 11.5, fontWeight: '600' },
  slugInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slugAt: { fontSize: 14, fontWeight: '600', marginRight: 2 },
  slugInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    padding: 0,
    margin: 0,
    ...(Platform.OS === 'web'
      ? { outlineStyle: 'none', borderWidth: 0, backgroundColor: 'transparent' }
      : null),
  },
  locationInput: {
    width: '100%',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'left',
    padding: 0,
    margin: 0,
    ...(Platform.OS === 'web'
      ? { outlineStyle: 'none', borderWidth: 0, backgroundColor: 'transparent' }
      : null),
  },
  editFieldShell: {
    alignSelf: 'stretch',
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: spacing.md,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    maxWidth: '100%',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  metaPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 16,
  },
  metaDot: {
    fontSize: 12.5,
    fontWeight: '700',
    lineHeight: 16,
  },
  rolePill: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  bioBlock: {
    gap: spacing.xs,
    alignSelf: 'stretch',
    width: '100%',
  },
  bioLabel: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  bioText: {
    fontSize: 14,
    lineHeight: 21,
  },
  bioInput: {
    width: '100%',
    paddingHorizontal: 0,
    paddingVertical: 0,
    fontSize: 14,
    lineHeight: 21,
    ...(Platform.OS === 'web'
      ? { outlineStyle: 'none', borderWidth: 0, backgroundColor: 'transparent', resize: 'none' as const }
      : null),
  },
  bioHint: {
    ...typography.meta,
    textAlign: 'right',
  },
});
