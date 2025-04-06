<img src="https://github.com/user-attachments/assets/d9dae5fa-7faf-4f7e-a446-ad1506e43fee" alt="StillPoint Logo" width="300" height="300" />

StillPoint is an open-source mental health companion app designed to provide a private, personalized space for reflection and growth. It features an AI, powered by Google's Gemini models via Vertex AI, that learns and adapts to you over time through conversation and user-provided insights. Our goal is to create a supportive, non-judgmental partner for your self-discovery journey.

## 🌱 Why Open Source?

We believe that tools dealing with mental well-being demand the highest level of trust and transparency. StillPoint is open source because:

1.  **Transparency:** Anyone can inspect the code to understand exactly how the AI works, how data is handled, and what prompts are used. No hidden algorithms or data usage.
2.  **Safety & Security:** The community can audit the codebase for potential security vulnerabilities or privacy concerns, leading to a safer application for everyone.
3.  **Trust:** Open development fosters trust. You can verify our commitment to privacy and ethical AI practices.
4.  **Community & Collaboration:** We want to build StillPoint *with* the community. Open source allows others to contribute ideas, features, and improvements.

## ✨ Key Features

*   **Adaptive AI Companion:** Engage in conversations with an AI that learns from your chat history, summaries, and questionnaire responses (securely stored in your private Firebase account).
*   **Personalized Experience:** The AI tailors its interactions based on your preferences and past conversations, aiming for more relevant and insightful dialogue.
*   **Conversation Summaries ("Reflections"):** Generate concise summaries of your chat sessions to capture key insights and track your journey over time.
*   **Voice Input:** Speak your thoughts naturally. StillPoint uses OpenAI's Whisper API to transcribe your voice notes directly into the chat input.
*   **User Insights Questionnaire:** Provide optional background information through a questionnaire to help the AI understand your preferences and tailor its approach from the start.
*   **Privacy-Focused:** Built on Google Cloud (Firebase Authentication, Firestore, Vertex AI) with user data stored securely within individual user accounts. You own and control your data.
*   **Completely Open Source:** The entire codebase is available for review and contribution.

## 🛠️ Tech Stack

*   **Frontend:** React (with Vite)
*   **Styling:** Material UI (MUI)
*   **Backend & Database:** Firebase (Authentication, Firestore)
*   **AI Language Model:** Google Gemini Pro (via Firebase Vertex AI SDK)
*   **AI Voice Transcription:** OpenAI Whisper API
*   **State Management:** React Hooks (useState, useEffect, useCallback, useMemo, custom hooks)
*   **Routing:** React Router

## 🚀 Getting Started (for Developers)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/AceCanacan/mental-health-app.git
    cd mental-health-app/app
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up Firebase:**
    *   Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/).
    *   Enable Authentication (Email/Password recommended).
    *   Enable Firestore Database.
    *   Enable Vertex AI integration within your Google Cloud project linked to Firebase. Ensure the Gemini API (e.g., `gemini-2.0-flash`) is enabled.
    *   Register a Web App in your Firebase project settings.
    *   Copy your Firebase configuration credentials.

4.  **Set up OpenAI:**
    *   Get an API key from [https://platform.openai.com/](https://platform.openai.com/) for Whisper transcription.

5.  **Configure Environment Variables:**
    *   Create a `.env` file in the `app` directory (`/mental-health-app/app/.env`).
    *   Add your Firebase and OpenAI credentials. **Important:** Vite requires environment variables exposed to the client to be prefixed with `VITE_`.

    ```dotenv
    # Firebase Configuration
    VITE_FIREBASE_API_KEY=YOUR_API_KEY
    VITE_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
    VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
    VITE_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
    VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
    VITE_FIREBASE_APP_ID=YOUR_APP_ID
    # VITE_FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID (Optional)

    # OpenAI API Key (for Whisper)
    VITE_OPENAI_API_KEY=YOUR_OPENAI_API_KEY

    # Google Cloud / Vertex AI (Gemini) - Note: Firebase SDK might handle auth implicitly if set up correctly,
    # but explicitly adding the key might be needed depending on setup/future changes.
    # VITE_GEMINI_API_KEY=YOUR_GOOGLE_CLOUD_API_KEY_WITH_VERTEX_AI_ACCESS (If needed)
    ```
    *(Note: Ensure your Google Cloud project linked to Firebase has billing enabled for Vertex AI and OpenAI API usage.)*

6.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    The app should now be running on `http://localhost:5173` (or another port if 5173 is busy).

## 🤝 Contributing

Contributions are welcome! Whether it's bug reports, feature suggestions, or code contributions, please feel free to participate.

1.  **Issues:** Check the [Issues tab](https://github.com/AceCanacan/mental-health-app/issues) for existing bugs or feature requests. Feel free to open a new issue.
2.  **Pull Requests:**
    *   Fork the repository.
    *   Create a new branch for your feature or bug fix (`git checkout -b feature/your-feature-name` or `bugfix/issue-number`).
    *   Make your changes.
    *   Ensure your code adheres to the project's style (ESLint is configured in `eslint.config.js`). Run `npm run lint` or `yarn lint`.
    *   Commit your changes with clear messages.
    *   Push your branch to your fork.
    *   Submit a Pull Request to the `main` branch of the original repository.

## 📜 License

This project is licensed under the MIT License. See the `LICENSE` file for details. (You should add a `LICENSE` file with the MIT license text).

---

Thank you for your interest in StillPoint!
