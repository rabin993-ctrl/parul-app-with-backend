import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import { Button } from '../ui/Button';
import { CompanionAvatar } from '../ui/Avatar';
import type { AdoptionRecord } from '../../data/adoptionRecords';
import type { ChatThread } from '../../context/AdoptionContext';
import {
  UPDATE_MILESTONES,
  getActivePrompt,
  getCompletedMilestones,
  getNextUpdateSummary,
  type UpdateMilestoneId,
} from '../../utils/adoptionUpdateSchedule';
import { users } from '../../data/mockData';

type Props = {
  thread: ChatThread;
  record?: AdoptionRecord;
  isAdopter: boolean;
  isPoster: boolean;
  onConfirm: () => void;
  onMarkAdopted: () => void;
  onPostUpdate: () => void;
  backgroundColor?: string;
};

type PanelTone = 'pending' | 'waiting' | 'success' | 'warning' | 'info' | 'finalize';

function tonePalette(
  tone: PanelTone,
  colors: ReturnType<typeof useTheme>['colors'],
) {
  switch (tone) {
    case 'pending':
      return { bg: colors.infoBg, border: colors.primary + '28', accent: colors.primary, icon: 'adoption' };
    case 'waiting':
      return { bg: colors.warningBg, border: colors.warning + '33', accent: colors.warning, icon: 'clock' };
    case 'warning':
      return { bg: colors.warningBg, border: colors.warning + '33', accent: colors.warning, icon: 'alert' };
    case 'success':
      return { bg: colors.successBg, border: colors.success + '33', accent: colors.success, icon: 'check-circle' };
    case 'finalize':
      return { bg: colors.infoBg, border: colors.primary + '28', accent: colors.primary, icon: 'sparkle' };
    default:
      return { bg: colors.infoBg, border: colors.info + '33', accent: colors.info, icon: 'comment' };
  }
}

export function ChatAdoptionPanel({
  thread,
  record,
  isAdopter,
  isPoster,
  onConfirm,
  onMarkAdopted,
  onPostUpdate,
  backgroundColor,
}: Props) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  if (!thread.adoptionPostId && !record) return null;

  const pending = record?.status === 'pending_confirmation';
  const confirmed = record?.status === 'confirmed' || record?.status === 'update_due';
  const activePrompt = record ? getActivePrompt(record) : null;
  const completed = new Set(record ? getCompletedMilestones(record) : []);
  const nextUpdateLine = record ? getNextUpdateSummary(record) : null;
  const petName = record?.petName ?? 'Pet';
  const showMarkAdopted = Boolean(thread.adoptionPostId && !record && isPoster);

  if (!pending && !confirmed && !showMarkAdopted) return null;

  const posterName = record
    ? users[record.posterId as keyof typeof users]?.name ?? 'Foster'
    : 'Foster';

  const tone: PanelTone = showMarkAdopted
    ? 'finalize'
    : pending && isAdopter
      ? 'pending'
      : pending
        ? 'waiting'
        : activePrompt?.overdue
          ? 'warning'
          : activePrompt && isAdopter
            ? 'info'
            : 'success';

  const palette = tonePalette(tone, colors);

  const title = panelTitle({
    pending,
    confirmed,
    activePrompt,
    isAdopter,
    record,
    showMarkAdopted,
    petName,
  });

  const subtitle = panelSubtitle({
    pending,
    confirmed,
    activePrompt,
    isAdopter,
    record,
    showMarkAdopted,
    petName,
    posterName,
  });

  return (
    <View
      style={[
        styles.chrome,
        {
          backgroundColor: backgroundColor ?? colors.bg,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: palette.bg,
            borderColor: palette.border,
          },
        ]}
      >
        <View style={styles.cardTop}>
          {record ? (
            <CompanionAvatar
              pet={{ icon: record.icon, tint: record.tint, name: record.petName }}
              size={40}
            />
          ) : (
            <View style={[styles.iconBadge, { backgroundColor: palette.accent + '22' }]}>
              <Icon name={palette.icon} size={18} color={palette.accent} />
            </View>
          )}

          <View style={styles.cardCopy}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                {title}
              </Text>
              {confirmed && (
                <Pressable onPress={() => setExpanded(v => !v)} hitSlop={8} style={styles.expandBtn}>
                  <View style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}>
                    <Icon name="chevronDown" size={14} color={colors.textTertiary} />
                  </View>
                </Pressable>
              )}
            </View>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {subtitle}
            </Text>
          </View>
        </View>

        {pending && isAdopter && record && (
          <Button
            size="sm"
            variant="primary"
            icon="check-circle"
            full
            onPress={onConfirm}
            style={styles.cta}
          >
            Confirm adoption
          </Button>
        )}

        {showMarkAdopted && (
          <Button
            size="sm"
            variant="primary"
            icon="adoption"
            full
            onPress={onMarkAdopted}
            style={styles.cta}
          >
            Mark as adopted
          </Button>
        )}

        {confirmed && (expanded || activePrompt) && (
          <View style={styles.milestoneTrack}>
            {UPDATE_MILESTONES.map(m => (
              <MilestoneChip
                key={m.id}
                label={m.label.replace(' check-in', '').replace(' update', '')}
                state={chipState(m.id, completed, activePrompt?.milestone.id)}
                colors={colors}
              />
            ))}
          </View>
        )}

        {confirmed && (expanded || activePrompt) && (
          <Text style={[styles.scheduleNote, { color: colors.textTertiary }]}>
            {nextUpdateLine
              ? `${nextUpdateLine}. Posted to your Adopted profile as proof of care.`
              : 'Check-ins at 7, 30, 90 & 180 days — posted to your Adopted profile as proof of care.'}
          </Text>
        )}

        {activePrompt && isAdopter && (
          <View style={[styles.promptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.promptTitle, { color: colors.text }]}>
              {activePrompt.overdue ? 'Update requested' : 'Check-in due'} · {activePrompt.milestone.label}
            </Text>
            <Text style={[styles.promptBody, { color: colors.textSecondary }]}>
              {activePrompt.milestone.prompt}
              {activePrompt.overdue ? ` · ${activePrompt.overdueDays} days overdue` : ''}
            </Text>
            <Button size="sm" variant="soft" onPress={onPostUpdate} style={styles.promptBtn}>
              Post home update
            </Button>
          </View>
        )}

        {confirmed && !activePrompt && !expanded && (
          <View style={styles.onTrackRow}>
            <Icon name="check" size={12} color={colors.success} />
            <Text style={[styles.onTrack, { color: colors.success }]}>
              On track — view timeline on your Adopted tab
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function panelTitle({
  pending, confirmed, activePrompt, isAdopter, record, showMarkAdopted, petName,
}: {
  pending: boolean;
  confirmed: boolean;
  activePrompt: ReturnType<typeof getActivePrompt>;
  isAdopter: boolean;
  record?: AdoptionRecord;
  showMarkAdopted: boolean;
  petName: string;
}): string {
  if (showMarkAdopted) return 'Ready to finalize';
  if (pending && isAdopter) return `Confirm ${petName}'s adoption`;
  if (pending) return 'Awaiting confirmation';
  if (activePrompt && isAdopter) {
    return activePrompt.overdue ? 'Home update overdue' : 'Check-in due';
  }
  if (confirmed) return `Adoption confirmed${record?.confirmedAt ? ` · ${record.confirmedAt}` : ''}`;
  return 'Adoption thread';
}

function panelSubtitle({
  pending, confirmed, activePrompt, isAdopter, showMarkAdopted, petName, posterName,
}: {
  pending: boolean;
  confirmed: boolean;
  activePrompt: ReturnType<typeof getActivePrompt>;
  isAdopter: boolean;
  record?: AdoptionRecord;
  showMarkAdopted: boolean;
  petName: string;
  posterName: string;
}): string {
  if (showMarkAdopted) {
    return 'When the match is final, mark complete — the adopter confirms on their side.';
  }
  if (pending && isAdopter) {
    return `${posterName} marked this complete. Confirm to add ${petName} to your Adopted profile.`;
  }
  if (pending) return 'Waiting for the adopter to confirm on their side.';
  if (activePrompt && isAdopter) return activePrompt.milestone.prompt;
  if (confirmed) return `${petName} is home — keep sharing care updates on schedule.`;
  return 'Adoption conversation';
}

function chipState(
  id: UpdateMilestoneId,
  completed: Set<UpdateMilestoneId>,
  activeId?: UpdateMilestoneId,
): 'done' | 'current' | 'upcoming' {
  if (completed.has(id)) return 'done';
  if (id === activeId) return 'current';
  return 'upcoming';
}

function MilestoneChip({
  label,
  state,
  colors,
}: {
  label: string;
  state: 'done' | 'current' | 'upcoming';
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const bg = state === 'done'
    ? colors.successBg
    : state === 'current'
      ? colors.warningBg
      : colors.surface2;
  const fg = state === 'done'
    ? colors.success
    : state === 'current'
      ? colors.warning
      : colors.textTertiary;

  return (
    <View style={[styles.milestoneChip, { backgroundColor: bg, borderColor: fg + '33' }]}>
      {state === 'done' && <Icon name="check" size={9} color={fg} />}
      <Text style={[styles.milestoneText, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chrome: {
    flexShrink: 0,
    zIndex: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardCopy: { flex: 1, gap: 4, minWidth: 0 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    ...typography.small,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
    flex: 1,
  },
  subtitle: {
    ...typography.small,
    fontSize: 12.5,
    lineHeight: 17,
  },
  expandBtn: { padding: 2 },
  cta: { marginTop: 2 },
  milestoneTrack: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  milestoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  milestoneText: { ...typography.meta, fontSize: 10, fontWeight: '700' },
  scheduleNote: { ...typography.meta, fontSize: 11, lineHeight: 16 },
  promptCard: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 10,
    gap: 6,
  },
  promptTitle: { ...typography.small, fontSize: 13, fontWeight: '700' },
  promptBody: { ...typography.small, fontSize: 12.5, lineHeight: 17 },
  promptBtn: { alignSelf: 'flex-start' },
  onTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onTrack: { ...typography.caption, fontSize: 12, fontWeight: '600' },
});
