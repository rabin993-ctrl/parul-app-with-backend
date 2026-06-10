import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../../components/ui/Button';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { VetAssignedCard, FeeBreakdownCard, ConsultStatusTracker } from '../../components/vet/VetChrome';
import { useVetConsult } from '../../context/VetConsultContext';
import { getVetById } from '../../data/vetData';
import type { VetStackParamList } from '../../navigation/VetNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';

type Route = RouteProp<VetStackParamList, 'Assigned'>;
type Nav = NativeStackNavigationProp<VetStackParamList, 'Assigned'>;

export function VetAssignedScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { consultId } = useRoute<Route>().params;
  const { getConsult, cancelConsult } = useVetConsult();
  const tabBarPad = useTabBarScrollPadding();
  const consult = getConsult(consultId);
  const vet = useMemo(() => (consult?.vetId ? getVetById(consult.vetId) : null), [consult?.vetId]);

  if (!consult || !vet) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <PawCircleSubHeader title="Vet assigned" />
        <View style={styles.center}><Text style={{ color: colors.textSecondary }}>Loading…</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="Vet assigned" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}>
        <ConsultStatusTracker status="payment_pending" />

        <Text style={[styles.title, { color: colors.text }]}>Your vet is ready</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          Review details and pay in advance to start the consultation with {vet.name}.
        </Text>

        <VetAssignedCard vet={vet} responseLabel={consult.estimatedResponse} />

        <View style={styles.summary}>
          <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Pet</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{consult.petName} · {consult.issueLabel}</Text>
        </View>

        <FeeBreakdownCard
          consultFee={consult.consultFee}
          platformFee={consult.platformFee}
          total={consult.totalFee}
        />

        <Button
          variant="primary"
          full
          onPress={() => navigation.navigate('Payment', { consultId })}
          style={{ marginTop: 8 }}
        >
          Pay ₹{consult.totalFee} & continue
        </Button>

        <Button
          variant="ghost"
          full
          onPress={() => {
            cancelConsult(consultId);
            navigation.navigate('Home');
          }}
        >
          Cancel request
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 14 },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  sub: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 4 },
  summary: { gap: 4 },
  summaryLabel: { fontSize: 11.5, fontWeight: '700' },
  summaryValue: { fontSize: 14, fontWeight: '600' },
});
