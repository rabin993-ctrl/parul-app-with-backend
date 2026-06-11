import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, StyleSheet, Switch, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Button } from '../../components/ui/Button';
import { Toast, ToastData } from '../../components/ui/Toast';
import { SectionHead } from '../../components/ui/SectionHead';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { useCommunityGroups } from '../../context/CommunityGroupsContext';
import { COMMUNITY_TOPIC_OPTIONS } from '../../data/communityPosts';
import type { CommunityStackParamList } from '../../navigation/CommunityNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';

type Route = RouteProp<CommunityStackParamList, 'Admin'>;

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.toggleLabel, { color: colors.text }]}>{label}</Text>
        {hint ? <Text style={[styles.toggleHint, { color: colors.textSecondary }]}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary + '88' }}
        thumbColor="#fff"
      />
    </View>
  );
}

export function CommunityAdminScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { communityId } = useRoute<Route>().params;
  const tabBarPad = useTabBarScrollPadding();
  const { getCommunity, getAdminSettings, updateAdminSettings } = useCommunityGroups();

  const community = getCommunity(communityId);
  const [settings, setSettings] = useState(() => getAdminSettings(communityId));
  const [toast, setToast] = useState<ToastData | null>(null);

  if (!community) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <PawCircleSubHeader title="Manage" onBack={() => navigation.goBack()} />
        <View style={styles.missing}>
          <Text style={{ color: colors.textSecondary }}>Group not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const patch = (p: Partial<typeof settings>) => {
    setSettings(prev => ({ ...prev, ...p }));
  };

  const save = () => {
    updateAdminSettings(communityId, settings);
    setToast({ msg: 'Settings saved', icon: 'check', tone: 'success' });
  };

  const toggleTopic = (id: string) => {
    const enabled = settings.enabledTopics.includes(id);
    const next = enabled
      ? settings.enabledTopics.filter(t => t !== id)
      : [...settings.enabledTopics, id];
    patch({ enabledTopics: next });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="Manage" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: tabBarPad + 80 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.groupTitle, { color: colors.text }]}>{community.name}</Text>
        <Text style={[styles.groupSub, { color: colors.textSecondary }]}>Admin settings</Text>

        <SectionHead title="General" />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Name</Text>
          <TextInput
            value={settings.name}
            onChangeText={v => patch({ name: v })}
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }]}
          />
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>About</Text>
          <TextInput
            value={settings.about}
            onChangeText={v => patch({ about: v })}
            multiline
            style={[styles.input, styles.inputMulti, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }]}
          />
        </View>

        <SectionHead title="Topics & tags" />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
            Adoption posts belong in the Adoption tab — not available here.
          </Text>
          <View style={styles.topicWrap}>
            {COMMUNITY_TOPIC_OPTIONS.map(cat => {
              const on = settings.enabledTopics.includes(cat.id);
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => toggleTopic(cat.id)}
                  style={[
                    styles.topicChip,
                    {
                      backgroundColor: on ? cat.tint + '18' : colors.surface2,
                      borderColor: on ? cat.tint + '44' : colors.border,
                    },
                  ]}
                >
                  <Text style={{ color: on ? cat.tint : colors.textSecondary, fontWeight: '600', fontSize: 12.5 }}>
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <SectionHead title="Rules & posting" />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ToggleRow
            label="Require photo for Lost & Found"
            value={settings.requirePhotoLostFound}
            onChange={v => patch({ requirePhotoLostFound: v })}
          />
          <ToggleRow
            label="Allow links in posts"
            value={settings.allowLinks}
            onChange={v => patch({ allowLinks: v })}
          />
          <ToggleRow
            label="Post approval queue"
            hint="New posts need mod approval before appearing"
            value={settings.postApproval}
            onChange={v => patch({ postApproval: v })}
          />
        </View>

        <SectionHead title="Moderation" />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable style={[styles.linkRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.linkLabel, { color: colors.text }]}>Reported posts</Text>
            <Text style={[styles.linkMeta, { color: colors.textSecondary }]}>0 pending</Text>
          </Pressable>
          <Pressable style={[styles.linkRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.linkLabel, { color: colors.text }]}>Mod action log</Text>
            <Text style={[styles.linkMeta, { color: colors.textSecondary }]}>View history</Text>
          </Pressable>
        </View>

        <SectionHead title="Members & roles" />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Join policy</Text>
          <View style={styles.policyRow}>
            {(['open', 'request', 'invite'] as const).map(p => (
              <Button
                key={p}
                size="sm"
                variant={settings.joinPolicy === p ? 'primary' : 'soft'}
                onPress={() => patch({ joinPolicy: p })}
              >
                {p === 'open' ? 'Open' : p === 'request' ? 'Request' : 'Invite'}
              </Button>
            ))}
          </View>
        </View>

        <SectionHead title="Privacy & visibility" />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ToggleRow
            label="Members-only feed"
            value={settings.membersOnly}
            onChange={v => patch({ membersOnly: v })}
          />
          <ToggleRow
            label="Show location on posts"
            value={settings.showLocation}
            onChange={v => patch({ showLocation: v })}
          />
          <ToggleRow
            label="Discoverable in search"
            value={settings.discoverable}
            onChange={v => patch({ discoverable: v })}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
        <Button full variant="primary" onPress={save}>Save changes</Button>
      </View>

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  groupTitle: { fontSize: 22, fontWeight: '800' },
  groupSub: { fontSize: 13, marginBottom: 16 },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: 14, marginBottom: 8, gap: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  fieldHint: { fontSize: 12.5, lineHeight: 18, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  topicWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  topicChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleLabel: { fontSize: 15, fontWeight: '600' },
  toggleHint: { fontSize: 12, marginTop: 2 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  linkLabel: { fontSize: 15, fontWeight: '600' },
  linkMeta: { fontSize: 13 },
  policyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
