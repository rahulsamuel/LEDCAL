
import { initializeFirebase } from '@/firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  DocumentData,
  QueryDocumentSnapshot,
  serverTimestamp,
  query,
  orderBy,
  Firestore,
} from 'firebase/firestore';

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  author?: string;
  config: string; // JSON string
  lastModified: any; // Firestore Timestamp
}

const getProjectCollection = (firestore: Firestore, userId: string) => {
  return collection(firestore, 'users', userId, 'projects');
};

const fromFirestore = (snapshot: QueryDocumentSnapshot<DocumentData>): Project => {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    ownerId: data.ownerId,
    name: data.name,
    description: data.description,
    author: data.author,
    config: data.config,
    lastModified: data.lastModified,
  };
};

export const getProjects = async (firestore: Firestore, userId: string): Promise<Project[]> => {
  const projectCollection = getProjectCollection(firestore, userId);
  const q = query(projectCollection, orderBy('lastModified', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(fromFirestore);
};

export const addProject = async (firestore: Firestore, userId: string, projectData: Omit<Project, 'id' | 'lastModified' | 'ownerId'>): Promise<string> => {
  const dataToSave = {
    ...projectData,
    ownerId: userId,
    lastModified: serverTimestamp(),
  };
  const docRef = await addDoc(getProjectCollection(firestore, userId), dataToSave);
  return docRef.id;
};

export const updateProject = async (firestore: Firestore, userId: string, projectId: string, projectData: Omit<Project, 'id' | 'lastModified' | 'ownerId'>): Promise<void> => {
  const projectDoc = doc(firestore, 'users', userId, 'projects', projectId);
  const dataToUpdate = {
    ...projectData,
    ownerId: userId,
    lastModified: serverTimestamp(),
  };
  await updateDoc(projectDoc, dataToUpdate);
};

export const deleteProject = async (firestore: Firestore, userId: string, projectId: string): Promise<void> => {
  const projectDoc = doc(firestore, 'users', userId, 'projects', projectId);
  await deleteDoc(projectDoc);
};
