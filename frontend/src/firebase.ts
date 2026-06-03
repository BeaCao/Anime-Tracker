import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, EmailAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            ?? "AIzaSyBm22l0z62AOG29Ww6KNOJgpxgMPpAsCss",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        ?? "anime-tracker-cf187.firebaseapp.com",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         ?? "anime-tracker-cf187",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     ?? "anime-tracker-cf187.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "561598297523",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             ?? "1:561598297523:web:c0b5c10b0b0883e52807c6",
};

// Inicializamos Firebase
const app = initializeApp(firebaseConfig);

// Exportamos las herramientas que usaremos
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
export const emailProvider = new EmailAuthProvider();
export const db = getFirestore(app);
