// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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