import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/icons/Icon';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import {
  ConsultStatusTracker,
  ConsultStatusBanner,
  VetAssignedCard,
} from '../../components/vet/VetChrome';
import { useVetConsult } from '../../context/VetConsultContext';
import { getVetById } from '../../data/vetData';
import type { VetStackParamList } from '../../navigation/VetNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';

type Route = RouteProp<VetStackParamList, 'Status'>;
type Nav = NativeStackNavigationProp<VetStackParamList, 'Status'>;

export function VetStatusScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { consultId } = useRoute<Route>().params;
  const { getConsult, startSession, cancelConsult } = useVetConsult();
  const tabBarPad = useTabBarScrollPadding();
  const consult = getConsult(consultId);
  const vet = useMemo(() => (consult?.vetId ? getVetById(consult.vetId) : null), [consult?.vetId]);

  if (!consult) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <PawCircleSubHeader title="Consultation status" />
      </SafeAreaView>
    );
  }

  const canStart = consult.status === 'session_ready';
  const needsPayment = consult.status === 'payment_pending' || consult.status === 'payment_failed';
  const isActive = consult.status === 'active';
  const isDone = consult.status === 'completed';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="Consultation status" onBack={() => navigation.navigate('Home')} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}>
        <ConsultStatusTracker status={consult.status} />
        <ConsultStatusBanner status={consult.status} />

        {vet && <VetAssignedCard vet={vet} responseLabel={consult.estimatedResponse} />}

        <View style={[styles.detailCard, { backgroundColor: colors.surface2 }]}>
          <DetailRow label="Pet" value={`${consult.petName} (${consult.petSpecies})`} colors={colors} />
          <DetailRow label="Issue" value={consult.issueLabel} colors={colors} />
          <DetailRow label="Symptoms" value={consult.symptoms} colors={colors} multiline />
          {consult.paidAt && <DetailRow label="Paid" value={`₹${consult.totalFee} · ${consult.paidAt}`} colors={colors} />}
        </View>

        {needsPayment && (
          <Button variant="primary" full onPress={() => navigation.navigate('Payment', { consultId })}>
            {consult.status === 'payment_failed' ? 'Retry payment' : 'Complete payment'}
          </Button>
        )}

        {canStart && (
          <Button variant="primary" full onPress={() => {
            startSession(consultId);
            navigation.navigate('Chat', { consultId });
          }}>
            Start consultation
          </Button>
        )}

        {isActive && (
          <Button variant="primary" full onPress={() => navigation.navigate('Chat', { consultId })}>
            Open chat
          </Button>
        )}

        {isDone && (
          <>
            <Button variant="soft" full onPress={() => navigation.navigate('Receipt', { consultId })}>
              View receipt
            </Button>
            <Button variant="outline" full onPress={() => navigation.navigate('Chat', { consultId })}>
              View chat history
            </Button>
          </>
        )}

        {!isDone && consult.status !== 'cancelled' && (
          <Button
            variant="ghost"
            full
            onPress={() => {
              cancelConsult(consultId);
              navigation.navigate('Home');
            }}
          >
            Cancel consultation
          </Button>
        )}

        {consult.status === 'session_ready' && (
          <View style={[styles.readyNote, { backgroundColor: colors.successBg }]}>
            <Icon name="check-circle" size={18} color={colors.success} />
            <Text style={[styles.readyText, { color: colors.text }]}>
              Payment received. Your vet is ready when you are.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({
  label, value, colors, multiline,
}: {
  label: string; value: string;
  colors: ReturnType<typeof useTheme>['colors'];
  multiline?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={multiline ? 4 : 2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 14 },
  detailCard: { padding: 14, borderRadius: 12, gap: 10 },
  detailRow: { gap: 3 },
  detailLabel: { fontSize: 11, fontWeight: '700' },
  detailValue: { fontSize: 13.5, lineHeight: 19 },
  readyNote: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  readyText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
