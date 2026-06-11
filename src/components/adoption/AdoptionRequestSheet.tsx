import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { CompanionAvatar } from '../ui/Avatar';
import { AdoptionListing } from '../../data/adoptionData';

export function AdoptionRequestSheet({
  visible,
  listing,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  listing: AdoptionListing | null;
  onClose: () => void;
  onSubmit: (message: string) => void;
}) {
  const { colors } = useTheme();
  const [message, setMessage] = useState('');

  if (!listing) return null;

  const canSubmit = message.trim().length >= 12;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(message.trim());
    setMessage('');
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={`Request ${listing.name}`}
      footer={(
        <View style={styles.footer}>
          <Button variant="outline" onPress={onClose}>Cancel</Button>
          <Button variant="primary" style={{ flex: 1 }} disabled={!canSubmit} onPress={handleSubmit}>
            Send request
          </Button>
        </View>
      )}
    >
      <View style={styles.body}>
        <View style={[styles.petRow, { backgroundColor: colors.surface2 }]}>
          <CompanionAvatar
            pet={{ icon: listing.icon, tint: listing.tint, name: listing.name }}
            size={48}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.petName, { color: colors.text }]}>{listing.name}</Text>
            <Text style={[styles.petMeta, { color: colors.textSecondary }]}>
              {listing.breed} · {listing.location}
            </Text>
          </View>
        </View>

        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Tell the poster why {listing.name} would be a great fit. They can queue, approve, or chat with you in Requests.
        </Text>

        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Share your home, experience, and why you want to adopt…"
          placeholderTextColor={colors.textTertiary}
          style={[
            styles.input,
            { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          multiline
          textAlignVertical="top"
        />
        <Text style={[styles.counter, { color: colors.textTertiary }]}>
          {message.trim().length}/12 min characters
        </Text>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12 },
  petRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.lg,
  },
  petName: { fontSize: 16, fontWeight: '800' },
  petMeta: { fontSize: 12.5, marginTop: 2 },
  hint: { fontSize: 13, lineHeight: 19 },
  input: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 14,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 120,
  },
  counter: { fontSize: 11.5, textAlign: 'right' },
  footer: { flexDirection: 'row', gap: 10 },
});
