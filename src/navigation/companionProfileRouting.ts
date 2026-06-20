import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from './ProfileNavigator';

type TabNavigation = {
  navigate: (name: string, params?: object) => void;
};

type NestedNavigation = TabNavigation & {
  getParent?: () => TabNavigation | undefined;
};

/** Pop companion screen or fall back to profile home when stack has no history. */
export function closeCompanionScreen(
  navigation: NativeStackNavigationProp<ProfileStackParamList>,
) {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }
  navigation.navigate('Home');
}

export type CompanionPostDetailParams = {
  postId: string;
  companionId: string;
};

export type CompanionEditParams = {
  companionId: string;
};

/** Open companion post detail on the Profile stack from any tab navigator. */
export function navigateToCompanionPostDetail(
  navigation: TabNavigation,
  params: CompanionPostDetailParams,
) {
  navigation.navigate('Profile', {
    screen: 'CompanionPostDetail',
    params,
  });
}

/** Same as {@link navigateToCompanionPostDetail} from a nested stack. */
export function navigateToCompanionPostDetailFromNested(
  navigation: NestedNavigation,
  params: CompanionPostDetailParams,
) {
  const tabNav = navigation.getParent?.() ?? navigation;
  navigateToCompanionPostDetail(tabNav, params);
}

/** Open companion edit profile on the Profile stack from any tab navigator. */
export function navigateToCompanionEdit(
  navigation: TabNavigation,
  params: CompanionEditParams,
) {
  navigation.navigate('Profile', {
    screen: 'CompanionEdit',
    params,
  });
}

/** Same as {@link navigateToCompanionEdit} from a nested stack. */
export function navigateToCompanionEditFromNested(
  navigation: NestedNavigation,
  params: CompanionEditParams,
) {
  const tabNav = navigation.getParent?.() ?? navigation;
  navigateToCompanionEdit(tabNav, params);
}
