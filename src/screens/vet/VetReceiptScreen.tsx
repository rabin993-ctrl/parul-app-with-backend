import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/icons/Icon';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { FeeBreakdownCard } from '../../components/vet/VetChrome';
import { useVetConsult } from '../../context/VetConsultContext';
import { getVetById } from '../../data/vetData';
import type { VetStackParamList } from '../../navigation/VetNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';

type Route = RouteProp<VetStackParamList, 'Receipt'>;
type Nav = NativeStackNavigationProp<VetStackParamList, 'Receipt'>;

export function VetReceiptScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { consultId } = useRoute<Route>().params;
  const { getConsult } = useVetConsult();
  const tabBarPad = useTabBarScrollPadding();
  const consult = getConsult(consultId);
  const vet = useMemo(() => (consult?.vetId ? getVetById(consult.vetId) : null), [consult?.vetId]);

  if (!consult) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <PawCircleSubHeader title="Receipt" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="Payment receipt" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}>
        <View style={[styles.successIcon, { backgroundColor: colors.successBg }]}>
          <Icon name="check-circle" size={40} color={colors.success} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Payment successful</Text>
        {consult.receiptId && (
          <Text style={[styles.receiptId, { color: colors.textTertiary }]}>Receipt {consult.receiptId}</Text>
        )}

        <FeeBreakdownCard
          consultFee={consult.consultFee}
          platformFee={consult.platformFee}
          total={consult.totalFee}
        />

        <View style={[styles.metaCard, { backgroundColor: colors.surface2 }]}>
          <MetaLine label="Vet" value={vet?.name ?? consult.vetName ?? '—'} colors={colors} />
          <MetaLine label="Pet" value={consult.petName} colors={colors} />
          <MetaLine label="Issue" value={consult.issueLabel} colors={colors} />
          <MetaLine label="Paid via" value={consult.paymentMethod?.toUpperCase() ?? '—'} colors={colors} />
          <MetaLine label="Date" value={consult.paidAt ?? consult.createdAt} colors={colors} />
        </View>

        <Button variant="primary" full onPress={() => navigation.navigate('Chat', { consultId })}>
          View consultation
        </Button>
        <Button variant="soft" full onPress={() => navigation.navigate('Home')}>
          Back to Vet home
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetaLine({ label, value, colors }: {
  label: string; value: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.metaLine}>
      <Text style={[styles.metaLabel, { color: colors.textTertiary }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 14, alignItems: 'center' },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  title: { fontSize: 22, fontWeight: '800' },
  receiptId: { fontSize: 13, marginBottom: 4 },
  metaCard: { width: '100%', padding: 14, borderRadius: radius.lg, gap: 10 },
  metaLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  metaLabel: { fontSize: 12.5, fontWeight: '600' },
  metaValue: { fontSize: 13.5, fontWeight: '700', flex: 1, textAlign: 'right' },
});
