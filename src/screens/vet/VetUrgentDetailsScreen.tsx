import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/icons/Icon';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { getIssueById } from '../../data/vetData';
import { useCompanions } from '../../context/CompanionContext';
import { useVetConsult } from '../../context/VetConsultContext';
import type { VetStackParamList } from '../../navigation/VetNavigator';

type Route = RouteProp<VetStackParamList, 'UrgentDetails'>;
type Nav = NativeStackNavigationProp<VetStackParamList, 'UrgentDetails'>;

export function VetUrgentDetailsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { issueId, petId } = useRoute<Route>().params;
  const { startUrgentConsult } = useVetConsult();
  const { getCompanion } = useCompanions();
  const issue = getIssueById(issueId);

  const pet = useMemo(() => {
    if (petId === 'custom') return null;
    return getCompanion(petId);
  }, [petId, getCompanion]);

  const [symptoms, setSymptoms] = useState('');
  const [hasImage, setHasImage] = useState(false);
  const [customName, setCustomName] = useState('');

  const petName = pet?.name ?? customName;
  const canContinue = symptoms.trim().length >= 12 && (pet || customName.trim().length >= 2);

  const requestHelp = () => {
    if (!canContinue || !issue) return;
    const consultId = startUrgentConsult({
      issueId,
      issueLabel: issue.label,
      petId: pet?.id ?? 'custom',
      petName,
      petSpecies: pet?.species ?? 'dog',
      symptoms: symptoms.trim(),
      hasImage,
    });
    navigation.replace('Matching', { consultId });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="Describe symptoms" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {!pet && (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Pet name</Text>
            <TextInput
              value={customName}
              onChangeText={setCustomName}
              placeholder="Enter pet name"
              placeholderTextColor={colors.textTertiary}
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
            />
          </>
        )}

        <Text style={[styles.label, { color: colors.textSecondary }]}>
          What is happening with {petName || 'your pet'}?
        </Text>
        <TextInput
          value={symptoms}
          onChangeText={setSymptoms}
          placeholder="Describe symptoms, when they started, and anything urgent we should know…"
          placeholderTextColor={colors.textTertiary}
          multiline
          textAlignVertical="top"
          style={[styles.input, styles.area, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
        />

        <Pressable
          onPress={() => setHasImage(v => !v)}
          style={[styles.imageRow, { backgroundColor: colors.surface2, borderColor: colors.border }]}
        >
          <Icon name="image" size={18} color={colors.primary} />
          <Text style={[styles.imageText, { color: colors.text }]}>
            {hasImage ? 'Photo attached' : 'Add photo (optional)'}
          </Text>
          {hasImage && <Icon name="check" size={16} color={colors.primary} />}
        </Pressable>

        <View style={[styles.note, { backgroundColor: colors.infoBg }]}>
          <Icon name="shield" size={16} color={colors.primary} />
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>
            For life-threatening emergencies, visit the nearest clinic immediately. This service complements — not replaces — in-person care.
          </Text>
        </View>

        <Button variant="primary" full onPress={requestHelp} disabled={!canContinue} style={{ marginTop: 12 }}>
          Request urgent help
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 10 },
  area: { minHeight: 130, lineHeight: 22 },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: 12,
  },
  imageText: { flex: 1, fontSize: 14, fontWeight: '600' },
  note: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: radius.lg,
    alignItems: 'flex-start',
  },
  noteText: { flex: 1, fontSize: 12.5, lineHeight: 18 },
});
