import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { Empty } from '../../components/ui/Empty';
import { ProfileSubHeader, ProfileAdoptedGrid } from '../../components/profile/ProfileChrome';
import { getAdopterTrustSummary } from '../../data/adoptionRecords';
import { PostHomeUpdateSheet } from '../../components/adoption/AdoptionUpdateUI';
import { useAdoption } from '../../context/AdoptionContext';
import { getActivePrompt } from '../../utils/adoptionUpdateSchedule';
import type { ProfileStackParamList } from '../../navigation/ProfileNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'Adopted'>;

export function AdoptedAnimalsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const { records, getPromptsForUser, submitAdopterUpdate } = useAdoption();
  const [updateSheetRecordId, setUpdateSheetRecordId] = useState<string | null>(null);

  const items = useMemo(
    () => records.filter(
      r => r.adopterId === 'you' && (r.status === 'confirmed' || r.status === 'update_due'),
    ),
    [records],
  );
  const trust = useMemo(() => getAdopterTrustSummary(records, 'you'), [records]);
  const updatePrompts = useMemo(() => getPromptsForUser('you'), [getPromptsForUser]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader title="Adopted" />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
      >
        {items.length === 0 ? (
          <Empty icon="heart" title="No adopted companions" body="Confirmed adoptions you take in will appear here." />
        ) : (
          <ProfileAdoptedGrid
            records={items}
            adopterTrust={trust}
            updatePrompts={updatePrompts}
            onPostUpdate={setUpdateSheetRecordId}
            onOpen={id => navigation.navigate('AdoptedDetail', { recordId: id })}
          />
        )}
      </ScrollView>

      {updateSheetRecordId && (() => {
        const record = records.find(r => r.id === updateSheetRecordId);
        const active = record ? getActivePrompt(record) : null;
        if (!record || !active) return null;
        return (
          <PostHomeUpdateSheet
            visible
            onClose={() => setUpdateSheetRecordId(null)}
            record={record}
            milestoneLabel={active.milestone.label}
            promptText={active.milestone.prompt}
            onSubmit={payload => {
              submitAdopterUpdate(record.id, payload);
              setUpdateSheetRecordId(null);
            }}
          />
        );
      })()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 4 },
});
