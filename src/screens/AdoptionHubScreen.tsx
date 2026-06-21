import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { AppCenteredHeader, HUB_CENTERED_TITLE_STYLE } from '../components/ui/AppSubHeader';
import { AdoptionNavigator, type AdoptionStackParamList } from '../navigation/AdoptionNavigator';
import {
  AdoptionHubBar,
  type AdoptionBrowseFilter,
  type AdoptionHubTab,
} from '../components/adoption/AdoptionChrome';
import { isActiveAdoptionRequest, useAdoptionFeed } from '../context/AdoptionFeedContext';
import { useFeedHubNavigationSync } from '../hooks/useFeedHubNavigationSync';
import type { FeedStackParamList } from '../navigation/feedHubNavigation';

export function AdoptionHubScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<FeedStackParamList>>();
  const [adoptionHubTab, setAdoptionHubTab] = useState<AdoptionHubTab>('discover');
  const [adoptionBrowseFilter, setAdoptionBrowseFilter] = useState<AdoptionBrowseFilter>('all');
  const [adoptionFocusedRoute, setAdoptionFocusedRoute] = useState<keyof AdoptionStackParamList>('Listing');
  const showHubChrome = adoptionFocusedRoute === 'Listing';
  const { getMyOutgoingRequests } = useAdoptionFeed();
  const adoptionRequestedCount = getMyOutgoingRequests().filter(isActiveAdoptionRequest).length;

  useFeedHubNavigationSync('adoption');

  const handleBack = useCallback(() => {
    navigation.navigate('FeedHome');
  }, [navigation]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {showHubChrome ? (
        <AppCenteredHeader
          title="Adoption"
          onBack={handleBack}
          backAccessibilityLabel="Back to feed from Adoption"
          titleStyle={HUB_CENTERED_TITLE_STYLE}
        />
      ) : null}

      {showHubChrome ? (
        <View style={styles.homeChrome}>
          <View style={[styles.subHubChrome, { backgroundColor: colors.bg }]}>
            <AdoptionHubBar
              tab={adoptionHubTab}
              onTabChange={setAdoptionHubTab}
              browseFilter={adoptionBrowseFilter}
              onBrowseFilterChange={setAdoptionBrowseFilter}
              requestedCount={adoptionRequestedCount}
            />
          </View>
        </View>
      ) : null}

      <View style={styles.hubContent}>
        <AdoptionNavigator
          embedded
          hubTab={adoptionHubTab}
          onHubTabChange={setAdoptionHubTab}
          hubBarPinned
          browseFilter={adoptionBrowseFilter}
          onBrowseFilterChange={setAdoptionBrowseFilter}
          onFocusedRouteChange={setAdoptionFocusedRoute}
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
