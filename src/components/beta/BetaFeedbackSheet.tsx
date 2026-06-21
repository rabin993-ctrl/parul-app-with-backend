import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';
import { fonts } from '../../theme/fonts';
import { MOBILE_INPUT_FONT_SIZE, radius, spacing } from '../../theme/tokens';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

type AreaUsed = 'feed' | 'adoption' | 'circles' | 'communities' | 'profile' | 'rescue';
type Recommend = 'yes' | 'maybe' | 'no';

const AREAS: { id: AreaUsed; label: string }[] = [
  { id: 'feed', label: 'Feed' },
  { id: 'adoption', label: 'Adoption' },
  { id: 'circles', label: 'Circles' },
  { id: 'communities', label: 'Communities' },
  { id: 'profile', label: 'Profile' },
  { id: 'rescue', label: 'Rescue' },
];

const RECOMMEND_OPTIONS: { id: Recommend; label: string }[] = [
  { id: 'yes', label: 'Yes' },
  { id: 'maybe', label: 'Maybe' },
  { id: 'no', label: 'No' },
];

function RatingPaw({
  filled,
  fillColor,
  emptyColor,
  size,
}: {
  filled: boolean;
  fillColor: string;
  emptyColor: string;
  size: number;
}) {
  const color = filled ? fillColor : emptyColor;
  if (filled) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Ellipse cx="6.2" cy="9.4" rx="2.1" ry="2.7" transform="rotate(-18 6.2 9.4)" fill={color} />
        <Ellipse cx="10" cy="6.4" rx="2.1" ry="2.8" fill={color} />
        <Ellipse cx="14" cy="6.4" rx="2.1" ry="2.8" fill={color} />
        <Ellipse cx="17.8" cy="9.4" rx="2.1" ry="2.7" transform="rotate(18 17.8 9.4)" fill={color} />
        <Path
          d="M12 11.4c2.7 0 5 1.9 5 4.3 0 2-1.7 3.1-3.4 3.1-0.7 0-1.1-.3-1.6-.3s-.9.3-1.6.3C8.7 18.8 7 17.7 7 15.7c0-2.4 2.3-4.3 5-4.3Z"
          fill={color}
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Ellipse
        cx="6.4"
        cy="9.6"
        rx="1.8"
        ry="2.3"
        transform="rotate(-18 6.4 9.6)"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Ellipse cx="10" cy="6.8" rx="1.8" ry="2.4" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <Ellipse cx="14" cy="6.8" rx="1.8" ry="2.4" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <Ellipse
        cx="17.6"
        cy="9.6"
        rx="1.8"
        ry="2.3"
        transform="rotate(18 17.6 9.6)"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Path
        d="M12 11.6c2.4 0 4.5 1.7 4.5 3.9 0 1.8-1.5 2.8-3 2.8-.7 0-1-.3-1.5-.3s-.8.3-1.5.3c-1.5 0-3-1-3-2.8 0-2.2 2.1-3.9 4.5-3.9Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BetaFeedbackSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [areasUsed, setAreasUsed] = useState<AreaUsed[]>([]);
  const [issues, setIssues] = useState('');
  const [fixFirst, setFixFirst] = useState('');
  const [recommend, setRecommend] = useState<Recommend | null>(null);
  const [extraNotes, setExtraNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setRating(0);
    setAreasUsed([]);
    setIssues('');
    setFixFirst('');
    setRecommend(null);
    setExtraNotes('');
    setError(null);
    setLoading(false);
    setSent(false);
  }, [visible]);

  function toggleArea(id: AreaUsed) {
    setAreasUsed(prev => (
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    ));
  }

  async function onSubmit() {
    if (!user) {
      setError('Sign in to send feedback.');
      return;
    }
    if (rating < 1) {
      setError('Please rate Parul from 1 to 5 paws.');
      return;
    }
    if (areasUsed.length === 0) {
      setError('Select at least one area you used today.');
      return;
    }
    const issuesTrimmed = issues.trim();
    if (issuesTrimmed.length < 3) {
      setError('Tell us if anything was broken, slow, or confusing.');
      return;
    }
    const fixFirstTrimmed = fixFirst.trim();
    if (fixFirstTrimmed.length < 3) {
      setError('Share one thing we should fix first.');
      return;
    }
    if (!recommend) {
      setError('Let us know if you would recommend Parul to a friend.');
      return;
    }

    setError(null);
    setLoading(true);
    const extraTrimmed = extraNotes.trim();
    const { error: insertError } = await supabase.from('beta_feedback').insert({
      user_id: user.id,
      rating,
      areas_used: areasUsed,
      issues: issuesTrimmed,
      fix_first: fixFirstTrimmed,
      recommend,
      extra_notes: extraTrimmed || null,
      app_platform: Platform.OS,
    });
    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSent(true);
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Beta feedback"
      contentKey={sent ? 'sent' : 'form'}
      footerExpandBody
      hideScrollIndicator
      footer={(
        <Button
          full
          size="lg"
          loading={loading}
          onPress={sent ? onClose : () => { void onSubmit(); }}
        >
          {sent ? 'Done' : 'Send feedback'}
        </Button>
      )}
    >
      <View style={styles.body}>
        {sent ? (
          <>
            <Text style={[styles.message, { color: colors.text }]}>
              Thank you!
            </Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              Your feedback helps us improve Parul before launch.
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              Help us improve Parul during beta. Answer honestly — short answers are fine.
            </Text>

            <Text style={[styles.label, { color: colors.text }]}>
              How would you rate Parul so far?
            </Text>
            <View style={styles.pawRow}>
              {[1, 2, 3, 4, 5].map(n => (
                <Pressable key={n} onPress={() => setRating(n)} hitSlop={8} style={styles.pawHit}>
                  <RatingPaw
                    filled={n <= rating}
                    fillColor={colors.warning}
                    emptyColor={colors.textTertiary}
                    size={32}
                  />
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.text }]}>
              What did you use today?
            </Text>
            <View style={styles.chipRow}>
              {AREAS.map(area => {
                const active = areasUsed.includes(area.id);
                return (
                  <Pressable
                    key={area.id}
                    onPress={() => toggleArea(area.id)}
                    style={[
                      styles.chip,
                      {
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? colors.infoBg : colors.surface,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? colors.primary : colors.text,
                        fontFamily: fonts.semibold,
                        fontSize: 13,
                      }}
                    >
                      {area.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label, { color: colors.text }]}>
              Anything broken, slow, or confusing?
            </Text>
            <TextInput
              value={issues}
              onChangeText={setIssues}
              placeholder="Describe what went wrong or felt unclear…"
              placeholderTextColor={colors.textTertiary}
              multiline
              textAlignVertical="top"
              style={[
                styles.input,
                styles.inputShort,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  fontSize: MOBILE_INPUT_FONT_SIZE,
                },
              ]}
            />

            <Text style={[styles.label, { color: colors.text }]}>
              One thing we should fix first?
            </Text>
            <TextInput
              value={fixFirst}
              onChangeText={setFixFirst}
              placeholder="Your top priority for us…"
              placeholderTextColor={colors.textTertiary}
              multiline
              textAlignVertical="top"
              style={[
                styles.input,
                styles.inputShort,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  fontSize: MOBILE_INPUT_FONT_SIZE,
                },
              ]}
            />

            <Text style={[styles.label, { color: colors.text }]}>
              Would you recommend Parul to a friend?
            </Text>
            <View style={styles.chipRow}>
              {RECOMMEND_OPTIONS.map(option => {
                const active = recommend === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => setRecommend(option.id)}
                    style={[
                      styles.chip,
                      {
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? colors.infoBg : colors.surface,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? colors.primary : colors.text,
                        fontFamily: fonts.semibold,
                        fontSize: 13,
                      }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label, { color: colors.text }]}>
              Anything else? (optional)
            </Text>
            <TextInput
              value={extraNotes}
              onChangeText={setExtraNotes}
              placeholder="Other thoughts, ideas, or praise…"
              placeholderTextColor={colors.textTertiary}
              multiline
              textAlignVertical="top"
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  fontSize: MOBILE_INPUT_FONT_SIZE,
                },
              ]}
            />

            {error ? (
              <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
            ) : null}
          </>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  message: { fontSize: 18, fontFamily: fonts.semibold },
  hint: { fontSize: 14, lineHeight: 20 },
  label: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    marginTop: spacing.md,
    lineHeight: 20,
  },
  pawRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  pawHit: { padding: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  inputShort: {
    minHeight: 84,
  },
  error: { fontSize: 13, marginTop: spacing.sm },
});
