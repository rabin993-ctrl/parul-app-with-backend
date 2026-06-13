import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography } from '../../theme/tokens';
import { Icon } from '../../components/icons/Icon';
import { Button } from '../../components/ui/Button';
import { useCompanions } from '../../context/CompanionContext';
import { useAuth } from '../../context/AuthContext';

type SpeciesChoice = 'dog' | 'cat' | 'other';

const SPECIES: { id: SpeciesChoice; label: string; icon: string }[] = [
  { id: 'dog', label: 'Dog', icon: 'dog' },
  { id: 'cat', label: 'Cat', icon: 'cat' },
  { id: 'other', label: 'Other', icon: 'paw' },
];

export function CompanionOnboardingScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { addManualAsync } = useCompanions();

  const [name, setName] = useState('');
  const [species, setSpecies] = useState<SpeciesChoice>('dog');
  const [age, setAge] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && !loading;

  const handleAdd = async () => {
    if (!canSubmit || !user) return;
    setLoading(true);
    setError(null);
    const result = await addManualAsync({ name: name.trim(), species, age, ownerId: user.id });
    setLoading(false);
    if (!result) {
      setError('Could not save your companion. Please try again.');
    }
    // On success CompanionContext revision bumps → AppInner re-renders → shows main app
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
              <Icon name="paw" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.headline, { color: colors.text }]}>Add your first companion</Text>
            <Text style={[styles.subline, { color: colors.textSecondary }]}>
              Your companion is the heart of your profile. Add at least one to get started.
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Species</Text>
            <View style={styles.speciesRow}>
              {SPECIES.map(opt => {
                const on = species === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setSpecies(opt.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={({ pressed }) => [
                      styles.speciesChip,
                      {
                        backgroundColor: on ? colors.primary + '18' : colors.surface2,
                        borderColor: on ? colors.primary : colors.border,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Icon name={opt.icon} size={16} color={on ? colors.primary : colors.textSecondary} />
                    <Text style={[
                      styles.speciesLabel,
                      { color: on ? colors.primary : colors.textSecondary, fontWeight: on ? '700' : '500' },
                    ]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Name *</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }]}
              placeholder="e.g. Milo, Bella, Charlie"
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={t => { setName(t); setError(null); }}
              autoFocus
              returnKeyType="next"
            />

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Age (optional)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }]}
              placeholder="e.g. 2 yrs, 6 months"
              placeholderTextColor={colors.textTertiary}
              value={age}
              onChangeText={setAge}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
          </View>

          {error && (
            <View style={[styles.errorRow, { backgroundColor: colors.danger + '12', borderColor: colors.danger + '30' }]}>
              <Icon name="alert" size={14} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            </View>
          )}

          <Button
            full
            disabled={!canSubmit}
            onPress={handleAdd}
            style={styles.submitBtn}
            icon={loading ? undefined : 'paw'}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              'Add companion & get started'
            )}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 32,
    gap: 20,
  },
  header: { alignItems: 'center', gap: 12, paddingBottom: 4 },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    ...typography.title,
    fontSize: 24,
    textAlign: 'center',
  },
  subline: {
    ...typography.body,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 12,
  },
  fieldLabel: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  speciesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  speciesChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  speciesLabel: {
    ...typography.caption,
    fontSize: 13,
  },
  divider: { height: StyleSheet.hairlineWidth },
  input: {
    ...typography.body,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  errorText: { fontSize: 13, fontWeight: '500', flex: 1 },
  submitBtn: { marginTop: 4 },
});
