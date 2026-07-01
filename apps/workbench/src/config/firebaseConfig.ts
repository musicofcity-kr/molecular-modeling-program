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
