import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { AppCenteredHeader, HUB_CENTERED_TITLE_STYLE } from '../components/ui/AppSubHeader';
import { RescueNavigator } from '../navigation/RescueNavigator';
import { RescueHubBar, RescueFilterField } from '../components/rescue/RescueChrome';
import { DEFAULT_RESCUE_FILTERS, type RescueFilters, type RescueHubTab } from '../data/rescueData';
import { useFeedHubNavigationSync } from '../hooks/useFeedHubNavigationSync';
import type { FeedStackParamList } from '../navigation/feedHubNavigation';

export function RescueHubScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<FeedStackParamList>>();
  const [rescueHubTab, setRescueHubTab] = useState<RescueHubTab>('browse');
  const [rescueFilters, setRescueFilters] = useState<RescueFilters>(DEFAULT_RESCUE_FILTERS);

  useFeedHubNavigationSync('rescue');

  const handleBack = useCallback(() => {
    navigation.navigate('FeedHome');
  }, [navigation]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <AppCenteredHeader
        title="Rescues"
        onBack={handleBack}
        backAccessibilityLabel="Back to feed from Rescues"
        titleStyle={HUB_CENTERED_TITLE_STYLE}
      />

      <View style={styles.homeChrome}>
        <View style={[styles.subHubChrome, { backgroundColor: colors.bg }]}>
          <RescueHubBar tab={rescueHubTab} onTabChange={setRescueHubTab} />
          {rescueHubTab === 'browse' && (
            <RescueFilterField
              filters={rescueFilters}
              onChange={setRescueFilters}
              onReset={() => setRescueFilters(DEFAULT_RESCUE_FILTERS)}
            />
          )}
        </View>
      </View>

      <View style={styles.hubContent}>
        <RescueNavigator
          embedded
          hubTab={rescueHubTab}
          onHubTabChange={setRescueHubTab}
          hubBarPinned
          filters={rescueFilters}
          onFiltersChange={setRescueFilters}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  hubContent: { flex: 1, minHeight: 0 },
  homeChrome: {
    flexShrink: 0,
  },
  subHubChrome: {
    flexShrink: 0,
    paddingTop: 0,
  },
});
