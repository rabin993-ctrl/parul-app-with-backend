import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Icon } from '../../components/icons/Icon';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { ISSUE_CATEGORIES } from '../../data/vetData';
import type { VetStackParamList } from '../../navigation/VetNavigator';

type Nav = NativeStackNavigationProp<VetStackParamList, 'UrgentIssue'>;

export function VetUrgentIssueScreen() {
  const { colors, iconBg } = useTheme();
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="What's happening?" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          Select the closest issue type so we can match the right vet quickly.
        </Text>

        <View style={styles.grid}>
          {ISSUE_CATEGORIES.map(cat => (
            <Pressable
              key={cat.id}
              onPress={() => navigation.navigate('UrgentPet', { issueId: cat.id })}
              style={({ pressed }) => [
                styles.issueCard,
                { backgroundColor: iconBg(cat.bg), borderColor: cat.tint + '33', opacity: pressed ? 0.88 : 1 },
              ]}
            >
              <View style={[styles.issueIcon, { backgroundColor: cat.tint + '22' }]}>
                <Icon name={cat.icon} size={20} color={cat.tint} />
              </View>
              <Text style={[styles.issueLabel, { color: colors.text }]}>{cat.label}</Text>
              {cat.urgent && (
                <Text style={[styles.urgentTag, { color: cat.tint }]}>Priority</Text>
              )}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32 },
  sub: { fontSize: 14, lineHeight: 21, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  issueCard: {
    width: '47%',
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 8,
    minHeight: 110,
  },
  issueIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  issueLabel: { fontSize: 14, fontWeight: '700' },
  urgentTag: { fontSize: 11, fontWeight: '700' },
});
