import { initializeApp, getApps, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config';
import { useCollection, useDoc } from './firestore';
import {
  FirebaseProvider,
  FirebaseClientProvider,
  useFirebase,
  useFirebaseApp,
  useFirestore,
  useAuth,
} from './provider';
import { useUser } from './auth';

let firebaseApp = getApps().length > 0 ? getApps()[0] : undefined;
let auth = firebaseApp ? getAuth(firebaseApp) : undefined;
let firestore = firebaseApp ? getFirestore(firebaseApp) : undefined;

function initializeFirebase(options: FirebaseOptions = {}) {
  if (getApps().length === 0) {
    const config = { ...firebaseConfig, ...options };
    if (!config.apiKey) {
      // Use placeholder values if apiKey is not set
      config.apiKey = "placeholder";
      config.authDomain = "placeholder.firebaseapp.com";
      config.projectId = "placeholder";
      config.storageBucket = "placeholder.appspot.com";
      config.messagingSenderId = "placeholder";
      config.appId = "placeholder";
    }
    firebaseApp = initializeApp(config);
    auth = getAuth(firebaseApp);
    firestore = getFirestore(firebaseApp);
  }

  return { firebaseApp, auth, firestore };
}

export {
  initializeFirebase,
  firebaseConfig,
  FirebaseProvider,
  FirebaseClientProvider,
  useCollection,
  useDoc,
  useUser,
  useFirebase,
  useFirebaseApp,
  useFirestore,
  useAuth,
};
