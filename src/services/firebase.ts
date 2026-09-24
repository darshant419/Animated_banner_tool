import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const cleanEnv = (val?: string) => {
    if (!val) return '';
    return val.trim().replace(/^["']|["',]+$/g, '').trim();
};

const firebaseConfig = {
    apiKey: cleanEnv(import.meta.env.VITE_FIREBASE_API_KEY),
    authDomain: cleanEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
    projectId: cleanEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID),
    storageBucket: cleanEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: cleanEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
    appId: cleanEnv(import.meta.env.VITE_FIREBASE_APP_ID),
};

export const isFirebaseConfigured = (): boolean => {
    return Boolean(
        firebaseConfig.apiKey &&
        firebaseConfig.projectId &&
        firebaseConfig.storageBucket &&
        firebaseConfig.apiKey !== 'your_api_key_here'
    );
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured()) {
    try {
        app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
        db = getFirestore(app);
        storage = getStorage(app);
    } catch (err) {
        console.error('Failed to initialize Firebase:', err);
    }
} else {
    console.info('Firebase environment variables not set or incomplete. Running in fallback/local mode until .env is configured.');
}

export { app, db, storage };
