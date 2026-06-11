import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../../components/ui/Button';
import { ProfileSubHeader } from '../../components/profile/ProfileChrome';
import { RescueOpenCaseForm, type RescueOpenCaseDraft } from '../../components/rescue/RescueOpenCaseForm';
import { useRescueFeed } from '../../context/RescueFeedContext';
import type { RescueStackParamList } from '../../navigation/RescueNavigator';

type Nav = NativeStackNavigationProp<RescueStackParamList, 'CreateCase'>;

export function RescueCreateCaseScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { addCase } = useRescueFeed();
  const [canPublish, setCanPublish] = useState(false);
  const publishRef = useRef<(() => RescueOpenCaseDraft | null) | null>(null);

  const publish = useCallback(() => {
    const draft = publishRef.current?.();
    if (!draft) return;
    const item = addCase(draft);
    navigation.replace('Detail', { caseId: item.id });
  }, [addCase, navigation]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader title="Open a case" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <RescueOpenCaseForm
          onCanPublishChange={setCanPublish}
          publishRef={publishRef}
        />
        <Button disabled={!canPublish} onPress={publish} icon="shield" style={{ marginTop: 12 }}>
          Open case
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 18, paddingBottom: 40, paddingTop: 4 },
});
