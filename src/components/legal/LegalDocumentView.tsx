import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import { ProfileSubHeader } from '../profile/ProfileChrome';
import type { LegalDocument } from '../../data/legalDocuments';

type LegalDocumentViewProps = {
  document: LegalDocument;
  onBack?: () => void;
  bottomInset?: number;
};

export function LegalDocumentView({
  document,
  onBack,
  bottomInset = 32,
}: LegalDocumentViewProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader title={document.title} onBack={onBack} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { backgroundColor: colors.primary + '12' }]}>
          <Icon name="shield" size={28} color={colors.primary} />
          <Text style={[styles.heroTitle, { color: colors.text }]}>{document.title}</Text>
          <Text style={[styles.heroBody, { color: colors.textSecondary }]}>
            {document.summary}
          </Text>
          <Text style={[styles.effectiveDate, { color: colors.textTertiary }]}>
            Effective {document.effectiveDate}
          </Text>
        </View>

        <View style={styles.sections}>
          {document.sections.map(section => (
            <View
              key={section.title}
              style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
              {section.paragraphs.map((paragraph, index) => (
                <Text
                  key={`${section.title}-${index}`}
                  style={[styles.paragraph, { color: colors.textSecondary }]}
                >
                  {paragraph}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 16 },
  hero: {
    padding: 18,
    borderRadius: radius.lg,
    alignItems: 'center',
    gap: 8,
  },
  heroTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  heroBody: { fontSize: 13.5, lineHeight: 20, textAlign: 'center' },
  effectiveDate: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  sections: { gap: 12 },
  sectionCard: {
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', lineHeight: 21 },
  paragraph: { fontSize: 14, lineHeight: 21 },
});
