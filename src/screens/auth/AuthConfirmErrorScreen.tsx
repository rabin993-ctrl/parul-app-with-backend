import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { fonts } from '../../theme/fonts';
import { spacing } from '../../theme/tokens';
import { AppLogo } from '../../components/ui/AppLogo';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

export function AuthConfirmErrorScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { authConfirmError, clearAuthConfirm } = useAuth();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bg,
          paddingTop: insets.top + spacing.xl2,
          paddingBottom: insets.bottom + spacing.xl2,
        },
      ]}
    >
      <AppLogo size={64} showWordmark />
      <Text style={[styles.title, { color: colors.text }]}>Link expired or invalid</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {authConfirmError ?? 'This sign-in link may have already been used or has expired.'}
      </Text>
      <Button full onPress={clearAuthConfirm} style={styles.button}>
        Back to sign in
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl2,
    gap: spacing.lg,
  },
  title: { fontSize: 20, fontFamily: fonts.bold, textAlign: 'center' },
  message: { fontSize: 15, fontFamily: fonts.regular, textAlign: 'center', lineHeight: 22 },
  button: { alignSelf: 'stretch', marginTop: spacing.sm },
});
