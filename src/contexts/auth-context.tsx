'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User, signOut as firebaseSignOut, signInWithEmailAndPassword, EmailAuthProvider, reauthenticateWithCredential, updatePassword as firebaseUpdatePassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useFirebase } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';
import { AppUser, createUserDocuments } from '@/services/user-service';

interface AuthContextType {
  user: User | null;
  isUserLoading: boolean;
  role: 'admin' | 'user' | null;
  isAdmin: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  createUser: (email: string, password: string) => Promise<AppUser>;
  signUp: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { auth, firestore } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [role, setRole] = useState<'admin' | 'user' | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Ensure user document exists in Firestore
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
          try {
            await createUserDocuments(firestore, firebaseUser.uid, firebaseUser.email);
          } catch (error) {
            console.error("Failed to create user documents:", error);
          }
        }

        const roleDocRef = doc(firestore, 'roles', firebaseUser.uid);
        try {
          const roleDocSnap = await getDoc(roleDocRef);
          if (roleDocSnap.exists() && roleDocSnap.data().role === 'admin') {
            setRole('admin');
          } else {
            setRole('user');
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setRole('user'); // Default to user on error
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setIsUserLoading(false);
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  const signUp = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    if (!auth.currentUser) {
      throw new Error("No user is currently signed in.");
    }
    const user = auth.currentUser;
    // The user's email must not be null to create a credential
    if (!user.email) {
      throw new Error("User email is not available.");
    }
    const credential = EmailAuthProvider.credential(user.email, currentPassword);

    await reauthenticateWithCredential(user, credential);
    await firebaseUpdatePassword(user, newPassword);
  };

  const createUser = async (email: string, password: string): Promise<AppUser> => {
    // Create a temporary, secondary Firebase app instance to create the user
    // This prevents the admin from being signed out
    const appName = 'secondary-auth-app-' + Date.now();
    const secondaryApp = initializeApp(firebaseConfig, appName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUser = userCredential.user;

      // Now create the user and role documents in Firestore using the main instance
      await createUserDocuments(firestore, newUser.uid, newUser.email);

      // Return the new user's details
      return { id: newUser.uid, email: newUser.email };
    } catch (error) {
      // Pass the error up to be handled by the form
      throw error;
    } finally {
      // Clean up the secondary app instance
      await deleteApp(secondaryApp);
    }
  };

  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider value={{ user, isUserLoading, role, isAdmin, signInWithEmail, signOut, updatePassword, createUser, signUp }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
