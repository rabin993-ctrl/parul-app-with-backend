export type LegalSection = {
  title: string;
  paragraphs: string[];
};

export type LegalDocument = {
  id: 'privacy' | 'terms';
  title: string;
  summary: string;
  effectiveDate: string;
  sections: LegalSection[];
};

const CONTACT_EMAIL = 'support@parul.app';

export const PRIVACY_POLICY: LegalDocument = {
  id: 'privacy',
  title: 'Privacy Policy',
  summary:
    'How Parul collects, uses, and protects your information when you use our pet-adoption and community platform.',
  effectiveDate: 'June 19, 2026',
  sections: [
    {
      title: '1. Who we are',
      paragraphs: [
        'Parul ("Parul," "we," "us," or "our") operates a social platform for pet adoption, rescue coordination, community groups, messaging, and related services (the "Service").',
        `This Privacy Policy explains what information we collect, how we use it, and the choices you have. Questions? Contact us at ${CONTACT_EMAIL}.`,
      ],
    },
    {
      title: '2. Information we collect',
      paragraphs: [
        'Account information: name, username, email address, password (stored securely by our authentication provider), and profile details you choose to add such as bio, location, and avatar.',
        'Content you create: posts, comments, messages, adoption listings, rescue reports, photos, videos, and other media you upload or share in the Service.',
        'Pet and companion information: details about pets linked to your account, including names, species, medical notes you choose to share, and adoption or rescue history.',
        'Usage and device data: app interactions, feature usage, crash logs, device type, operating system, and general diagnostic information to keep the Service reliable.',
        'Location information: when you grant permission, we may use your device location to power nearby lost-and-found alerts and location-aware features. You can disable location access in your device settings.',
        'Communications: messages you send through in-app chat, adoption inquiries, vet consult threads, and support requests.',
      ],
    },
    {
      title: '3. How we use information',
      paragraphs: [
        'Provide and improve the Service, including feeds, circles, communities, adoption listings, rescue tools, notifications, and vet consult features.',
        'Personalize your experience, such as showing relevant posts, adoption opportunities, and community content.',
        'Keep users safe by enforcing community guidelines, investigating reports, and preventing fraud, abuse, or illegal activity.',
        'Send service-related messages such as account verification, security alerts, adoption updates, and notification preferences you enable.',
        'Analyze aggregated usage to understand how features perform and to develop new functionality.',
      ],
    },
    {
      title: '4. How we share information',
      paragraphs: [
        'With other users, according to your privacy settings. For example, profile visibility, post visibility, and messaging preferences control what others can see or send you.',
        'With service providers that help us operate the Service, such as hosting, authentication, media storage, analytics, and push notification delivery. These providers may only use data as needed to perform services for us.',
        'For legal and safety reasons, when we believe disclosure is required by law, to protect rights and safety, or to respond to valid legal requests.',
        'In connection with a business transfer, such as a merger or acquisition, subject to appropriate confidentiality protections.',
        'We do not sell your personal information.',
      ],
    },
    {
      title: '5. Your privacy controls',
      paragraphs: [
        'In Settings, you can manage profile visibility, post visibility, discoverability, online status, location sharing on posts, companion visibility, messaging permissions, and notification preferences.',
        'You can block other users to prevent them from interacting with you in the Service.',
        'You may delete content you posted where the product supports deletion, and you can request account deletion by contacting us.',
      ],
    },
    {
      title: '6. Data retention',
      paragraphs: [
        'We retain information for as long as your account is active or as needed to provide the Service, comply with legal obligations, resolve disputes, and enforce our agreements.',
        'When you delete content or your account, we remove or anonymize information within a reasonable period, except where retention is required by law or for legitimate business purposes such as safety records.',
      ],
    },
    {
      title: '7. Security',
      paragraphs: [
        'We use administrative, technical, and organizational measures designed to protect your information. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.',
      ],
    },
    {
      title: '8. Children',
      paragraphs: [
        'Parul is not directed to children under 13, and we do not knowingly collect personal information from children under 13. If you believe a child has provided us personal information, contact us so we can take appropriate action.',
      ],
    },
    {
      title: '9. International users',
      paragraphs: [
        'Your information may be processed in countries other than where you live. By using the Service, you consent to this processing subject to applicable law and this Privacy Policy.',
      ],
    },
    {
      title: '10. Changes to this policy',
      paragraphs: [
        'We may update this Privacy Policy from time to time. We will post the revised policy in the app and update the effective date. Continued use of the Service after changes become effective means you accept the updated policy.',
      ],
    },
    {
      title: '11. Contact us',
      paragraphs: [
        `For privacy questions or requests, email ${CONTACT_EMAIL}.`,
      ],
    },
  ],
};

export const TERMS_OF_SERVICE: LegalDocument = {
  id: 'terms',
  title: 'Terms of Service',
  summary:
    'The rules and conditions for using Parul, our community for pet adoption, rescue, and care.',
  effectiveDate: 'June 19, 2026',
  sections: [
    {
      title: '1. Acceptance of terms',
      paragraphs: [
        'By creating an account or using Parul, you agree to these Terms of Service ("Terms") and our Privacy Policy. If you do not agree, do not use the Service.',
        'You must be at least 13 years old to use Parul. If you are under the age of majority where you live, you may use the Service only with permission of a parent or legal guardian.',
      ],
    },
    {
      title: '2. The Service',
      paragraphs: [
        'Parul provides tools for social networking, pet profiles, adoption listings, rescue coordination, messaging, community groups, circles, notifications, and related features. Some features may be labeled beta, coming soon, or otherwise limited.',
        'We may modify, suspend, or discontinue any part of the Service at any time. We try to give reasonable notice when changes materially affect your use.',
      ],
    },
    {
      title: '3. Your account',
      paragraphs: [
        'You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account.',
        'You agree to provide accurate information and to keep your profile details up to date where relevant to adoption, rescue, or safety features.',
        'You may not impersonate others, create accounts for unauthorized purposes, or share access to your account in ways that violate these Terms.',
      ],
    },
    {
      title: '4. User content and license',
      paragraphs: [
        'You retain ownership of content you post, upload, or submit ("User Content").',
        'By posting User Content, you grant Parul a non-exclusive, worldwide, royalty-free license to host, store, reproduce, display, and distribute that content solely to operate, promote, and improve the Service.',
        'You represent that you have the rights needed to post your User Content and that it does not violate these Terms or applicable law.',
      ],
    },
    {
      title: '5. Community standards',
      paragraphs: [
        'Parul is built for animal welfare and respectful community interaction. You agree not to:',
        '• Post content that is unlawful, harassing, hateful, sexually explicit, or exploitative of people or animals.',
        '• Share false adoption, rescue, or medical information, or misrepresent ownership, availability, or intent.',
        '• Engage in animal trafficking, breeding scams, or any activity that harms animals or violates animal welfare laws.',
        '• Spam, scrape, reverse engineer, or attempt to disrupt the Service or other users\' experience.',
        '• Collect personal information from users without consent or use the Service for unauthorized commercial solicitation.',
        'We may remove content, restrict features, or suspend or terminate accounts that violate these standards or create safety risks.',
      ],
    },
    {
      title: '6. Adoption, rescue, and vet features',
      paragraphs: [
        'Parul helps connect people interested in adoption, rescue, and pet care. We do not guarantee the accuracy of listings, the suitability of any pet or adopter, or the outcome of any arrangement made through the Service.',
        'Users are responsible for their own due diligence, local laws, contracts, home checks, vaccinations, and transfer of ownership.',
        'Vet consult and informational features are not a substitute for emergency veterinary care or an in-person examination. In an emergency, contact a licensed veterinarian or emergency clinic immediately.',
      ],
    },
    {
      title: '7. Messaging and transactions',
      paragraphs: [
        'Communications between users are primarily between those users. Exercise caution when sharing contact details, meeting in person, or exchanging money.',
        'Unless explicitly stated otherwise, Parul is not a party to adoption fees, donations, purchases, or other transactions between users.',
      ],
    },
    {
      title: '8. Intellectual property',
      paragraphs: [
        'Parul and its branding, software, design, and other materials are owned by Parul or its licensors and are protected by applicable intellectual property laws. These Terms do not grant you rights to our trademarks or proprietary materials except as needed to use the Service.',
      ],
    },
    {
      title: '9. Third-party services',
      paragraphs: [
        'The Service may integrate with or link to third-party services. Your use of those services is governed by their own terms and policies. We are not responsible for third-party services.',
      ],
    },
    {
      title: '10. Disclaimers',
      paragraphs: [
        'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
        'We do not warrant that the Service will be uninterrupted, error-free, or free of harmful components.',
      ],
    },
    {
      title: '11. Limitation of liability',
      paragraphs: [
        'TO THE MAXIMUM EXTENT PERMITTED BY LAW, PARUL AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AND PARTNERS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.',
        'Our total liability for any claim relating to the Service is limited to the greater of the amount you paid us for the Service in the twelve months before the claim or one hundred U.S. dollars (USD $100), if applicable.',
      ],
    },
    {
      title: '12. Indemnity',
      paragraphs: [
        'You agree to indemnify and hold harmless Parul from claims, damages, losses, and expenses (including reasonable legal fees) arising from your User Content, your use of the Service, or your violation of these Terms or applicable law.',
      ],
    },
    {
      title: '13. Termination',
      paragraphs: [
        'You may stop using the Service at any time. We may suspend or terminate your access if you violate these Terms, create risk for other users or the platform, or where required by law.',
        'Sections that by their nature should survive termination will continue to apply, including content licenses granted for previously shared content, disclaimers, limitations of liability, and indemnity.',
      ],
    },
    {
      title: '14. Governing law',
      paragraphs: [
        'These Terms are governed by the laws applicable where Parul operates, without regard to conflict-of-law principles, except where mandatory local consumer protections apply.',
      ],
    },
    {
      title: '15. Changes to these Terms',
      paragraphs: [
        'We may update these Terms from time to time. If changes are material, we will provide notice through the app or by other reasonable means. Continued use after the effective date of updated Terms constitutes acceptance.',
      ],
    },
    {
      title: '16. Contact',
      paragraphs: [
        `Questions about these Terms? Email ${CONTACT_EMAIL}.`,
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS = {
  privacy: PRIVACY_POLICY,
  terms: TERMS_OF_SERVICE,
} as const;

export type LegalDocumentId = keyof typeof LEGAL_DOCUMENTS;
