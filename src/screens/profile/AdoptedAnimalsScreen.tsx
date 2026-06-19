import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { ProfileSubHeader } from '../../components/profile/ProfileChrome';
import { AdoptedRecordsPanel } from '../../components/adoption/AdoptedRecordsPanel';
import type { ProfileStackParamList } from '../../navigation/ProfileNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { navigateToAdoptionListingFromNested } from '../../navigation/adoptionListingRouting';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'Adopted'>;

export function AdoptedAnimalsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader title="Adopted" />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
      >
        <AdoptedRecordsPanel
          userId={user!.id}
          onOpenRecord={id => navigation.navigate('AdoptedDetail', { recordId: id })}
          onOpenListing={id => navigateToAdoptionListingFromNested(navigation, id)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 4 },
});
