import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/tokens';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/icons/Icon';
import { HubToggleBar } from '../../components/ui/HubToggleBar';
import { Toast, ToastData } from '../../components/ui/Toast';
import { usePawCircles } from '../../context/PawCircleContext';
import { CirclePrivacy } from '../../data/pawCircles';
import type { CirclesStackParamList } from '../../navigation/CirclesNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { getCircleMembers } from '../../data/pawCircleChat';
import { users } from '../../data/mockData';
import { CircleHeroCard, EditCircleSheet } from './CircleHeroCard';
import {
  PawCircleHairline,
  PawCirclePageHeader,
  PawCircleSectionLabel,
  pawCircleStyles,
} from './PawCircleChrome';

type Route = RouteProp<CirclesStackParamList, 'CircleAdmin'>;
type Nav = NativeStackNavigationProp<CirclesStackParamList, 'CircleAdmin'>;

const AVATAR_INSET = 68;

const PRIVACY_OPTIONS = [
  { id: 'open' as const, label: 'Open' },
  { id: 'request' as const, label: 'Request' },
];

function SettingsGroup({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

export function CircleAdminScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { circleId } = route.params;
  const { getCircle, createdCircles, updateCircle } = usePawCircles();
  const circle = getCircle(circleId);
  const [name, setName] = useState(circle?.name ?? '');
  const [location, setLocation] = useState(circle?.location ?? '');
  const [privacy, setPrivacy] = useState<CirclePrivacy>(circle?.privacy ?? 'open');
  const [members, setMembers] = useState(() => getCircleMembers(circleId, circle));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const tabBarPad = useTabBarScrollPadding();

  const isOwner = createdCircles.some(c => c.id === circleId);

  if (!circle || !isOwner) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <PawCirclePageHeader title="Admin controls" />
        <Text style={{ padding: spacing.lg, color: colors.textSecondary }}>
          Admin access only for circle creators.
        </Text>
      </SafeAreaView>
    );
  }

  const displayBio = circle.bio ?? circle.tagline ?? '';
  const removableMembers = members.filter(m => m.userId !== 'you');

  const saveDetails = () => {
    setToast({ msg: 'Circle settings saved', icon: 'check', tone: 'success' });
  };

  const saveEdit = async (editName: string, bio: string) => {
    if (!editName.trim()) return;
    setSavingEdit(true);
    await updateCircle(circleId, { name: editName, bio });
    setName(editName);
    setSavingEdit(false);
    setEditOpen(false);
    setToast({ msg: 'Circle updated', icon: 'check', tone: 'success' });
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setToast({ msg: 'Circle deleted', icon: 'check', tone: 'neutral' });
    navigation.navigate('Hub');
  };

  return (
    <>
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <PawCirclePageHeader title="Admin controls" />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[pawCircleStyles.detailScroll, { paddingBottom: tabBarPad }]}
        >
          <CircleHeroCard
            circle={circle}
            bio={displayBio}
            role="You created this circle"
            canEdit
            onEdit={() => setEditOpen(true)}
          />

          <View>
            <PawCircleSectionLabel>Circle details</PawCircleSectionLabel>
            <View style={styles.formGroup}>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  style={[styles.fieldInput, { color: colors.text, borderBottomColor: colors.border }]}
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              <PawCircleHairline />
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Location</Text>
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  style={[styles.fieldInput, { color: colors.text, borderBottomColor: colors.border }]}
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              <PawCircleHairline />
              <View style={styles.privacyField}>
                <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Privacy</Text>
                <HubToggleBar
                  items={PRIVACY_OPTIONS}
                  value={privacy}
                  onChange={id => setPrivacy(id as CirclePrivacy)}
                  bordered={false}
                  style={styles.privacyToggle}
                />
              </View>
            </View>
            <Button variant="primary" full onPress={saveDetails} style={styles.saveBtn}>
              Save changes
            </Button>
          </View>

          {removableMembers.length > 0 && (
            <View>
              <PawCircleSectionLabel>Remove members</PawCircleSectionLabel>
              <View style={styles.listGroup}>
                {removableMembers.map((m, index) => {
                  const u = users[m.userId];
                  if (!u) return null;
                  return (
                    <View key={m.userId}>
                      <View style={styles.memberRow}>
                        <Avatar user={u} size={36} />
                        <View style={styles.rowBody}>
                          <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
                            {u.name}
                          </Text>
                          <Text style={[styles.rowMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                            @{u.handle}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => {
                            setMembers(ms => ms.filter(x => x.userId !== m.userId));
                            setToast({ msg: `Removed ${u.name}`, icon: 'check', tone: 'neutral' });
                          }}
                          style={({ pressed }) => [styles.removeBtn, pressed && styles.rowPressed]}
                        >
                          <Text style={[styles.removeBtnText, { color: colors.lost }]}>Remove</Text>
                        </Pressable>
                      </View>
                      {index < removableMembers.length - 1 && (
                        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          <SettingsGroup>
            <Pressable
              onPress={() => setToast({ msg: 'Transfer ownership — coming soon', icon: 'circles', tone: 'neutral' })}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <Icon name="circles" size={22} color={colors.textSecondary} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Transfer ownership</Text>
              <Icon name="chevronRight" size={16} color={colors.textTertiary} />
            </Pressable>
          </SettingsGroup>

          <SettingsGroup>
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [styles.destructiveRow, pressed && styles.rowPressed]}
            >
              <Text style={[styles.destructiveLabel, { color: colors.lost }]}>
                {confirmDelete ? 'Tap again to delete circle permanently' : 'Delete circle'}
              </Text>
            </Pressable>
          </SettingsGroup>
        </ScrollView>
      </SafeAreaView>

      <EditCircleSheet
        visible={editOpen}
        circle={circle}
        onClose={() => setEditOpen(false)}
        onSave={saveEdit}
        saving={savingEdit}
      />

      <Toast data={toast} onHide={() => setToast(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  group: { gap: 0 },
  listGroup: { gap: 0 },
  formGroup: {
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  field: { gap: 8 },
  privacyField: { gap: 10, paddingTop: 4 },
  privacyToggle: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  fieldInput: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 0,
    paddingVertical: 11,
    fontSize: 16,
    fontWeight: '500',
  },
  saveBtn: { marginTop: 12 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    minHeight: 60,
  },
  rowBody: { flex: 1, gap: 2, minWidth: 0 },
  rowName: { fontSize: 16, fontWeight: '500', letterSpacing: -0.2 },
  rowMeta: { fontSize: 13 },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: AVATAR_INSET,
  },
  rowPressed: { opacity: 0.55 },
  removeBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  removeBtnText: { fontSize: 14, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    minHeight: 52,
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  destructiveRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    minHeight: 52,
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  destructiveLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
