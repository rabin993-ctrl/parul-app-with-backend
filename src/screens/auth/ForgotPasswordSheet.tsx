import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { fonts } from '../../theme/fonts';
import { MOBILE_INPUT_FONT_SIZE, radius, spacing } from '../../theme/tokens';
import { Button } from '../../components/ui/Button';
import { Sheet } from '../../components/ui/Sheet';
import { useAuth } from '../../context/AuthContext';

const EMAIL_RE = /\S+@\S+\.\S+/;

export function ForgotPasswordSheet({
  visible,
  initialEmail,
  onClose,
}: {
  visible: boolean;
  initialEmail?: string;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState(initialEmail ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setEmail(initialEmail ?? '');
    setError(null);
    setLoading(false);
    setSent(false);
  }, [visible, initialEmail]);

  async function onSubmit() {
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }
    setError(null);
    setLoading(true);
    const res = await resetPassword(trimmed);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setSent(true);
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Forgot password"
      contentKey={sent ? 'sent' : 'form'}
      footer={(
        <Button
          full
          size="lg"
          loading={loading}
          onPress={sent ? onClose : onSubmit}
        >
          {sent ? 'Done' : 'Send reset link'}
        </Button>
      )}
    >
      <View style={styles.body}>
        {sent ? (
          <>
            <Text style={[styles.message, { color: colors.text }]}>
              Check your inbox
            </Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              We sent a password reset link to{' '}
              <Text style={{ color: colors.text, fontFamily: fonts.semibold }}>
                {email.trim()}
              </Text>
              . Open the link in the email to choose a new password.
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              Enter the email for your account and we&apos;ll send you a link to reset your password.
            </Text>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
              <View
                style={[
                  styles.inputWrap,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@email.com"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoFocus={Platform.OS === 'web'}
                  style={[styles.input, { color: colors.text }]}
                />
              </View>
            </View>
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
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.lg },
  message: { fontSize: 17, fontFamily: fonts.bold },
  hint: { fontSize: 14.5, fontFamily: fonts.regular, lineHeight: 21 },
  field: { gap: 6 },
  label: { fontSize: 12.5, fontFamily: fonts.semibold, letterSpacing: 0.2 },
  inputWrap: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  input: {
    fontSize: MOBILE_INPUT_FONT_SIZE,
    fontFamily: fonts.regular,
    paddingVertical: 13,
  },
  error: { fontSize: 13.5, fontFamily: fonts.medium, marginTop: -spacing.xs },
});
