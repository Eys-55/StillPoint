# Aura - Your Personal Mental Health Companion (Open Source)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) <!-- Example license badge -->

Aura is an open-source personal mental health companion and wellness tool. It provides a private, secure space for users to interact with an AI chatbot ("Aura"), reflect on thoughts and feelings, track activity, gain insights, and manage conversation history.

Built using Google's secure cloud infrastructure (Firebase, Vertex AI), Aura aims to be a supportive tool for self-reflection and personal growth.

## ✨ Key Features

*   **Secure AI Chat:** Converse privately with Google's Gemini 1.5 Flash AI model via Vertex AI.
*   **Contextual & Personalized:** AI responses adapt based on system instructions, past conversation summaries, and user questionnaire responses.
*   **Conversation Management:** Easily manage multiple chat threads (create, switch, delete) via a dedicated sidebar with real-time updates.
*   **Secure Data Storage:** All user data (messages, summaries, questionnaire answers) is securely stored in Google Firestore under the user's unique ID.
*   **Voice Input:** Option to use voice for interacting with the chatbot.
*   **AI-Powered Summarization:** Generate concise summaries of conversations using Vertex AI.
*   **Secure Authentication:** Utilizes Firebase Authentication for email/password login and email verification.
*   **User Profile & Insights:**
    *   Review and edit initial questionnaire responses ("Insights").
    *   View AI-generated conversation summaries ("Reflections").
*   **Settings:** Manage display name, toggle dark/light mode, access privacy policy, and manage account deletion.
*   **Activity Tracker:** Visualize chat activity over time with a calendar view on the Home page.
*   **Modern UI:** Built with React and Material UI for a clean and responsive user experience.

## 🚀 Technology Stack

*   **Frontend:** React.js, Vite
*   **UI Library:** Material UI (MUI)
*   **Routing:** React Router
*   **State Management:** React Hooks (useState, useEffect, useMemo, custom hooks)
*   **Cloud Platform:** Google Cloud
    *   **Authentication:** Firebase Authentication
    *   **Database:** Firestore (NoSQL, Real-time)
    *   **AI:** Vertex AI (Gemini 1.5 Flash)
*   **Styling:** CSS, Material UI Theming
*   **Utility Libraries:** `date-fns`

## 🔧 Getting Started

Follow these instructions to set up and run the project locally.

**Prerequisites:**

*   Node.js (LTS version recommended)
*   npm or yarn
*   Firebase Account & Project Setup:
    *   Create a Firebase project at [https://firebase.google.com/](https://firebase.google.com/).
    *   Enable Authentication (Email/Password provider).
    *   Set up Firestore Database.
    *   Set up a Google Cloud Project linked to your Firebase project.
    *   Enable the Vertex AI API in your Google Cloud Project.
    *   Obtain Firebase configuration credentials.
*   Google Cloud Credentials (for Vertex AI):
    *   Set up authentication for Vertex AI (e.g., Application Default Credentials or a Service Account key).

**Installation & Setup:**

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd mental-health-app/app
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Configure Firebase:**
    *   Create a `src/firebaseConfig.js` file (or update `src/firebase.jsx` if config is directly embedded).
    *   Add your Firebase project configuration details:
        ```javascript
        // Example: src/firebaseConfig.js
        const firebaseConfig = {
          apiKey: "YOUR_API_KEY",
          authDomain: "YOUR_AUTH_DOMAIN",
          projectId: "YOUR_PROJECT_ID",
          storageBucket: "YOUR_STORAGE_BUCKET",
          messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
          appId: "YOUR_APP_ID",
          measurementId: "YOUR_MEASUREMENT_ID" // Optional
        };

        export default firebaseConfig;
        ```
    *   Ensure `src/firebase.jsx` imports and uses this configuration.

4.  **Configure Vertex AI:**
    *   Ensure your environment is set up to authenticate Google Cloud API requests. Refer to Google Cloud documentation for setting up Application Default Credentials or using service account keys securely. The application code (likely in backend functions or API routes, *which might need to be added if not present*) will use these credentials to interact with Vertex AI.

5.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```

6.  Open your browser and navigate to `http://localhost:5173` (or the port specified by Vite).

## 📂 Project Structure
content_copy
download
Use code with caution.
Xml
/app
├── src
│ ├── chat # Chat interface components and hooks
│ ├── home # Home dashboard and activity tracker
│ ├── landing # Landing page component
│ ├── meta # Static assets, prompts, questions
│ ├── nav # Header and Footer components
│ ├── profile # User profile, insights, summaries
│ ├── user # Login, settings, privacy components
│ ├── App.jsx # Main application component, routing
│ ├── firebase.jsx # Firebase initialization and auth export
│ └── main.jsx # Application entry point
├── public/ # Static assets
├── .firebaserc # Firebase CLI config
├── eslint.config.js# ESLint configuration
├── firebase.json # Firebase hosting/functions config
├── firestore.indexes.json # Firestore index definitions
├── firestore.rules # Firestore security rules
├── index.html # Main HTML file
├── package.json # Project dependencies and scripts
├── styles.css # Global styles
└── vite.config.js # Vite build configuration

## 🤝 Contributing

This is an open-source project. Contributions are welcome! Please feel free to submit issues and pull requests.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📜 License

Distributed under the MIT License. See `LICENSE` file (if available) or [https://opensource.org/licenses/MIT](https://opensource.org/licenses/MIT) for more information.

## 🙏 Acknowledgments

*   React
*   Material UI
*   Firebase
*   Google Cloud Vertex AI
*   Vite
content_copy
download
Use code with caution.