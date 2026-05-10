import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, EmailAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBm22l0z62AOG29Ww6KNOJgpxgMPpAsCss",
  authDomain: "anime-tracker-cf187.firebaseapp.com",
  projectId: "anime-tracker-cf187",
  storageBucket: "anime-tracker-cf187.firebasestorage.app",
  messagingSenderId: "561598297523",
  appId: "1:561598297523:web:c0b5c10b0b0883e52807c6"
};

// Inicializamos Firebase
const app = initializeApp(firebaseConfig);

// Exportamos las herramientas que usaremos
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
export const emailProvider = new EmailAuthProvider();
