import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography, sheetLayout } from '../../theme/tokens';
import { Sheet } from '../ui/Sheet';
import { PhotoSlot } from '../ui/PhotoSlot';
import { Icon } from '../icons/Icon';
import { PostAuthorRow } from '../feed/PostAuthorRow';
import { type Post, type PostTag } from '../../data/mockData';
import { useCompanions } from '../../context/CompanionContext';

function resolvePostTagKey(post: Post): PostTag {
  if (post.companionAuthorId || post.tag === 'paw-posting') return 'paw-posting';
  if (post.label === 'meme' || post.tag === 'meme') return 'meme';
  if (post.tag) return post.tag;
  if (post.label === 'adoption') return 'adoption';
  if (post.label === 'lost' || post.label === 'found') return 'lost-found';
  if (post.label === 'rescue') return 'rescue';
  return 'discussion';
}


function PostStat({ icon, value, label, colors }: {
  icon: string;
  value: number;
  label: string;
  colors: { text: string; textSecondary: string };
}) {
  if (value <= 0) return null;
  return (
    <View style={styles.stat}>
      <Icon name={icon} size={16} color={colors.textSecondary} />
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

export function ProfilePostDetailSheet({
  post,
  visible,
  onClose,
}: {
  post: Post | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { colors, postTag } = useTheme();
  const { width, height } = useWindowDimensions();
  const { getCompanion } = useCompanions();
  const contentWidth = width - 32;
  if (!post) return null;

  const companionId = post.companionAuthorId ?? post.companions?.[0];
  const companion = companionId ? getCompanion(companionId) : null;
  const tint = companion?.tint ?? colors.primary;
  const icon = companion?.icon ?? 'paw';
  const tag = postTag(resolvePostTagKey(post));
  const showTag = post.label != null || (post.tag != null && post.tag !== 'discussion');
  const hasMedia = post.images > 0;
  const mediaHeight = hasMedia
    ? (post.images === 1 ? Math.round(contentWidth * 0.72) : Math.round((contentWidth - 8) / 2))
    : 0;

  return (
    <Sheet visible={visible} onClose={onClose} maxHeight={height * sheetLayout.maxHeightRatio} contentKey={post.id}>
      <View style={styles.body}>
        <PostAuthorRow post={post} size={40} />

        {hasMedia ? (
          <View style={styles.mediaBlock}>
            {post.images === 1 ? (
              <PhotoSlot
                height={mediaHeight}
                imageKey={post.id}
                borderRadius={radius.md}
                label=""
              />
            ) : (
              <View style={styles.mediaPair}>
                <PhotoSlot
                  height={mediaHeight}
                  imageKey={post.id}
                  imageIndex={0}
                  borderRadius={radius.md}
                  label=""
                  style={{ flex: 1 }}
                />
                <PhotoSlot
                  height={mediaHeight}
                  imageKey={post.id}
                  imageIndex={1}
                  borderRadius={radius.md}
                  label=""
                  style={{ flex: 1 }}
                />
              </View>
            )}
          </View>
        ) : (
          <LinearGradient
            colors={[tint + '24', tint + '0c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.textHero, { borderColor: tint + '30' }]}
          >
            <View style={[styles.textHeroIcon, { backgroundColor: tint + '28' }]}>
              <Icon name="comment" size={20} color={tint} sw={2} />
            </View>
          </LinearGradient>
        )}

        {showTag && (
          <View style={[styles.tagPill, { backgroundColor: tag.bg }]}>
            <Text style={[styles.tagText, { color: tag.text }]}>{tag.label}</Text>
          </View>
        )}

        <Text style={[styles.postText, { color: colors.text }]}>{post.text}</Text>

        <View style={[styles.metaRow, { borderTopColor: colors.border }]}>
          {post.loc?.trim() ? (
            <View style={styles.metaLoc}>
              <Icon name="mapPin" size={13} color={colors.textTertiary} />
              <Text style={[styles.metaLocText, { color: colors.textSecondary }]}>{post.loc}</Text>
            </View>
          ) : null}
          <Text style={[styles.metaTime, { color: colors.textTertiary }]}>{post.time}</Text>
        </View>

        <View style={[styles.statsRow, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
          <PostStat icon="paw-line" value={post.paws} label="Paws" colors={colors} />
          <PostStat icon="comment" value={post.comments} label="Comments" colors={colors} />
          <PostStat icon="forward" value={post.forwards} label="Shares" colors={colors} />
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 14, paddingBottom: 8 },
  mediaBlock: { marginTop: 2 },
  mediaPair: { flexDirection: 'row', gap: 8 },
  textHero: {
    height: 56,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textHeroIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  tagText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  postText: { ...typography.body, fontSize: 15.5, lineHeight: 23 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  metaLoc: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  metaLocText: { fontSize: 12.5, fontWeight: '500' },
  metaTime: { fontSize: 12, fontWeight: '500' },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statValue: { fontSize: 14, fontWeight: '700' },
  statLabel: { fontSize: 12, fontWeight: '500' },
});
