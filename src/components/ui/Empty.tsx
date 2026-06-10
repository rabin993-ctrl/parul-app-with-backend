import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '../icons/Icon';
import { useTheme } from '../../theme/ThemeContext';

interface EmptyProps {
  icon?: string;
  title: string;
  body?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}

export function Empty({ icon = 'paw-line', title, body, children, action }: EmptyProps) {
  const { colors } = useTheme();
  const sub = body ?? children;
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { backgroundColor: colors.primary + '22' }]}>
        <Icon name={icon} size={36} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {sub && <Text style={[styles.sub, { color: colors.textSecondary }]}>{sub}</Text>}
      {action && <View style={{ marginTop: 18 }}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 44, paddingHorizontal: 28 },
  iconWrap: { width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  sub: { fontSize: 13.5, textAlign: 'center', lineHeight: 20, maxWidth: 240 },
});
