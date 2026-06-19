import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, Image, TextInput, Modal, StyleSheet, ScrollView, Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows, sheetLayout } from '../../theme/tokens';
import { webNoOutline } from '../../theme/webInput';
import { Avatar, CompanionAvatar } from '../ui/Avatar';
import { Button, IconButton } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { ModalPresent } from '../ui/ModalScrim';
import { useMediaPicker } from '../../hooks/useMediaPicker';
import { Icon } from '../icons/Icon';
import { ToastData } from '../ui/Toast';
import { useCommunityFeed } from '../../context/CommunityFeedContext';
import { useCommunityGroups } from '../../context/CommunityGroupsContext';
import {
  CommunityComposerLabel,
  categoryToComposerLabel,
  buildCommunityPostFromComposer,
} from '../../data/communityPosts';
import type { CommunityCategory } from '../../data/communityPosts';
import type { Community } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import { useCompanions } from '../../context/CompanionContext';
import { loadDefaultCompanionId, resolveDefaultCompanionId } from '../../lib/defaultCompanionStore';
import {
  type GroupPostDestination,
  toggleGroupDestination,
  formatGroupDestinationsLabel,
  splitComposerText,
} from '../../utils/composerDestinations';

function composerPlaceholder(label: CommunityComposerLabel): string {
  switch (label) {
    case 'lost':
      return 'Describe your lost pet — breed, collar, temperament, anything that helps…';
    case 'found':
      return 'Share what you found and how people can help…';
    case 'rescue':
      return 'Share rescue details, needs, or how others can help…';
    case 'meme':
      return 'Drop your meme text here…';
    default:
      return 'What are your companions up to?';
  }
}

function GroupDestinationModal({
  visible,
  selected,
  groups,
  onClose,
  onApply,
}: {
  visible: boolean;
  selected: GroupPostDestination[];
  groups: Community[];
  onClose: () => void;
  onApply: (dests: GroupPostDestination[]) => void;
}) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState<GroupPostDestination[]>(selected);

  useEffect(() => {
    if (visible) setDraft(selected);
  }, [visible, selected]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <ModalPresent onDismiss={onClose} style={styles.popupOverlay} animatedScale={false}>
        <View style={[styles.destModalCard, { backgroundColor: colors.surface }, shadows.md]}>
          <Text style={[styles.destModalTitle, { color: colors.text }]}>Post to</Text>
          <Text style={[styles.destModalSub, { color: colors.textSecondary }]}>
            Select one or more groups
          </Text>
          <ScrollView style={styles.destList} showsVerticalScrollIndicator={false}>
            {groups.map(g => {
              const on = draft.some(d => d.id === g.id);
              const dest = { id: g.id, label: g.name, icon: g.icon, tint: g.tint };
              return (
                <View key={g.id}>
                  <Pressable
                    onPress={() => setDraft(prev => toggleGroupDestination(prev, dest))}
                    style={({ pressed }) => [styles.destOption, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <View style={[styles.destOptionIcon, { backgroundColor: g.tint + '18' }]}>
                      <Icon name={g.icon} size={16} color={g.tint} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={[
                          styles.destOptionTitle,
                          { color: on ? g.tint : colors.text, fontWeight: on ? '700' : '600' },
                        ]}
                        numberOfLines={1}
                      >
                        {g.name}
                      </Text>
                      <Text style={[styles.destOptionSub, { color: colors.textTertiary }]} numberOfLines={1}>
                        {g.members} members
                      </Text>
                    </View>
                    {on && <Icon name="check" size={16} color={g.tint} />}
                  </Pressable>
                  <View style={[styles.destDivider, { backgroundColor: colors.border }]} />
                </View>
              );
            })}
          </ScrollView>
          <Button variant="primary" onPress={() => { onApply(draft); onClose(); }} style={{ marginTop: 8 }}>
            Done
          </Button>
        </View>
      </ModalPresent>
    </Modal>
  );
}

export type CommunityComposerOptions = {
  initialLabel?: CommunityComposerLabel;
  /** @deprecated prefer initialLabel */
  initialCategory?: CommunityCategory;
  initialGroupId?: string;
};

export function CommunityComposer({
  visible,
  options,
  onClose,
  onToast,
}: {
  visible: boolean;
  options: CommunityComposerOptions;
  onClose: () => void;
  onToast: (t: ToastData) => void;
}) {
  const { colors } = useTheme();
  const { addPost } = useCommunityFeed();
  const { joinedCommunities } = useCommunityGroups();
  const { user } = useAuth();
  const { getMyCompanions, getCompanion } = useCompanions();
  const meUser = { id: user?.id, name: user?.email?.split('@')[0] ?? 'Me', tint: '#F2972E' };

  const [text, setText] = useState('');
  const [companionIds, setCompanionIds] = useState<string[]>([]);
  const [label, setLabel] = useState<CommunityComposerLabel>('discussion');
  const [alertArea, setAlertArea] = useState('');
  const [alertWhen, setAlertWhen] = useState('');
  const [alertContact, setAlertContact] = useState('');
  const [foundLooksLike, setFoundLooksLike] = useState('');
  const { selectedUri: imageUri, pickImage, clear: clearImage } = useMediaPicker();
  const hasPhoto = imageUri !== null;
  const [destinations, setDestinations] = useState<GroupPostDestination[]>([]);
  const [destinationPickerOpen, setDestinationPickerOpen] = useState(false);

  const isLost = label === 'lost';
  const isFound = label === 'found';
  const needsAlertFields = isLost || isFound;

  const myCompanions = useMemo(() => user ? getMyCompanions(user.id) : [], [user?.id, getMyCompanions]);
  const myCompanionIds = useMemo(() => myCompanions.map(c => c.id), [myCompanions]);

  const resolveDefaultGroup = useMemo(() => {
    const preferred = options.initialGroupId
      ? joinedCommunities.find(g => g.id === options.initialGroupId)
      : undefined;
    const group = preferred ?? joinedCommunities[0];
    if (!group) return null;
    return { id: group.id, label: group.name, icon: group.icon, tint: group.tint };
  }, [joinedCommunities, options.initialGroupId]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLabel(
      options.initialLabel
        ?? (options.initialCategory ? categoryToComposerLabel(options.initialCategory) : 'discussion'),
    );
    setDestinations(resolveDefaultGroup ? [resolveDefaultGroup] : []);
    if (myCompanionIds.length > 0) {
      const optimistic = resolveDefaultCompanionId(null, myCompanionIds);
      setCompanionIds(optimistic ? [optimistic] : [myCompanionIds[0]]);
      if (user?.id) {
        void loadDefaultCompanionId(user.id).then(saved => {
          if (cancelled) return;
          const resolved = resolveDefaultCompanionId(saved, myCompanionIds);
          setCompanionIds(resolved ? [resolved] : [myCompanionIds[0]]);
        });
      }
    } else {
      setCompanionIds([]);
    }
    setText('');
    setAlertArea('');
    setAlertWhen('');
    setAlertContact('');
    setFoundLooksLike('');
    clearImage();
    setDestinationPickerOpen(false);
    return () => { cancelled = true; };
  }, [visible, options.initialLabel, options.initialCategory, options.initialGroupId, resolveDefaultGroup, myCompanionIds, user?.id, clearImage]);

  const alertOk = alertArea.trim().length > 0 && alertWhen.trim().length > 0;
  const requiresCompanion = myCompanionIds.length > 0;
  const hasRequiredCompanion = !requiresCompanion || companionIds.length > 0;
  const canSubmit = destinations.length > 0 && hasRequiredCompanion && !!text.trim() && (
    needsAlertFields ? alertOk : true
  );

  const toggleCompanion = (id: string) => {
    setCompanionIds(prev => {
      if (prev.includes(id)) {
        if (myCompanionIds.length > 0 && prev.length === 1) return prev;
        return prev.filter(x => x !== id);
      }
      return [...prev, id];
    });
  };

  const submit = () => {
    if (!canSubmit) return;
    const { title, body } = splitComposerText(text);
    const ts = Date.now();
    destinations.forEach(dest => {
      const post = buildCommunityPostFromComposer({
        title,
        body,
        label,
        destination: { id: dest.id, name: dest.label },
        authorId: user?.id ?? '',
        loc: '',
        companionIds: companionIds.length ? companionIds : undefined,
        companionNames: companionIds.length
          ? companionIds.map(id => getCompanion(id)?.name).filter((n): n is string => !!n)
          : undefined,
        hasPhoto,
        imageTint: undefined,
        alertMeta: needsAlertFields
          ? {
              kind: label as 'lost' | 'found',
              area: alertArea.trim(),
              when: alertWhen.trim(),
              contact: alertContact.trim() || undefined,
              looksLike: isFound ? foundLooksLike.trim() || undefined : undefined,
            }
          : undefined,
      });
      addPost({ ...post, id: `cp-${ts}-${dest.id}` });
    });
    onClose();
    const companionNames = companionIds.map(id => getCompanion(id)?.name).filter(Boolean).join(' & ');
    const destLabel = formatGroupDestinationsLabel(destinations);
    onToast({
      msg: companionNames
        ? `Posted with ${companionNames} to ${destLabel} 🐾`
        : `Posted to ${destLabel} 🐾`,
      icon: 'communities',
      tone: 'success',
    });
  };

  if (!joinedCommunities.length) {
    return (
      <Sheet visible={visible} onClose={onClose} title="New post">
        <View style={{ padding: 18, gap: 12 }}>
          <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>
            Join a community group first to start a discussion.
          </Text>
          <Button variant="primary" onPress={onClose}>Got it</Button>
        </View>
      </Sheet>
    );
  }

  const primaryDest = destinations[0] ?? resolveDefaultGroup;
  const destTint = primaryDest?.tint ?? colors.primary;
  const destLabel = formatGroupDestinationsLabel(destinations);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="New post"
      contentKey={`${label}-${destinations.length}`}
      footerBordered={false}
      footer={(
        <View style={styles.composerToolbar}>
          <IconButton name="image" size={34} iconSize={16} tone="soft" onPress={() => { pickImage(); }} />
          <IconButton name="camera" size={34} iconSize={16} tone="soft" onPress={() => { pickImage(); }} />
          <View style={{ flex: 1 }} />
          <Button size="sm" disabled={!canSubmit} onPress={submit} icon="paw">Post</Button>
        </View>
      )}
    >
      <View style={{ paddingHorizontal: 18 }}>
        <View style={{ flexDirection: 'row', gap: 11, alignItems: 'flex-start' }}>
          <Avatar user={meUser} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.authorName, { color: colors.text }]}>{meUser.name}</Text>
            {primaryDest && (
              <Pressable
                onPress={() => setDestinationPickerOpen(true)}
                style={[styles.audienceBtn, {
                  backgroundColor: colors.surface2,
                  borderColor: destTint + '44',
                }]}
              >
                <Icon name={primaryDest.icon} size={13} color={destTint} />
                <Text style={[styles.audienceTxt, { color: colors.textSecondary }]} numberOfLines={1}>
                  {destLabel}
                </Text>
                <Icon name="chevronDown" size={13} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>

          <TextInput
            style={[styles.composerInput, { color: colors.text }]}
            placeholder={composerPlaceholder(label)}
            placeholderTextColor={colors.textTertiary}
            multiline
            value={text}
            onChangeText={setText}
            autoFocus
          />

          {isLost && (
            <View style={{ gap: 10, marginBottom: 12 }}>
              <View>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>LAST SEEN</Text>
                <TextInput
                  style={[styles.composerField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }]}
                  placeholder="Where were they last seen?"
                  placeholderTextColor={colors.textTertiary}
                  value={alertArea}
                  onChangeText={setAlertArea}
                />
              </View>
              <View>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>WHEN</Text>
                <TextInput
                  style={[styles.composerField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }]}
                  placeholder="e.g. Today · 6:10 PM"
                  placeholderTextColor={colors.textTertiary}
                  value={alertWhen}
                  onChangeText={setAlertWhen}
                />
              </View>
              <View>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>CONTACT (OPTIONAL)</Text>
                <TextInput
                  style={[styles.composerField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }]}
                  placeholder="Phone or other contact"
                  placeholderTextColor={colors.textTertiary}
                  value={alertContact}
                  onChangeText={setAlertContact}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          )}

          {isFound && (
            <View style={{ gap: 10, marginBottom: 12 }}>
              <View>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>FOUND AT</Text>
                <TextInput
                  style={[styles.composerField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }]}
                  placeholder="Where did you find them?"
                  placeholderTextColor={colors.textTertiary}
                  value={alertArea}
                  onChangeText={setAlertArea}
                />
              </View>
              <View>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>WHEN</Text>
                <TextInput
                  style={[styles.composerField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }]}
                  placeholder="e.g. Today · 4:30 PM"
                  placeholderTextColor={colors.textTertiary}
                  value={alertWhen}
                  onChangeText={setAlertWhen}
                />
              </View>
              <View>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>LOOKS LIKE (OPTIONAL)</Text>
                <TextInput
                  style={[styles.composerField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }]}
                  placeholder="Breed, colour, collar, temperament…"
                  placeholderTextColor={colors.textTertiary}
                  value={foundLooksLike}
                  onChangeText={setFoundLooksLike}
                />
              </View>
              <View>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>CONTACT (OPTIONAL)</Text>
                <TextInput
                  style={[styles.composerField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }]}
                  placeholder="Phone or other contact"
                  placeholderTextColor={colors.textTertiary}
                  value={alertContact}
                  onChangeText={setAlertContact}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          )}

          {hasPhoto && imageUri && (
            <View style={{ marginBottom: 12 }}>
              <View style={{ borderRadius: 12, overflow: 'hidden' }}>
                <Image source={{ uri: imageUri }} style={{ width: '100%', height: 180 }} resizeMode="cover" />
                <Pressable
                  onPress={() => clearImage()}
                  style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="close" size={14} color="#fff" />
                </Pressable>
              </View>
            </View>
          )}

          {myCompanions.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ATTACH COMPANIONS</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {myCompanions.map(c => {
                  const on = companionIds.includes(c.id);
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => toggleCompanion(c.id)}
                      style={[styles.tagChip, {
                        borderColor: on ? colors.primary : colors.border,
                        backgroundColor: on ? colors.primary + '18' : colors.surface,
                      }]}
                    >
                      <CompanionAvatar pet={c} size={24} />
                      <Text style={[styles.tagChipText, { color: on ? colors.primary : colors.textSecondary }]}>
                        {c.name}
                      </Text>
                      {on && <Icon name="check" size={14} color={colors.primary} />}
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

        <GroupDestinationModal
          visible={destinationPickerOpen}
          selected={destinations}
          groups={joinedCommunities}
          onClose={() => setDestinationPickerOpen(false)}
          onApply={setDestinations}
        />

      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  popupOverlay: { flex: 1, position: 'relative' },
  authorName: { fontSize: 15.5, fontWeight: '700' },
  audienceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    marginTop: 3,
    alignSelf: 'flex-start',
    maxWidth: 220,
  },
  audienceTxt: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
  destModalCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
    borderRadius: radius.xl,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
    maxHeight: `${Math.round(sheetLayout.maxHeightRatio * 100)}%`,
  },
  destModalTitle: { fontSize: 17, fontWeight: '800' },
  destModalSub: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  destList: { marginTop: 2 },
  destOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  destOptionIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destOptionTitle: { fontSize: 15 },
  destOptionSub: { fontSize: 12, marginTop: 2 },
  destDivider: { height: StyleSheet.hairlineWidth, marginLeft: 46 },
  composerInput: {
    fontSize: 17,
    lineHeight: 26,
    minHeight: 44,
    marginTop: 12,
    marginBottom: 8,
    textAlignVertical: 'top',
    ...webNoOutline,
  },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 7 },
  composerField: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    ...webNoOutline,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingLeft: 5,
    paddingRight: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  tagChipText: { fontSize: 13.5, fontWeight: '600' },
  composerToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
