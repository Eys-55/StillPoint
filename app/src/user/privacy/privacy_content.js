// FAQ Format for Privacy Policy
export const privacyContent = {
  title: "Privacy Policy FAQs",
  lastUpdated: new Date().toLocaleDateString(), // Keep dynamic date generation
  faqs: [
    {
      id: 'faq-1',
      question: 'What information do you collect?',
      answer: [
        'We collect information you provide directly:',
        {
          type: 'list',
          items: [
            'Account Information: Your email address and chosen display name (via Firebase Authentication).',
            'Questionnaire Responses: Your answers to help personalize the AI.',
            'Chat Messages: Your conversations with the AI assistant "Aura".',
            'Summaries: AI-generated titles and summaries of your chats.',
          ]
        },
        'We use Google Firebase (Authentication, Firestore) and Google Cloud Vertex AI. These services might collect technical data (like IP addresses, device info) according to Google\'s Privacy Policy.'
      ]
    },
    {
      id: 'faq-2',
      question: 'How is my information used?',
      answer: [
        'Your information is used solely to:',
        {
          type: 'list',
          items: [
            'Operate and improve the App (e.g., enable chat, store your conversations).',
            'Personalize your experience (tailor AI responses).',
            'Generate summaries for your review.',
            'Securely authenticate your account.',
            'Communicate essential information (like email verification).',
          ]
        },
      ]
    },
    {
      id: 'faq-3',
      question: 'Is my chat data shared?',
      answer: 'Your individual chat messages, questionnaire answers, and summaries are confidential. We do not share them with third parties, except when required by law or to provide the service via our necessary cloud providers (Google). We might use anonymized or aggregated data (which doesn\'t identify you) for research or to improve the AI model.'
    },
    {
      id: 'faq-4',
      question: 'How is my data stored and secured?',
      answer: 'Your data is stored in Google\'s Firestore database. Access is protected by Firebase security rules linked to your user authentication. We rely on Google Cloud\'s security infrastructure. While we take strong measures, remember no online storage is 100% impenetrable.'
    },
    {
      id: 'faq-5',
      question: 'How long is my data kept?',
      answer: 'We keep your data as long as your account is active. If you delete your account (via the Settings page), your authentication record and associated Firestore data (messages, summaries, questionnaire responses) will be permanently removed, subject to Google\'s standard data deletion processes.'
    },
    {
      id: 'faq-6',
      question: 'Can I access or delete my data?',
      answer: 'Yes. You can view and edit your questionnaire answers in the "Insights" section and update your display name in "Settings". You can delete individual conversations and summaries from the Chat sidebar or Summaries list. You can delete your entire account and all associated data via the "Settings" page.'
    },
    {
      id: 'faq-7',
      question: 'Is the app open source?',
      answer: 'Yes, this application is open source. You can review the code to see exactly how your data is managed. [Optional: Add link to repository if public].' // Placeholder kept
    },
    {
      id: 'faq-8',
      question: 'Who can I contact with privacy concerns?',
      answer: 'If you have any questions or concerns about this policy or your data, please contact us at [Your Contact Email/Method Here - IMPORTANT: Add a real contact method].' // Placeholder kept
    },
    {
      id: 'faq-9',
      question: 'How is my identity protected in relation to my conversations?',
      answer: 'We prioritize your privacy. The only personally identifiable information we directly collect is the email address you use to create and log into your account (via Firebase Authentication). Your chat messages, summaries, and questionnaire answers are stored separately in Firestore and associated with your account using an internal User ID provided by Firebase, *not* your email address. This means your conversation data itself does not contain your email, adding a layer of security and privacy.'
    }
  ]
};