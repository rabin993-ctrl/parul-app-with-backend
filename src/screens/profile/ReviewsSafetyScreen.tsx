import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Card } from '../../components/ui/Card';
import { Stars } from '../../components/ui/Stars';
import { Empty } from '../../components/ui/Empty';
import { AlertBanner } from '../../components/ui/AlertBanner';
import { Avatar } from '../../components/ui/Avatar';
import { ProfileSubHeader, ProfileTrustBadge } from '../../components/profile/ProfileChrome';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';
import { Icon } from '../../components/icons/Icon';
import { useCurrentUserProfile } from '../../context/CurrentUserProfileContext';
import { useReviews } from '../../hooks/useReviews';

export function ReviewsSafetyScreen() {
  const { colors } = useTheme();
  const { me } = useCurrentUserProfile();
  const { trust, reviews } = useReviews(me.id || undefined);
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader title="Reviews & Safety" rightIcon="shield" />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
      >
        <Card>
          <View style={styles.trustRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.trustTitle, { color: colors.text }]}>Profile reputation</Text>
              <ProfileTrustBadge trust={trust} />
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.ratingBig, { color: colors.text }]}>{trust.rating.toFixed(1)}</Text>
              <Stars value={trust.rating} size={14} />
              <Text style={[styles.ratingCount, { color: colors.textSecondary }]}>{trust.reviewCount} reviews</Text>
            </View>
          </View>
        </Card>

        {trust.status === 'warning' || trust.status === 'flagged' ? (
          <AlertBanner
            tone="warning"
            icon="flag"
            title="Profile under review"
            body="Multiple reports were received. Please respond to open cases to restore full visibility."
          />
        ) : (
          <View style={[styles.safetyNote, { backgroundColor: colors.successBg, borderColor: colors.success + '30' }]}>
            <Icon name="shield" size={18} color={colors.success} />
            <Text style={[styles.safetyText, { color: colors.text }]}>
              Your profile meets community safety standards. Keep building trust with honest updates.
            </Text>
          </View>
        )}

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>COMMUNITY REVIEWS</Text>

        {reviews.length === 0 ? (
          <Empty icon="star" title="No reviews yet" body="Reviews from adoptions will appear here." />
        ) : (
          <View style={{ gap: 10 }}>
            {reviews.map(r => (
              <Card key={r.id} padding={12}>
                <View style={styles.reviewHead}>
                  <Avatar user={{ name: r.authorName, tint: r.authorTint }} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.reviewer, { color: colors.text }]}>{r.authorName}</Text>
                    <Stars value={r.rating} size={12} />
                  </View>
                  <Text style={[styles.reviewTime, { color: colors.textTertiary }]}>
                    {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
                <Text style={[styles.reviewBody, { color: colors.textSecondary }]}>{r.body}</Text>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 12, paddingTop: 4 },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  trustTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  ratingBig: { fontSize: 32, fontWeight: '900' },
  ratingCount: { fontSize: 12, marginTop: 4 },
  safetyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  safetyText: { flex: 1, fontSize: 13.5, lineHeight: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewer: { fontSize: 14, fontWeight: '700' },
  reviewTime: { fontSize: 12 },
  reviewBody: { fontSize: 13.5, lineHeight: 20 },
});
