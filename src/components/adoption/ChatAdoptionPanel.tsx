import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography } from '../../theme/tokens';
import { Button } from '../ui/Button';
import { Icon } from '../icons/Icon';
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
};

export function ChatAdoptionPanel({
  thread,
  record,
  isAdopter,
  isPoster,
  onConfirm,
  onMarkAdopted,
  onPostUpdate,
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
  const showMarkAdopted = thread.adoptionPostId && !record && isPoster;

  if (!pending && !confirmed && !showMarkAdopted) return null;

  const panelBg = pending
    ? colors.infoBg
    : activePrompt?.overdue
      ? colors.warningBg
      : activePrompt
        ? colors.infoBg
        : colors.successBg;

  const borderColor = pending
    ? colors.primary + '30'
    : activePrompt?.overdue
      ? colors.warning + '35'
      : colors.success + '30';

  return (
    <View style={[styles.panel, { backgroundColor: panelBg, borderBottomColor: borderColor }]}>
      <View style={styles.panelHead}>
        <View style={[styles.panelIcon, { backgroundColor: colors.primary + '20' }]}>
          <Icon name="adoption" size={16} color={colors.primary} />
        </View>
        <View style={styles.panelHeadText}>
          <Text style={[styles.panelTitle, { color: colors.text }]}>
            Adoption · {petName}
          </Text>
          <Text style={[styles.panelSub, { color: colors.textSecondary }]}>
            {statusSubtitle({ pending, confirmed, activePrompt, isAdopter, record, showMarkAdopted })}
          </Text>
        </View>
        {confirmed && (
          <Pressable onPress={() => setExpanded(v => !v)} hitSlop={8} style={{ padding: 4 }}>
            <View style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}>
              <Icon name="chevronDown" size={18} color={colors.textTertiary} />
            </View>
          </Pressable>
        )}
      </View>

      {pending && isAdopter && record && (
        <View style={styles.actionBlock}>
          <Text style={[styles.actionCopy, { color: colors.textSecondary }]}>
            {users[record.posterId as keyof typeof users]?.name ?? 'Foster'} marked this complete. Confirm to add {petName} to your Adopted profile.
          </Text>
          <Button size="sm" full onPress={onConfirm}>Confirm adoption</Button>
        </View>
      )}

      {pending && isPoster && (
        <Text style={[styles.actionCopy, { color: colors.textSecondary }]}>
          Waiting for the adopter to confirm.
        </Text>
      )}

      {showMarkAdopted && (
        <View style={styles.actionBlock}>
          <Text style={[styles.actionCopy, { color: colors.textSecondary }]}>
            When the match is final, mark the adoption complete. The adopter will confirm on their side.
          </Text>
          <Button size="sm" variant="soft" icon="adoption" full onPress={onMarkAdopted}>
            Mark as adopted
          </Button>
        </View>
      )}

      {confirmed && (
        <>
          <View style={styles.milestoneRow}>
            {UPDATE_MILESTONES.map(m => (
              <MilestoneChip
                key={m.id}
                label={m.label.replace(' check-in', '').replace(' update', '')}
                state={chipState(m.id, completed, activePrompt?.milestone.id)}
                colors={colors}
              />
            ))}
          </View>

          {(expanded || activePrompt) && (
            <Text style={[styles.scheduleNote, { color: colors.textTertiary }]}>
              {nextUpdateLine
                ? `${nextUpdateLine}. Posted to your Adopted profile as proof of care.`
                : 'Check-ins at 7, 30, 90 & 180 days — posted to your Adopted profile as proof of care.'}
            </Text>
          )}

          {activePrompt && isAdopter ? (
            <View style={styles.actionBlock}>
              <Text style={[styles.actionCopy, { color: colors.text }]}>
                {activePrompt.overdue ? 'Update requested' : 'Check-in due'} · {activePrompt.milestone.label}
              </Text>
              <Text style={[styles.promptCopy, { color: colors.textSecondary }]}>
                {activePrompt.milestone.prompt}
                {activePrompt.overdue ? ` · ${activePrompt.overdueDays} days overdue` : ''}
              </Text>
              <Button size="sm" icon="camera" full onPress={onPostUpdate}>
                Post home update
              </Button>
            </View>
          ) : (
            <Text style={[styles.onTrack, { color: colors.success }]}>
              ✓ On track — view timeline on your Adopted tab
            </Text>
          )}
        </>
      )}
    </View>
  );
}

function statusSubtitle({
  pending, confirmed, activePrompt, isAdopter, record, showMarkAdopted,
}: {
  pending: boolean;
  confirmed: boolean;
  activePrompt: ReturnType<typeof getActivePrompt>;
  isAdopter: boolean;
  record?: AdoptionRecord;
  showMarkAdopted: boolean;
}): string {
  if (showMarkAdopted) return 'Ready to finalize when you\'re both agreed';
  if (pending && isAdopter) return 'Your confirmation needed';
  if (pending) return 'Awaiting adopter confirmation';
  if (activePrompt && isAdopter) {
    return activePrompt.overdue ? 'Home update overdue' : 'Check-in due soon';
  }
  if (confirmed) return `Confirmed ${record?.confirmedAt ?? ''}`;
  return 'In conversation';
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
    <View style={[styles.chip, { backgroundColor: bg, borderColor: fg + '40' }]}>
      {state === 'done' && <Icon name="check" size={10} color={fg} />}
      <Text style={[styles.chipText, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  panelIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelHeadText: { flex: 1, gap: 2 },
  panelTitle: { ...typography.label, fontSize: 14 },
  panelSub: { ...typography.meta, fontSize: 11 },
  milestoneRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { ...typography.meta, fontSize: 10, fontWeight: '600' },
  scheduleNote: { ...typography.meta, fontSize: 11, lineHeight: 16 },
  actionBlock: { gap: 6 },
  actionCopy: { ...typography.small, fontSize: 13, lineHeight: 18 },
  promptCopy: { ...typography.meta, fontSize: 12, lineHeight: 17 },
  onTrack: { ...typography.caption, fontSize: 12 },
});
