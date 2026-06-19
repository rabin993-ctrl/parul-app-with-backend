import { useCallback, useEffect } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeHubTab, HomeSectionTab } from '../components/ui/HomeHubDropdown';
import { registerFeedHubNavigation, useHomeHub } from '../context/HomeHubContext';
import type { FeedStackParamList } from '../navigation/feedHubNavigation';
import { feedHubScreenForSection } from '../navigation/feedHubNavigation';

export function useFeedHubNavigationSync(activeHub: HomeHubTab) {
  const navigation = useNavigation<NativeStackNavigationProp<FeedStackParamList>>();
  const { setHomeTab } = useHomeHub();

  useEffect(() => {
    registerFeedHubNavigation({
      resetToFeed: () => navigation.navigate('FeedHome'),
      selectSection: (tab: HomeSectionTab) => {
        navigation.navigate(feedHubScreenForSection(tab));
      },
    });
    return () => registerFeedHubNavigation(null);
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      setHomeTab(activeHub);
    }, [activeHub, setHomeTab]),
  );
}
