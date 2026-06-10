import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/icons/Icon';
import { Toast, ToastData } from '../../components/ui/Toast';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { FeeBreakdownCard, ConsultStatusBanner } from '../../components/vet/VetChrome';
import { useVetConsult } from '../../context/VetConsultContext';
import { getVetById, PaymentMethod } from '../../data/vetData';
import type { VetStackParamList } from '../../navigation/VetNavigator';

type Route = RouteProp<VetStackParamList, 'Payment'>;
type Nav = NativeStackNavigationProp<VetStackParamList, 'Payment'>;

const METHODS: { id: PaymentMethod; label: string; icon: string }[] = [
  { id: 'upi', label: 'UPI', icon: 'send' },
  { id: 'card', label: 'Card', icon: 'shield' },
  { id: 'wallet', label: 'Parul Wallet', icon: 'paw' },
];

export function VetPaymentScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { consultId } = useRoute<Route>().params;
  const { getConsult, processPayment, retryPayment } = useVetConsult();
  const consult = getConsult(consultId);
  const vet = useMemo(() => (consult?.vetId ? getVetById(consult.vetId) : null), [consult?.vetId]);

  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  if (!consult) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <PawCircleSubHeader title="Payment" />
      </SafeAreaView>
    );
  }

  const failed = consult.status === 'payment_failed';

  const pay = async (simulateFail = false) => {
    setLoading(true);
    const ok = await processPayment(consultId, method, simulateFail);
    setLoading(false);
    if (ok) {
      navigation.replace('Status', { consultId });
    } else {
      setToast({ msg: 'Payment could not be processed', icon: 'alert', tone: 'danger' });
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="Advance payment" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <ConsultStatusBanner status={failed ? 'payment_failed' : 'payment_pending'} />

        <Text style={[styles.title, { color: colors.text }]}>
          Pay before your session starts
        </Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          {vet?.name ?? 'Your vet'} · {consult.petName} · {consult.issueLabel}
        </Text>

        <FeeBreakdownCard
          consultFee={consult.consultFee}
          platformFee={consult.platformFee}
          total={consult.totalFee}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Payment method</Text>
        <View style={{ gap: 8 }}>
          {METHODS.map(m => (
            <Pressable
              key={m.id}
              onPress={() => setMethod(m.id)}
              style={[styles.methodRow, {
                backgroundColor: method === m.id ? colors.primary + '10' : colors.surface,
                borderColor: method === m.id ? colors.primary + '44' : colors.border,
              }]}
            >
              <Icon name={m.icon} size={18} color={method === m.id ? colors.primary : colors.textSecondary} />
              <Text style={[styles.methodLabel, { color: colors.text }]}>{m.label}</Text>
              {method === m.id && <Icon name="check-circle" size={18} color={colors.primary} />}
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Processing secure payment…</Text>
          </View>
        ) : (
          <>
            <Button variant="primary" full onPress={() => pay(false)} style={{ marginTop: 16 }}>
              Confirm payment · ₹{consult.totalFee}
            </Button>
            {failed && (
              <Button variant="soft" full onPress={() => { retryPayment(consultId); pay(false); }}>
                Retry payment
              </Button>
            )}
            <Button variant="ghost" full onPress={() => pay(true)}>
              Simulate failed payment
            </Button>
          </>
        )}
      </ScrollView>

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 12, paddingBottom: 32 },
  title: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  sub: { fontSize: 13, textAlign: 'center', marginBottom: 4 },
  label: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  methodLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  loadingBox: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  loadingText: { fontSize: 14 },
});
