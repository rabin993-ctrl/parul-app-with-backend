import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Image, Alert } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography } from '../../theme/tokens';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Icon } from '../icons/Icon';
import { CompanionAvatar } from '../ui/Avatar';
import type { AdoptionRecord } from '../../data/adoptionRecords';
import type { Companion } from '../../data/mockData';
import { useMediaPicker, type PickedAsset } from '../../hooks/useMediaPicker';
import { useCompanions } from '../../context/CompanionContext';

type SpeciesChoice = 'dog' | 'cat' | 'other';

const SPECIES_OPTIONS: { id: SpeciesChoice; label: string; icon: string }[] = [
  { id: 'dog', label: 'Dog', icon: 'dog' },
  { id: 'cat', label: 'Cat', icon: 'cat' },
  { id: 'other', label: 'Other', icon: 'paw' },
];

function ManualField({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.fieldRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, { color: colors.text }]}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

const ADOPTION_ADD_BADGE_SIZE = 18;
const ADOPTION_ADD_ICON_SIZE = 10;

export function AddCompanionSheet({
  visible,
  onClose,
  ownerId,
  adoptableRecords,
  onAddFromAdoption,
  onAddManual,
}: {
  visible: boolean;
  onClose: () => void;
  ownerId: string;
  adoptableRecords: AdoptionRecord[];
  onAddFromAdoption: (record: AdoptionRecord) => Companion | null;
  onAddManual: (input: { name: string; species: SpeciesChoice; age: string; ownerId: string }) => Companion | null;
}) {
  const { colors } = useTheme();
  const { updateCompanionAvatar } = useCompanions();
  const { pickImage, takePhoto } = useMediaPicker();
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<SpeciesChoice>('dog');
  const [age, setAge] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<PickedAsset | null>(null);

  const canSubmitManual = name.trim().length > 0;

  const reset = () => {
    setName('');
    setSpecies('dog');
    setAge('');
    setSelectedPhoto(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePickPhoto = async () => {
    const a = await pickImage({ squareCrop: true });
    if (a) setSelectedPhoto(a);
  };

  const handleAdoptionPick = (record: AdoptionRecord) => {
    const added = onAddFromAdoption(record);
    if (added) {
      if (selectedPhoto) void updateCompanionAvatar(added.id, selectedPhoto);
      reset();
      onClose();
    }
  };

  const handleManualAdd = () => {
    if (!canSubmitManual) return;
    const added = onAddManual({ name, species, age, ownerId });
    if (added) {
      if (selectedPhoto) void updateCompanionAvatar(added.id, selectedPhoto);
      reset();
      onClose();
    }
  };

  const showAdoptions = adoptableRecords.length > 0;

  return (
    <Sheet visible={visible} onClose={handleClose} title="Add companion">
      <View style={styles.body}>
        {showAdoptions && (
          <View style={styles.adoptionSection}>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>FROM YOUR ADOPTIONS</Text>
            <View style={styles.adoptionRow}>
              {adoptableRecords.map(record => (
                <Pressable
                  key={record.id}
                  onPress={() => handleAdoptionPick(record)}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${record.petName}`}
                  style={({ pressed }) => [
                    styles.adoptionChip,
                    { opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  <View style={styles.adoptionAvatarWrap}>
                    <CompanionAvatar
                      pet={{ icon: record.icon, tint: record.tint, name: record.petName }}
                      size={48}
                    />
                    <View
                      style={[
                        styles.adoptionAddIcon,
                        {
                          width: ADOPTION_ADD_BADGE_SIZE,
                          height: ADOPTION_ADD_BADGE_SIZE,
                          borderRadius: ADOPTION_ADD_BADGE_SIZE / 2,
                          backgroundColor: colors.primary,
                          borderColor: colors.surface,
                        },
                      ]}
                    >
                      <Icon name="plus" size={ADOPTION_ADD_ICON_SIZE} color="#fff" sw={2.5} />
                    </View>
                  </View>
                  <Text style={[styles.adoptionChipName, { color: colors.text }]} numberOfLines={1}>
                    {record.petName}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textTertiary }]}>or add manually</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>
          </View>
        )}

        <View style={styles.manualSection}>
          {!showAdoptions && (
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              Showcase a new companion on your profile
            </Text>
          )}

          <Pressable onPress={handlePickPhoto} style={styles.photoPickerWrap} accessibilityRole="button" accessibilityLabel="Add companion photo">
            {selectedPhoto ? (
              <Image source={{ uri: selectedPhoto.uri }} style={styles.photoPreview} />
            ) : (
              <View style={[styles.photoPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Icon name="camera" size={28} color={colors.textTertiary} />
                <Text style={[styles.photoHint, { color: colors.textTertiary }]}>Add photo</Text>
              </View>
            )}
          </Pressable>

          <View style={[styles.fieldGroup, { borderTopColor: colors.border }]}>
            <ManualField
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Milo"
            />

            <View style={[styles.fieldRow, styles.speciesField, { borderBottomColor: colors.border }]}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Species</Text>
              <View style={styles.speciesOptions}>
                {SPECIES_OPTIONS.map(opt => {
                  const on = species === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      onPress={() => setSpecies(opt.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}
                    >
                      <View style={styles.speciesOption}>
                        <Icon
                          name={opt.icon}
                          size={14}
                          color={on ? colors.text : colors.textTertiary}
                        />
                        <Text style={[
                          styles.speciesLabel,
                          { color: on ? colors.text : colors.textTertiary, fontWeight: on ? '700' : '500' },
                        ]}>
                          {opt.label}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <ManualField
              label="Age"
              value={age}
              onChangeText={setAge}
              placeholder="e.g. 2 yrs"
            />
          </View>

          <Button full onPress={handleManualAdd} disabled={!canSubmitManual} style={styles.submitBtn}>
            Add companion
          </Button>
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 4, paddingHorizontal: 20, paddingBottom: 8 },
  adoptionSection: { paddingTop: 10, gap: 12 },
  eyebrow: { ...typography.sectionLabel, fontSize: 10, letterSpacing: 0.6 },
  hint: { ...typography.small, lineHeight: 18, marginBottom: 4 },
  adoptionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  adoptionChip: {
    alignItems: 'center',
    gap: 4,
    minWidth: 72,
    maxWidth: 96,
  },
  adoptionAvatarWrap: { position: 'relative' },
  adoptionAddIcon: {
    position: 'absolute',
    right: -2,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  adoptionChipName: {
    ...typography.caption,
    fontSize: 13,
    fontFamily: typography.title.fontFamily,
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { ...typography.meta, fontSize: 11 },
  manualSection: { gap: 16, paddingTop: 4 },
  fieldGroup: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  speciesField: {
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  fieldLabel: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    width: 64,
    flexShrink: 0,
  },
  fieldInput: {
    flex: 1,
    ...typography.body,
    fontSize: 15,
    padding: 0,
    margin: 0,
  },
  speciesOptions: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingTop: 1,
  },
  speciesOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  speciesLabel: {
    ...typography.caption,
    fontSize: 13,
  },
  submitBtn: { marginTop: 4 },
  photoPickerWrap: { alignSelf: 'center' },
  photoPreview: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
  },
  photoPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoHint: { fontSize: 11, fontWeight: '600' },
});
