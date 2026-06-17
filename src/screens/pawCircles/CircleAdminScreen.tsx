import { useEffect } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CirclesStackParamList } from '../../navigation/CirclesNavigator';

type Route = RouteProp<CirclesStackParamList, 'CircleAdmin'>;
type Nav = NativeStackNavigationProp<CirclesStackParamList, 'CircleAdmin'>;

/** Legacy route — admin controls now live on Circle settings. */
export function CircleAdminScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { circleId } = route.params;

  useEffect(() => {
    navigation.replace('CircleSettings', { circleId });
  }, [navigation, circleId]);

  return null;
}
