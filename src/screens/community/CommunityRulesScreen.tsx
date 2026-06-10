import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Icon } from '../../components/icons/Icon';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { COMMUNITY_RULES } from '../../data/communityPosts';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';

export function CommunityRulesScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const tabBarPad = useTabBarScrollPadding();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="Guidelines" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}>
        <View style={[styles.hero, { backgroundColor: colors.primary + '12' }]}>
          <Icon name="shield" size={28} color={colors.primary} />
          <Text style={[styles.heroTitle, { color: colors.text }]}>A warm space for pet people</Text>
          <Text style={[styles.heroBody, { color: colors.textSecondary }]}>
            These guidelines keep discussions helpful, safe, and focused on animal welfare.
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          {COMMUNITY_RULES.map((rule, i) => (
            <View
              key={i}
              style={[styles.ruleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={[styles.ruleNum, { backgroundColor: colors.surface2 }]}>
                <Text style={[styles.ruleNumText, { color: colors.primary }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.ruleText, { color: colors.text }]}>{rule}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 16 },
  hero: {
    padding: 18,
    borderRadius: radius.lg,
    alignItems: 'center',
    gap: 8,
  },
  heroTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  heroBody: { fontSize: 13.5, lineHeight: 20, textAlign: 'center' },
  ruleRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  ruleNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleNumText: { fontSize: 13, fontWeight: '800' },
  ruleText: { flex: 1, fontSize: 14, lineHeight: 21 },
});
