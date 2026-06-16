import React from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import { Button } from './Button';
import { ModalPresent } from './ModalScrim';

type ComingSoonModalProps = {
  visible: boolean;
  onClose: () => void;
  icon?: string;
  title?: string;
  body?: string;
};

export function ComingSoonModal({
  visible,
  onClose,
  icon = 'medical',
  title = 'Coming Soon',
  body = 'This feature is on the way. Check back soon.',
}: ComingSoonModalProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <ModalPresent onDismiss={onClose} style={styles.overlay}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.md },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.infoBg }]}>
            <Icon name={icon} size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{body}</Text>
          <Button full onPress={onClose}>Got it</Button>
        </View>
      </ModalPresent>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 20, fontWeight: '800' },
  body: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 4 },
});
