'use client';
import { collection, getDocs, doc, getDoc, setDoc, Firestore, deleteDoc } from 'firebase/firestore';

export interface AppUser {
    id: string;
    email: string | null;
}

export interface UserWithRole extends AppUser {
    role: 'admin' | 'user';
}

export const getAllUsersWithRoles = async (firestore: Firestore): Promise<UserWithRole[]> => {
    const usersCollection = collection(firestore, 'users');
    const rolesCollection = collection(firestore, 'roles');

    const usersSnapshot = await getDocs(usersCollection);
    const users: AppUser[] = usersSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppUser));
    
    const usersWithRoles = await Promise.all(users.map(async (user) => {
        const roleDocRef = doc(rolesCollection, user.id);
        const roleDocSnap = await getDoc(roleDocRef);
        const role = roleDocSnap.exists() ? roleDocSnap.data().role : 'user';
        return { ...user, role };
    }));

    return usersWithRoles;
};

export const updateUserRole = async (firestore: Firestore, userId: string, role: 'admin' | 'user') => {
    const roleDocRef = doc(firestore, 'roles', userId);
    await setDoc(roleDocRef, { role });
};


export const createUserDocuments = async (firestore: Firestore, userId: string, email: string | null) => {
  const userDocRef = doc(firestore, 'users', userId);
  const roleDocRef = doc(firestore, 'roles', userId);

  await Promise.all([
    setDoc(userDocRef, { id: userId, email }),
    setDoc(roleDocRef, { role: 'user' }) // Default role
  ]);
};

export const deleteUserFromFirestore = async (firestore: Firestore, userId: string) => {
    const userDocRef = doc(firestore, 'users', userId);
    const roleDocRef = doc(firestore, 'roles', userId);
    
    // This will delete the user's profile and role data from Firestore.
    // It does not delete their authentication record or their sub-collections like projects.
    await deleteDoc(userDocRef);
    await deleteDoc(roleDocRef);
};
