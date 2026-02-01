import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyAbkCEC6uK77Z7zVS_xveFbxY0fYndBa9o",
  authDomain: "event-connect-2277a.firebaseapp.com",
  projectId: "event-connect-2277a",
  storageBucket: "event-connect-2277a.firebasestorage.app",
  messagingSenderId: "189172216922",
  appId: "1:189172216922:web:992be08bd887f32589d463",
  measurementId: "G-HMN8JS9F1N"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const functions = getFunctions(app);