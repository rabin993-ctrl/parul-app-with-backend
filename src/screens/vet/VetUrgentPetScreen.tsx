import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { CompanionAvatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/icons/Icon';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { getIssueById } from '../../data/vetData';
import { useCompanions } from '../../context/CompanionContext';
import { useAuth } from '../../context/AuthContext';
import type { VetStackParamList } from '../../navigation/VetNavigator';

type Route = RouteProp<VetStackParamList, 'UrgentPet'>;
type Nav = NativeStackNavigationProp<VetStackParamList, 'UrgentPet'>;

export function VetUrgentPetScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { issueId } = useRoute<Route>().params;
  const issue = getIssueById(issueId);
  const { user } = useAuth();
  const { getMyCompanions } = useCompanions();
  const myPets = useMemo(
    () => (user ? getMyCompanions(user.id) : []),
    [user, getMyCompanions],
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="Select pet" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          Who needs help with {issue?.label.toLowerCase() ?? 'this issue'}?
        </Text>

        <View style={{ gap: 10 }}>
          {myPets.map(pet => (
            <Pressable
              key={pet.id}
              onPress={() => navigation.navigate('UrgentDetails', { issueId, petId: pet.id })}
              style={({ pressed }) => [
                styles.petCard,
                { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <CompanionAvatar companion={pet} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.petName, { color: colors.text }]}>{pet.name}</Text>
                <Text style={[styles.petMeta, { color: colors.textSecondary }]}>
                  {pet.breed} · {pet.age} · {pet.gender}
                </Text>
              </View>
              <Icon name="chevronRight" size={16} color={colors.textTertiary} />
            </Pressable>
          ))}
        </View>

        <Button
          variant="soft"
          icon="plus"
          onPress={() => navigation.navigate('UrgentDetails', { issueId, petId: 'custom' })}
          style={{ marginTop: 8 }}
        >
          Add another pet
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32 },
  sub: { fontSize: 14, lineHeight: 21, marginBottom: 14 },
  petCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  petName: { fontSize: 16, fontWeight: '700' },
  petMeta: { fontSize: 12.5, marginTop: 2 },
});
