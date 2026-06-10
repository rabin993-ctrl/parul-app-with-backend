import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Icon } from '../../components/icons/Icon';
import { useVetConsult } from '../../context/VetConsultContext';
import type { VetStackParamList } from '../../navigation/VetNavigator';

type Route = RouteProp<VetStackParamList, 'Matching'>;
type Nav = NativeStackNavigationProp<VetStackParamList, 'Matching'>;

export function VetMatchingScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { consultId } = useRoute<Route>().params;
  const { assignVet, getConsult } = useVetConsult();
  const consult = getConsult(consultId);

  const pulse = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true }),
    ).start();
  }, [pulse, spin]);

  useEffect(() => {
    const t = setTimeout(() => {
      assignVet(consultId);
      navigation.replace('Assigned', { consultId });
    }, 2800);
    return () => clearTimeout(t);
  }, [assignVet, consultId, navigation]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.radarWrap}>
          <Animated.View style={[styles.pulseRing, { borderColor: colors.primary, opacity, transform: [{ scale }] }]} />
          <Animated.View style={[styles.radar, { backgroundColor: colors.primary + '14', transform: [{ rotate }] }]}>
            <View style={[styles.radarInner, { backgroundColor: colors.primary + '22' }]}>
              <Icon name="medical" size={32} color={colors.primary} />
            </View>
          </Animated.View>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Finding available vet…</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Matching {consult?.petName ?? 'your pet'} with a licensed vet nearby. This usually takes under a minute.
        </Text>

        <View style={[styles.hint, { backgroundColor: colors.surface2 }]}>
          <View style={[styles.dot, { backgroundColor: colors.success }]} />
          <Text style={[styles.hintText, { color: colors.textSecondary }]}>3 vets online in your area</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 },
  radarWrap: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
  },
  radar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 300 },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.full,
    marginTop: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  hintText: { fontSize: 13, fontWeight: '600' },
});
