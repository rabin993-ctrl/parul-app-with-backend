import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { LegalDocumentView } from '../../components/legal/LegalDocumentView';
import { TERMS_OF_SERVICE } from '../../data/legalDocuments';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';

export function TermsOfServiceScreen() {
  const navigation = useNavigation();
  const tabBarPad = useTabBarScrollPadding();

  return (
    <LegalDocumentView
      document={TERMS_OF_SERVICE}
      onBack={() => navigation.goBack()}
      bottomInset={tabBarPad + 32}
    />
  );
}
