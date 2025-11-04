'use client';
import { createContext, useContext, ReactNode, useMemo } from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { initializeFirebase } from './index';

export interface FirebaseContextValue {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

const FirebaseContext = createContext<FirebaseContextValue | undefined>(
  undefined
);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const { firebaseApp, auth, firestore } = useMemo(
    () => initializeFirebase(),
    []
  );

  const contextValue = useMemo(
    () => ({
      firebaseApp,
      auth,
      firestore,
    }),
    [firebaseApp, auth, firestore]
  );

  return (
    <FirebaseContext.Provider value={contextValue}>
      {children}
    </FirebaseContext.Provider>
  );
}

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};

export const useFirebaseApp = () => useFirebase().firebaseApp;
export const useAuth = () => useFirebase().auth;
export const useFirestore = () => useFirebase().firestore;
