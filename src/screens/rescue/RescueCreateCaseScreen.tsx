import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { addCase } = useRescueFeed();
  const [canPublish, setCanPublish] = useState(false);
  const [publishHint, setPublishHint] = useState<string | null>(null);
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
        contentContainerStyle={[styles.scroll, { paddingBottom: 96 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <RescueOpenCaseForm
          onCanPublishChange={setCanPublish}
          onPublishHintChange={setPublishHint}
          publishRef={publishRef}
        />
      </ScrollView>

      <View style={[
        styles.footer,
        {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}>
        {publishHint ? (
          <Text style={[styles.footerHint, { color: colors.textTertiary }]} numberOfLines={2}>
            {publishHint}
          </Text>
        ) : (
          <View style={styles.footerHintSpacer} />
        )}
        <Button disabled={!canPublish} onPress={publish} icon="shield">
          Open case
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerHint: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  footerHintSpacer: { flex: 1 },
});
