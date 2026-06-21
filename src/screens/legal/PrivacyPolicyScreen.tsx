import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { LegalDocumentView } from '../../components/legal/LegalDocumentView';
import { PRIVACY_POLICY } from '../../data/legalDocuments';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';

export function PrivacyPolicyScreen() {
  const navigation = useNavigation();
  const tabBarPad = useTabBarScrollPadding();

  return (
    <LegalDocumentView
      document={PRIVACY_POLICY}
      onBack={() => navigation.goBack()}
      bottomInset={tabBarPad + 32}
    />
  );
}
