import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles'; // To access theme properties

function Privacy() {
  const theme = useTheme(); // Access the current theme (light/dark)

  return (
    // Use Box for full height and centering if needed, or just Container
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)', /* Adjust 64px based on potential header height */ bgcolor: 'background.default', py: 4 }}>
       <Container component="main" maxWidth="md" sx={{ flexGrow: 1 }}>
        <Paper sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 4, boxShadow: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'medium', mb: 3 }}>
            Privacy Policy
          </Typography>
          <Typography variant="body1" paragraph color="text.secondary">
            Last Updated: {new Date().toLocaleDateString()} {/* Example: Add last updated date */}
          </Typography>
          <Typography variant="body1" paragraph>
            Welcome to Aura Companion ("the App"). This app respects your privacy and is committed to protecting your personal data. Your personal data is handled securely and in accordance with privacy regulations. This policy outlines how we collect, use, store, and protect your information.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Information We Collect
          </Typography>
          <Typography variant="body1" paragraph>
            We collect information you provide directly to us, such as:
            <ul>
              <li>Account Information: Your email address and display name when you register and log in via Firebase Authentication.</li>
              <li>Questionnaire Responses: Answers you provide to the initial questionnaire, used for personalizing your AI interactions.</li>
              <li>Chat Messages: Conversations you have with the AI chatbot "Aura".</li>
              <li>Summaries: AI-generated summaries and titles of your chat conversations.</li>
            </ul>
             We utilize Google's Firebase services (Authentication, Firestore) and Google Cloud Vertex AI. These services may collect technical data (like IP addresses, device information) as part of their standard operation, governed by Google's Privacy Policy.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            How We Use Your Information
          </Typography>
          <Typography variant="body1" paragraph>
            All information you provide is used solely for:
            <ul>
              <li>Providing and improving the App's functionality (e.g., enabling chat, storing conversations).</li>
              <li>Personalizing your experience (e.g., tailoring AI responses based on your profile and past interactions).</li>
              <li>Generating insights and summaries for your reflection.</li>
              <li>Authenticating your account and ensuring security.</li>
              <li>Communicating with you (e.g., email verification).</li>
            </ul>
            Your individual chat messages, questionnaire answers, and summaries are considered confidential and are not shared with third parties, except as required by law or as necessary to provide the service through our integrated cloud providers (Google). Anonymized or aggregated data might be used for research or improving the AI model, but only in a way that does not identify you personally.
          </Typography>

           <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Data Storage and Security
          </Typography>
          <Typography variant="body1" paragraph>
            Your data (account info, questionnaire answers, chat messages, summaries) is stored securely within Google's Firestore database, protected by Firebase security rules that restrict access based on user authentication. We rely on Google Cloud's robust security measures to protect data integrity and confidentiality. While we strive to use commercially acceptable means to protect your Personal Data, remember that no method of transmission over the Internet or method of electronic storage is 100% secure.
          </Typography>

           <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Data Retention and Deletion
          </Typography>
          <Typography variant="body1" paragraph>
            We retain your data as long as your account is active. You can delete your account at any time through the Settings page. Deleting your account will permanently remove your authentication record and associated data stored in Firestore (messages, summaries, questionnaire answers) subject to Google's data deletion timelines.
          </Typography>

           <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Your Rights
          </Typography>
          <Typography variant="body1" paragraph>
            You have the right to access, update, or delete your information through the App's interface (e.g., editing questionnaire answers in Insights, updating your display name in Settings, deleting your account).
          </Typography>

           <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Open Source
          </Typography>
          <Typography variant="body1" paragraph>
            This application is open source. You can review the code to understand how your data is handled. [Optional: Add link to repository if public].
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Contact Us
          </Typography>
          <Typography variant="body1" paragraph>
            For any concerns or further details regarding this Privacy Policy, please contact our support team at [Your Contact Email/Method Here - IMPORTANT: Add a real contact method].
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}

export default Privacy;