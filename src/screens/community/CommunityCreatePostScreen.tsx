import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Button } from '../../components/ui/Button';
import { PhotoSlot } from '../../components/ui/PhotoSlot';
import { Toast, ToastData } from '../../components/ui/Toast';
import { Icon } from '../../components/icons/Icon';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { CommunityCategoryBadge } from '../../components/community/CommunityChrome';
import { useCommunityFeed } from '../../context/CommunityFeedContext';
import {
  COMMUNITY_CATEGORIES,
  CommunityCategory,
  CommunityPost,
} from '../../data/communityPosts';
import { communities, users } from '../../data/mockData';
import type { CommunityStackParamList } from '../../navigation/CommunityNavigator';

type Route = RouteProp<CommunityStackParamList, 'CreatePost'>;
type Nav = NativeStackNavigationProp<CommunityStackParamList, 'CreatePost'>;

export function CommunityCreatePostScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { category: initialCategory } = useRoute<Route>().params;
  const { addPost } = useCommunityFeed();

  const [step, setStep] = useState<'edit' | 'preview'>('edit');
  const [category, setCategory] = useState<CommunityCategory>(initialCategory);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [withImage, setWithImage] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const joinedCommunity = useMemo(
    () => communities.find(c => c.joined) ?? communities[0],
    [],
  );

  const canPublish = title.trim().length >= 4 && body.trim().length >= 12;

  const publish = () => {
    if (!canPublish) return;
    const post: CommunityPost = {
      id: `cp-${Date.now()}`,
      title: title.trim(),
      body: body.trim(),
      category,
      authorId: 'you',
      communityId: joinedCommunity.id,
      communityName: joinedCommunity.name,
      time: 'Just now',
      loc: users.you.location ?? 'Bandra',
      helpful: 0,
      comments: 0,
      saved: false,
      helpfulByMe: false,
      hasImage: withImage,
      imageTint: users.you.tint,
      trendingScore: 40,
      threads: [],
    };
    addPost(post);
    setToast({ msg: 'Posted to community', icon: 'check', tone: 'success' });
    setTimeout(() => {
      navigation.replace('PostDetail', { postId: post.id });
    }, 350);
  };

  const categoryOptions = COMMUNITY_CATEGORIES.filter(c => c.id !== 'all');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title={step === 'edit' ? 'New discussion' : 'Preview'} onBack={() => {
        if (step === 'preview') setStep('edit');
        else navigation.goBack();
      }} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {step === 'edit' ? (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
              {categoryOptions.map(cat => {
                const on = category === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setCategory(cat.id as CommunityCategory)}
                    style={({ pressed }) => [
                      styles.catChip,
                      {
                        backgroundColor: on ? cat.bg : colors.surface2,
                        borderColor: on ? cat.tint + '55' : 'transparent',
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Icon name={cat.icon} size={14} color={on ? cat.tint : colors.textSecondary} />
                    <Text style={[styles.catLabel, { color: on ? cat.tint : colors.textSecondary }]}>
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="What would you like to discuss?"
              placeholderTextColor={colors.textTertiary}
              style={[styles.input, styles.titleInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              maxLength={120}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Share details, context, or questions…"
              placeholderTextColor={colors.textTertiary}
              style={[styles.input, styles.bodyInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              multiline
              textAlignVertical="top"
            />

            <Pressable
              onPress={() => setWithImage(v => !v)}
              style={({ pressed }) => [
                styles.imageToggle,
                { backgroundColor: colors.surface2, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Icon name="image" size={18} color={colors.primary} />
              <Text style={[styles.imageToggleText, { color: colors.text }]}>
                {withImage ? 'Photo attached' : 'Add optional photo'}
              </Text>
              {withImage && <Icon name="check" size={16} color={colors.primary} />}
            </Pressable>

            <View style={styles.footer}>
              <Button variant="outline" onPress={() => navigation.goBack()}>Cancel</Button>
              <Button variant="soft" onPress={() => setStep('preview')} disabled={!canPublish}>
                Preview
              </Button>
            </View>
          </>
        ) : (
          <>
            <CommunityCategoryBadge category={category} />
            <Text style={[styles.previewTitle, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.previewBody, { color: colors.text }]}>{body}</Text>
            {withImage && (
              <PhotoSlot height={200} tint={users.you.tint} label="" borderRadius={radius.lg} />
            )}
            <Text style={[styles.previewMeta, { color: colors.textSecondary }]}>
              Posting to {joinedCommunity.name}
            </Text>
            <View style={styles.footer}>
              <Button variant="outline" onPress={() => setStep('edit')}>Edit</Button>
              <Button variant="primary" onPress={publish}>Publish</Button>
            </View>
          </>
        )}
      </ScrollView>

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 10, paddingBottom: 32 },
  label: { fontSize: 12.5, fontWeight: '700', marginTop: 6 },
  catRow: { gap: 8, paddingVertical: 4 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  catLabel: { fontSize: 12.5, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  titleInput: { paddingVertical: 12, fontWeight: '700' },
  bodyInput: { minHeight: 140, paddingVertical: 12, lineHeight: 22 },
  imageToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: 4,
  },
  imageToggleText: { flex: 1, fontSize: 14, fontWeight: '600' },
  footer: { flexDirection: 'row', gap: 10, marginTop: 16 },
  previewTitle: { fontSize: 22, fontWeight: '800', lineHeight: 28, marginTop: 8 },
  previewBody: { fontSize: 15, lineHeight: 23 },
  previewMeta: { fontSize: 13, marginTop: 4 },
});
