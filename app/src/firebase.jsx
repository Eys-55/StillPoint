import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getVertexAI, getGenerativeModel } from "firebase/vertexai";
import prompts from "./prompts";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD65N5pZ4PHOoE_UO570TwDHO9jxV92y2I",
  authDomain: "mental-health-app-2f701.firebaseapp.com",
  projectId: "mental-health-app-2f701",
  storageBucket: "mental-health-app-2f701.firebasestorage.app",
  messagingSenderId: "832865157532",
  appId: "1:832865157532:web:2ad602fd43ad3c8f8f8859",
  measurementId: "G-QKWPFDW8CY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize the Vertex AI service and the generative model for Gemini API with built‑in memory
const vertexAI = getVertexAI(app);
const model = getGenerativeModel(vertexAI, {
  model: "gemini-2.0-flash",
  systemInstruction: {
    parts: [
      { text: prompts.system }
    ]
  }
});



// Initialize Firebase Auth and Firestore
const auth = getAuth(app);
const firestore = getFirestore(app);

export { model, auth, firestore };