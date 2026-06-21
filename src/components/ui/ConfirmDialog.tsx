import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows } from '../../theme/tokens';
import { Button } from './Button';
import { ModalPresent } from './ModalScrim';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export type ConfirmRequest = {
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
};

let setConfirmRequestGlobal: React.Dispatch<React.SetStateAction<ConfirmRequest | null>> | null = null;

/** Imperative confirm — used where Alert/window.confirm are unreliable (web). */
export function requestConfirmDialog(request: ConfirmRequest) {
  if (setConfirmRequestGlobal) {
    setConfirmRequestGlobal(request);
    return true;
  }
  return false;
}

export function ConfirmDialogHost() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  useEffect(() => {
    setConfirmRequestGlobal = setRequest;
    return () => { setConfirmRequestGlobal = null; };
  }, []);

  const dismiss = () => setRequest(null);

  if (!request) return null;

  return (
    <ConfirmDialog
      visible
      title={request.title}
      body={request.body}
      confirmLabel={request.confirmLabel}
      cancelLabel={request.cancelLabel}
      destructive={request.destructive}
      onConfirm={() => {
        const run = request.onConfirm;
        dismiss();
        run();
      }}
      onCancel={dismiss}
    />
  );
}

export function ConfirmDialog({
  visible,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <ModalPresent onDismiss={onCancel} style={styles.overlay}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.md },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{body}</Text>
          <View style={styles.actions}>
            <Button variant="ghost" full onPress={onCancel}>{cancelLabel}</Button>
            <Button
              variant={destructive ? 'danger' : 'primary'}
              full
              onPress={onConfirm}
            >
              {confirmLabel}
            </Button>
          </View>
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
    maxWidth: 340,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 24,
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  body: { fontSize: 14, lineHeight: 21 },
  actions: { gap: 8, marginTop: 4 },
});
