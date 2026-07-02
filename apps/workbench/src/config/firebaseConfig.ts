import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

export type FirebaseConfigStatus = 'not_configured' | 'configured';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

const firebaseEnv = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

let firebaseAppCache: FirebaseApp | null | undefined;

export function getFirebaseClientConfig(): FirebaseClientConfig | null {
  if (
    !firebaseEnv.apiKey ||
    !firebaseEnv.authDomain ||
    !firebaseEnv.projectId ||
    !firebaseEnv.appId
  ) {
    return null;
  }

  return {
    apiKey: firebaseEnv.apiKey,
    authDomain: firebaseEnv.authDomain,
    projectId: firebaseEnv.projectId,
    appId: firebaseEnv.appId,
    storageBucket: firebaseEnv.storageBucket,
    messagingSenderId: firebaseEnv.messagingSenderId,
  };
}

export function getFirebaseConfigStatus(): FirebaseConfigStatus {
  return getFirebaseClientConfig() ? 'configured' : 'not_configured';
}

export function getFirebaseClientApp(): FirebaseApp | null {
  const config = getFirebaseClientConfig();

  if (!config) {
    return null;
  }

  if (firebaseAppCache !== undefined) {
    return firebaseAppCache;
  }

  firebaseAppCache = getApps().length > 0 ? getApp() : initializeApp(config);

  return firebaseAppCache;
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseClientApp();

  return app ? getAuth(app) : null;
}

export function getFirebaseFirestore(): Firestore | null {
  const app = getFirebaseClientApp();

  return app ? getFirestore(app) : null;
}
