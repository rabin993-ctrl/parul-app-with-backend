import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, NavigationIndependentTree } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { RescueFeedProvider } from '../context/RescueFeedContext';
import { RescueOpenCaseFlowProvider } from '../context/RescueOpenCaseFlowContext';
import { RescueOpenCaseForm, type RescueOpenCaseDraft } from '../components/rescue/RescueOpenCaseForm';
import { RescueCaseDetailScreen } from '../screens/profile/RescueCaseDetailScreen';
import { RescuePostUpdateScreen } from '../screens/rescue/RescuePostUpdateScreen';
import { Sheet } from '../components/ui/Sheet';
import { Button } from '../components/ui/Button';
import { useRescueFeed } from '../context/RescueFeedContext';
import type { RescueStackParamList } from './RescueNavigator';

const Stack = createNativeStackNavigator<RescueStackParamList>();

function OpenCaseSheet({
  visible,
  onClose,
  onPublished,
}: {
  visible: boolean;
  onClose: () => void;
  onPublished: (caseId: string) => void;
}) {
  const { colors } = useTheme();
  const { addCase } = useRescueFeed();
  const [canPublish, setCanPublish] = useState(false);
  const [publishHint, setPublishHint] = useState<string | null>(null);
  const publishRef = useRef<(() => RescueOpenCaseDraft | null) | null>(null);

  const publish = useCallback(() => {
    const draft = publishRef.current?.();
    if (!draft) return;
    const item = addCase(draft);
    onPublished(item.id);
  }, [addCase, onPublished]);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Open a case"
      maxHeight={Platform.OS === 'web' ? 680 : undefined}
    >
      <View style={styles.sheetBody}>
        <RescueOpenCaseForm
          onCanPublishChange={setCanPublish}
          onPublishHintChange={setPublishHint}
          publishRef={publishRef}
        />
        <View style={styles.actions}>
          {publishHint ? (
            <Text style={[styles.actionsHint, { color: colors.textTertiary }]} numberOfLines={2}>
              {publishHint}
            </Text>
          ) : (
            <View style={styles.actionsHintSpacer} />
          )}
          <Button disabled={!canPublish} onPress={publish} icon="shield">
            Open case
          </Button>
        </View>
      </View>
    </Sheet>
  );
}

function DetailFlow({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const { colors } = useTheme();

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.detailRoot, { backgroundColor: colors.bg }]}>
        <RescueOpenCaseFlowProvider close={onClose}>
          <NavigationIndependentTree>
            <NavigationContainer>
              <Stack.Navigator
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.bg, flex: 1 },
                  animation: 'slide_from_right',
                }}
                initialRouteName="Detail"
              >
                <Stack.Screen name="Detail" initialParams={{ caseId }} component={RescueCaseDetailScreen} />
                <Stack.Screen name="PostUpdate" component={RescuePostUpdateScreen} />
              </Stack.Navigator>
            </NavigationContainer>
          </NavigationIndependentTree>
        </RescueOpenCaseFlowProvider>
      </View>
    </Modal>
  );
}

export function RescueOpenCaseModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [caseId, setCaseId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) setCaseId(null);
  }, [visible]);

  if (!visible) return null;

  return (
    <RescueFeedProvider>
      <OpenCaseSheet
        visible={!caseId}
        onClose={onClose}
        onPublished={setCaseId}
      />
      {caseId ? <DetailFlow caseId={caseId} onClose={onClose} /> : null}
    </RescueFeedProvider>
  );
}

const styles = StyleSheet.create({
  detailRoot: { flex: 1 },
  sheetBody: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  actionsHint: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  actionsHintSpacer: { flex: 1 },
});
