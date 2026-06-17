import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { fonts } from '../../theme/fonts';
import { radius, spacing, MOBILE_INPUT_FONT_SIZE } from '../../theme/tokens';
import { AppLogo } from '../../components/ui/AppLogo';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

export function SetNewPasswordScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setLoading(true);
    const res = await updatePassword(password);
    setLoading(false);
    if (res.error) setError(res.error);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.xl2, paddingBottom: insets.bottom + spacing.xl2 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <AppLogo size={64} showWordmark />
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Choose a new password for your account.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>New password</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                style={[styles.input, { color: colors.text }]}
              />
              <Pressable hitSlop={8} onPress={() => setShowPassword(s => !s)}>
                <Text style={[styles.show, { color: colors.primary }]}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Confirm password</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Repeat your password"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                style={[styles.input, { color: colors.text }]}
              />
            </View>
          </View>

          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

          <Button full size="lg" loading={loading} onPress={onSubmit} style={styles.submit}>
            Save new password
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl2,
    gap: spacing.xl2,
  },
  header: { alignItems: 'center', gap: spacing.sm },
  tagline: { fontSize: 14.5, fontFamily: fonts.regular, textAlign: 'center' },
  form: { gap: spacing.lg },
  field: { gap: 6 },
  label: { fontSize: 12.5, fontFamily: fonts.semibold, letterSpacing: 0.2 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingRight: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: MOBILE_INPUT_FONT_SIZE,
    fontFamily: fonts.regular,
    paddingVertical: 13,
  },
  show: { fontSize: 13.5, fontFamily: fonts.semibold },
  error: { fontSize: 13.5, fontFamily: fonts.medium, marginTop: -spacing.xs },
  submit: { marginTop: spacing.xs },
});
