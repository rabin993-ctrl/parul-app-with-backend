import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, TextInput, Modal, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows, modalScrim } from '../../theme/tokens';
import { Avatar, CompanionAvatar } from '../ui/Avatar';
import { Button, IconButton } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { PhotoSlot } from '../ui/PhotoSlot';
import { Icon } from '../icons/Icon';
import { ToastData } from '../ui/Toast';
import { usePawCircles } from '../../context/PawCircleContext';
import {
  MentionPicker, insertMentionToken, shouldOpenMentionPicker,
} from '../MentionPicker';
import { companions, communities, users, Post, PostTag } from '../../data/mockData';

const CATEGORY_LABEL_MAP: Record<string, string | null> = {
  rescue: 'rescue',
  adoption: 'adoption',
  lost: 'lost',
  found: 'found',
  discussion: 'discussion',
  meme: 'meme',
};

const TAG_MAP: Record<string, PostTag> = {
  discussion: 'discussion',
  adoption: 'adoption',
  rescue: 'rescue',
  lost: 'lost-found',
  found: 'lost-found',
  meme: 'discussion',
};

type PostDestination =
  | { type: 'feed' }
  | { type: 'community'; id: string; label: string; icon: string; tint: string };

function PostDestinationModal({
  visible,
  selected,
  joinedCommunities,
  onClose,
  onSelect,
}: {
  visible: boolean;
  selected: PostDestination;
  joinedCommunities: typeof communities;
  onClose: () => void;
  onSelect: (dest: PostDestination) => void;
}) {
  const { colors, mode } = useTheme();

  const pick = (dest: PostDestination) => {
    onSelect(dest);
    onClose();
  };

  const isFeed = selected.type === 'feed';

  const renderOption = ({
    key,
    icon,
    tint,
    title,
    subtitle,
    selected,
    onPress,
  }: {
    key: string;
    icon: string;
    tint: string;
    title: string;
    subtitle: string;
    selected: boolean;
    onPress: () => void;
  }) => (
    <View key={key}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.destOption, { opacity: pressed ? 0.7 : 1 }]}
      >
        <View style={[styles.destOptionIcon, { backgroundColor: tint + '18' }]}>
          <Icon name={icon} size={16} color={tint} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={[
              styles.destOptionTitle,
              { color: selected ? tint : colors.text, fontWeight: selected ? '700' : '600' },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text style={[styles.destOptionSub, { color: colors.textTertiary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {selected && <Icon name="check" size={16} color={tint} />}
      </Pressable>
      <View style={[styles.destDivider, { backgroundColor: colors.border }]} />
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.popupOverlay}>
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: mode === 'dark' ? modalScrim.dark : modalScrim.light },
          ]}
        />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.destModalCard, { backgroundColor: colors.surface }, shadows.md]}>
          <Text style={[styles.destModalTitle, { color: colors.text }]}>Post to</Text>
          <Text style={[styles.destModalSub, { color: colors.textSecondary }]}>
            Choose your feed or a community group
          </Text>

          <View style={styles.destList}>
            {renderOption({
              key: 'feed',
              icon: 'home',
              tint: colors.primary,
              title: 'Feed',
              subtitle: 'Visible on the main feed',
              selected: isFeed,
              onPress: () => pick({ type: 'feed' }),
            })}

            {joinedCommunities.length > 0 && (
              <>
                <Text style={[styles.destSectionLabel, { color: colors.textTertiary }]}>Community</Text>
                {joinedCommunities.map(c => renderOption({
                  key: c.id,
                  icon: c.icon,
                  tint: c.tint,
                  title: c.name,
                  subtitle: `${c.members} members`,
                  selected: selected.type === 'community' && selected.id === c.id,
                  onPress: () => pick({
                    type: 'community',
                    id: c.id,
                    label: c.name,
                    icon: c.icon,
                    tint: c.tint,
                  }),
                }))}
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export type PostComposerOptions = {
  initialCompanionIds?: string[];
  initialCategory?: string | null;
  /** Post as this companion (e.g. opened from companion profile). */
  postAsCompanionId?: string;
};

function buildPost(params: {
  text: string;
  tags: string[];
  hasPhoto: boolean;
  destination: PostDestination;
  postAsCompanionId?: string;
  label?: string | null;
  lostArea?: string;
  lostWhen?: string;
  lostContact?: string;
  foundLooksLike?: string;
}): Post {
  const me = users.you;
  const pet = params.postAsCompanionId ? companions[params.postAsCompanionId] : null;
  const post: Post = {
    id: `p-${Date.now()}`,
    author: 'you',
    userId: 'you',
    companionAuthorId: pet?.id,
    companions: pet ? [pet.id] : params.tags,
    time: 'Just now',
    loc: me.loc ?? 'Mumbai',
    circle: params.destination.type === 'community',
    text: params.text.trim(),
    images: params.hasPhoto ? 1 : 0,
    label: pet ? null : (params.label ?? null),
    tag: pet ? 'paw-posting' : (params.label ? (TAG_MAP[params.label] ?? 'discussion') : 'discussion'),
    paws: 0,
    reacted: false,
    comments: 0,
    forwards: 0,
    saved: false,
    threads: [],
  };

  if (!pet && params.label === 'lost') {
    post.lost = {
      kind: 'Lost pet',
      lastSeen: params.lostWhen?.trim() ?? '',
      area: params.lostArea?.trim() ?? '',
      phone: params.lostContact?.trim() || undefined,
    };
  }

  if (!pet && params.label === 'found') {
    post.found = {
      area: params.lostArea?.trim() ?? '',
      foundAt: params.lostWhen?.trim() ?? '',
      looksLike: params.foundLooksLike?.trim() || undefined,
      phone: params.lostContact?.trim() || undefined,
    };
  }

  return post;
}

export function PostComposer({
  visible,
  options,
  onClose,
  onSubmit,
  onToast,
}: {
  visible: boolean;
  options: PostComposerOptions;
  onClose: () => void;
  onSubmit: (post: Post) => void;
  onToast: (t: ToastData) => void;
}) {
  const { colors } = useTheme();
  const { createdCircles, joinedCircles } = usePawCircles();
  const [text, setText] = useState('');
  const [tags, setTags] = useState<string[]>(['max']);
  const [mentionPickerOpen, setMentionPickerOpen] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const [lostArea, setLostArea] = useState('');
  const [lostWhen, setLostWhen] = useState('');
  const [lostContact, setLostContact] = useState('');
  const [foundLooksLike, setFoundLooksLike] = useState('');
  const [destination, setDestination] = useState<PostDestination>({ type: 'feed' });
  const [destinationPickerOpen, setDestinationPickerOpen] = useState(false);
  const me = users.you;

  const joinedCommunities = useMemo(() => communities.filter(c => c.joined), []);

  const myCompanionIds = useMemo(
    () => Object.values(companions).filter(c => c.ownerId === 'you').map(c => c.id),
    [],
  );

  const initialCompanionIds = options.initialCompanionIds;
  const initialCategory = options.initialCategory;
  const postAsCompanionId = options.postAsCompanionId;
  const postingAs = postAsCompanionId ? companions[postAsCompanionId] : null;
  const postingAsOwner = postingAs ? users[postingAs.ownerId] : null;

  useEffect(() => {
    if (visible) {
      const nextTags = postAsCompanionId
        ? [postAsCompanionId]
        : initialCompanionIds?.length
          ? initialCompanionIds.filter(id => myCompanionIds.includes(id))
          : myCompanionIds.slice(0, 1);
      setTags(nextTags.length ? nextTags : myCompanionIds.slice(0, 1));
      if (!postAsCompanionId) {
        setLabel(initialCategory ? (CATEGORY_LABEL_MAP[initialCategory] ?? null) : null);
      }
    } else {
      setText('');
      setTags(myCompanionIds.slice(0, 1));
      setMentionPickerOpen(false);
      setHasPhoto(false);
      setLabel(null);
      setLostArea('');
      setLostWhen('');
      setLostContact('');
      setFoundLooksLike('');
      setDestination({ type: 'feed' });
      setDestinationPickerOpen(false);
    }
  }, [visible, initialCategory, initialCompanionIds, postAsCompanionId, myCompanionIds]);

  const destLabel = destination.type === 'feed' ? 'Feed' : destination.label;
  const destIcon = destination.type === 'feed' ? 'home' : destination.icon;
  const destTint = destination.type === 'feed' ? colors.primary : destination.tint;

  const isLost = !postingAs && label === 'lost';
  const isFound = !postingAs && label === 'found';
  const needsAlertFields = isLost || isFound;
  const canSubmit = !!text.trim() && (!needsAlertFields || (lostArea.trim() && lostWhen.trim()));

  const handleTextChange = (next: string) => {
    if (shouldOpenMentionPicker(next, text)) setMentionPickerOpen(true);
    else if (mentionPickerOpen && !next.includes('@')) setMentionPickerOpen(false);
    setText(next);
  };

  const onMentionSelect = (token: string) => {
    setText(t => insertMentionToken(t, token));
    setMentionPickerOpen(false);
  };

  const submit = () => {
    if (!canSubmit) return;
    const post = buildPost({
      text,
      tags,
      hasPhoto,
      destination,
      postAsCompanionId,
      label: postingAs ? null : label,
      lostArea,
      lostWhen,
      lostContact,
      foundLooksLike,
    });
    onSubmit(post);
    onClose();
    const companionNames = tags.map(id => companions[id]?.name).filter(Boolean).join(' & ');
    const destName = destination.type === 'feed' ? 'Feed' : destination.label;
    const msg = postingAs
      ? `${postingAs.name} posted to ${destName} 🐾`
      : companionNames
        ? `Posted with ${companionNames} to ${destName} 🐾`
        : `Posted to ${destName} 🐾`;
    onToast({
      msg,
      icon: destination.type === 'feed' ? 'check' : 'communities',
      tone: 'success',
    });
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={postingAs ? `${postingAs.name}'s post` : 'New post'}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ paddingHorizontal: 18, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', gap: 11, alignItems: 'flex-start' }}>
            {postingAs ? (
              <CompanionAvatar companion={postingAs} size={40} ring={false} />
            ) : (
              <Avatar user={me} size={40} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.authorName, { color: colors.text }]}>
                {postingAs ? postingAs.name : me.name}
              </Text>
              {postingAs && postingAsOwner && (
                <Text style={[styles.postingAsMeta, { color: colors.textTertiary }]}>
                  @{postingAs.handle ?? postingAs.id} · with @{postingAsOwner.handle}
                </Text>
              )}
              <Pressable
                onPress={() => setDestinationPickerOpen(true)}
                style={[styles.audienceBtn, {
                  backgroundColor: colors.surface2,
                  borderColor: destination.type === 'community' ? destTint + '44' : colors.border,
                }]}
              >
                <Icon name={destIcon} size={13} color={destTint} />
                <Text style={[styles.audienceTxt, { color: colors.textSecondary }]} numberOfLines={1}>
                  {destLabel}
                </Text>
                <Icon name="chevronDown" size={13} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          <TextInput
            style={[styles.composerInput, { color: colors.text }]}
            placeholder={postingAs ? `What is ${postingAs.name} up to?` : 'What are your companions up to?'}
            placeholderTextColor={colors.textTertiary}
            multiline
            value={text}
            onChangeText={handleTextChange}
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
                  value={lostArea}
                  onChangeText={setLostArea}
                />
              </View>
              <View>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>WHEN</Text>
                <TextInput
                  style={[styles.composerField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }]}
                  placeholder="e.g. Today · 6:10 PM"
                  placeholderTextColor={colors.textTertiary}
                  value={lostWhen}
                  onChangeText={setLostWhen}
                />
              </View>
              <View>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>CONTACT (OPTIONAL)</Text>
                <TextInput
                  style={[styles.composerField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }]}
                  placeholder="Phone or other contact"
                  placeholderTextColor={colors.textTertiary}
                  value={lostContact}
                  onChangeText={setLostContact}
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
                  value={lostArea}
                  onChangeText={setLostArea}
                />
              </View>
              <View>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>WHEN</Text>
                <TextInput
                  style={[styles.composerField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }]}
                  placeholder="e.g. Today · 4:30 PM"
                  placeholderTextColor={colors.textTertiary}
                  value={lostWhen}
                  onChangeText={setLostWhen}
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
                  value={lostContact}
                  onChangeText={setLostContact}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          )}

          {!postingAs && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ATTACH COMPANIONS</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {myCompanionIds.map(id => {
                  const c = companions[id];
                  const on = tags.includes(id);
                  return (
                    <Pressable
                      key={id}
                      onPress={() => setTags(t => on ? t.filter(x => x !== id) : [...t, id])}
                      style={[styles.tagChip, {
                        borderColor: on ? colors.primary : colors.border,
                        backgroundColor: on ? colors.primary + '18' : colors.surface,
                      }]}
                    >
                      <CompanionAvatar pet={c} size={24} ring={false} />
                      <Text style={[styles.tagChipText, { color: on ? colors.primary : colors.textSecondary }]}>{c.name}</Text>
                      {on && <Icon name="check" size={14} color={colors.primary} />}
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {hasPhoto && (
            <View style={{ marginBottom: 12 }}>
              <PhotoSlot height={150} tint="#F2972E" label="Photo added" />
            </View>
          )}

          {!postingAs && (
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {[['adoption', 'Adoption', 'adoption'], ['lost', 'Lost', 'alert'], ['found', 'Found', 'check'], ['rescue', 'Rescue', 'shield'], ['discussion', 'Discussion', 'comment'], ['meme', 'Meme', 'sparkle']].map(([id, txt, ic]) => (
                <Pressable
                  key={id}
                  onPress={() => setLabel(l => l === id ? null : id)}
                  style={[styles.labelChip, {
                    backgroundColor: label === id ? colors.text : colors.surface2,
                    borderColor: colors.border,
                  }]}
                >
                  <Icon name={ic} size={14} color={label === id ? colors.bg : colors.textSecondary} />
                  <Text style={[styles.labelChipText, { color: label === id ? colors.bg : colors.textSecondary }]}>{txt}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {postingAs && (
            <View style={[styles.pawPostingTag, { backgroundColor: colors.infoBg, borderColor: colors.border }]}>
              <Icon name="paw" size={14} color={colors.primary} />
              <Text style={[styles.pawPostingTagText, { color: colors.text }]}>Paw Posting</Text>
            </View>
          )}

          <MentionPicker
            visible={mentionPickerOpen}
            createdCircles={createdCircles}
            joinedCircles={joinedCircles}
            onClose={() => setMentionPickerOpen(false)}
            onSelect={onMentionSelect}
          />

          <PostDestinationModal
            visible={destinationPickerOpen}
            selected={destination}
            joinedCommunities={joinedCommunities}
            onClose={() => setDestinationPickerOpen(false)}
            onSelect={setDestination}
          />

          <View style={[styles.composerToolbar, { borderTopColor: colors.border }]}>
            <IconButton name="image" size={46} iconSize={22} tone="soft" onPress={() => setHasPhoto(true)} />
            <IconButton name="camera" size={46} iconSize={22} tone="soft" onPress={() => setHasPhoto(true)} />
            <IconButton name="at" size={46} iconSize={20} tone="soft" onPress={() => setMentionPickerOpen(true)} />
            <View style={{ flex: 1 }} />
            <Button disabled={!canSubmit} onPress={submit} icon="paw">Post</Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  popupOverlay: { flex: 1, position: 'relative' },
  authorName: { fontSize: 15.5, fontWeight: '700' },
  postingAsMeta: { fontSize: 12, fontWeight: '600', marginTop: 1, marginBottom: 2 },
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
    maxHeight: '70%',
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
  destSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 2,
    paddingTop: 4,
  },
  composerInput: {
    fontSize: 17,
    lineHeight: 26,
    minHeight: 96,
    marginTop: 12,
    marginBottom: 8,
    textAlignVertical: 'top',
  },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 7 },
  composerField: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  labelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  labelChipText: { fontSize: 12.5, fontWeight: '600' },
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
  pawPostingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    marginBottom: 14,
  },
  pawPostingTagText: { fontSize: 12.5, fontWeight: '700' },
  composerToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 14,
    borderTopWidth: 1,
  },
});
