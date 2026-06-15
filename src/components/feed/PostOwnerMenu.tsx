import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Icon } from '../icons/Icon';

export function confirmDeletePost(onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm('Delete this post? This cannot be undone.')) {
      onConfirm();
    }
    return;
  }
  Alert.alert('Delete post?', 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

export function PostOwnerMenu({
  onEdit,
  onDelete,
  align = 'right',
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  align?: 'right' | 'inline';
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  if (!onEdit && !onDelete) return null;

  return (
    <View style={align === 'inline' ? styles.inlineWrap : styles.wrap}>
      <Pressable
        onPress={() => setOpen(v => !v)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Post options"
        style={({ pressed }) => [{ padding: 4, opacity: pressed ? 0.7 : 1 }]}
      >
        <Icon name="more-horizontal" size={18} color={colors.textTertiary} />
      </Pressable>

      {open ? (
        <View
          style={[
            styles.menu,
            align === 'inline' ? styles.menuInline : styles.menuFloating,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {onEdit ? (
            <Pressable
              onPress={() => { setOpen(false); onEdit(); }}
              style={[styles.item, onDelete && { borderBottomColor: colors.border }]}
            >
              <Icon name="edit" size={15} color={colors.text} />
              <Text style={[styles.itemText, { color: colors.text }]}>Edit post</Text>
            </Pressable>
          ) : null}
          {onDelete ? (
            <Pressable
              onPress={() => {
                setOpen(false);
                confirmDeletePost(onDelete);
              }}
              style={styles.item}
            >
              <Icon name="trash" size={15} color={colors.danger} />
              <Text style={[styles.itemText, { color: colors.danger }]}>Delete post</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    zIndex: 2,
  },
  inlineWrap: {
    position: 'relative',
  },
  menu: {
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 160,
    overflow: 'hidden',
    zIndex: 10,
  },
  menuFloating: {
    position: 'absolute',
    top: 28,
    right: 0,
  },
  menuInline: {
    position: 'absolute',
    top: 28,
    right: 0,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
