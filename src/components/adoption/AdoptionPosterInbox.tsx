import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../icons/Icon';
import { AdoptionListing } from '../../data/adoptionData';
import type { AdoptionRequest } from '../../context/AdoptionFeedContext';
import { users } from '../../data/mockData';

function statusMeta(status: AdoptionRequest['status'], colors: ReturnType<typeof useTheme>['colors']) {
  switch (status) {
    case 'queued':
      return { label: 'In queue', color: colors.warning, bg: colors.warningBg };
    case 'approved':
      return { label: 'Approved', color: colors.success, bg: colors.successBg };
    case 'rejected':
      return { label: 'Passed', color: colors.textTertiary, bg: colors.surface2 };
    case 'adopted':
      return { label: 'Adopted', color: colors.success, bg: colors.successBg };
    default:
      return { label: 'New', color: colors.primary, bg: colors.primary + '14' };
  }
}

export function AdoptionPosterInbox({
  visible,
  listing,
  requests,
  onClose,
  onQueue,
  onApprove,
  onReject,
  onMarkAdopted,
  onOpenThread,
}: {
  visible: boolean;
  listing: AdoptionListing | null;
  requests: AdoptionRequest[];
  onClose: () => void;
  onQueue: (requestId: string) => void;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
  onMarkAdopted: (requestId: string) => void;
  onOpenThread: (request: AdoptionRequest) => void;
}) {
  const { colors } = useTheme();

  if (!listing) return null;

  const pending = requests.filter(r => r.status === 'pending').length;
  const queued = requests.filter(r => r.status === 'queued').length;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={`Requests · ${listing.name}`}
      contentKey={`${listing.id}-${requests.length}`}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={[styles.summary, { backgroundColor: colors.surface2 }]}>
          <SummaryPill label="New" count={pending} color={colors.primary} />
          <SummaryPill label="Queued" count={queued} color={colors.warning} />
          <SummaryPill label="Total" count={requests.length} color={colors.textSecondary} />
        </View>

        <Text style={[styles.help, { color: colors.textSecondary }]}>
          Queue promising applicants, chat in Requests, then mark one as adopted when it's a match.
        </Text>

        {requests.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textTertiary }]}>
            No requests yet — share your listing in Browse.
          </Text>
        ) : (
          requests.map(req => {
            const user = users[req.requesterId as keyof typeof users];
            const meta = statusMeta(req.status, colors);
            const canAct = req.status === 'pending' || req.status === 'queued' || req.status === 'approved';

            return (
              <View
                key={req.id}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.cardTop}>
                  {user && <Avatar user={user} size={40} />}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: colors.text }]}>{req.requesterName}</Text>
                    <Text style={[styles.time, { color: colors.textTertiary }]}>{req.submittedAt}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.statusText, { color: meta.color }]}>
                      {meta.label}
                      {req.queuePosition ? ` #${req.queuePosition}` : ''}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={3}>
                  {req.message}
                </Text>

                <View style={styles.actions}>
                  {req.status === 'pending' && (
                    <Button size="sm" variant="soft" onPress={() => onQueue(req.id)}>
                      Add to queue
                    </Button>
                  )}
                  {canAct && (
                    <>
                      <Button size="sm" variant="outline" onPress={() => onApprove(req.id)}>
                        Approve
                      </Button>
                      <Button size="sm" variant="soft" onPress={() => onOpenThread(req)}>
                        Chat
                      </Button>
                    </>
                  )}
                  {(req.status === 'approved' || req.status === 'queued') && (
                    <Button size="sm" variant="primary" onPress={() => onMarkAdopted(req.id)}>
                      Mark adopted
                    </Button>
                  )}
                  {req.status === 'pending' && (
                    <Pressable onPress={() => onReject(req.id)} hitSlop={8}>
                      <Text style={[styles.passLink, { color: colors.textTertiary }]}>Pass</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </Sheet>
  );
}

function SummaryPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={styles.summaryPill}>
      <Text style={[styles.summaryCount, { color }]}>{count}</Text>
      <Text style={[styles.summaryLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: 12, paddingBottom: 8 },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    borderRadius: radius.lg,
  },
  summaryPill: { alignItems: 'center', gap: 2 },
  summaryCount: { fontSize: 18, fontWeight: '800' },
  summaryLabel: { fontSize: 11, fontWeight: '600' },
  help: { fontSize: 12.5, lineHeight: 18 },
  empty: { textAlign: 'center', paddingVertical: 24, fontSize: 13 },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 12,
    gap: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 15, fontWeight: '700' },
  time: { fontSize: 11.5, marginTop: 1 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  statusText: { fontSize: 11, fontWeight: '700' },
  message: { fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  passLink: { fontSize: 12, fontWeight: '600', paddingHorizontal: 4 },
});
