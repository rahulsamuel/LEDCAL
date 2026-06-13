
'use client';
import { initializeFirebase } from '@/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export interface MediaServer {
  id: string;
  name: string;
  outputs: number | string;
  maxResolution: string;
  codecs: string[];
  audio: string;
}

const getMediaServerCollection = () => {
    const { firestore } = initializeFirebase();
    return collection(firestore, 'media-servers');
};

const fromFirestore = (snapshot: QueryDocumentSnapshot<DocumentData>): MediaServer => {
    const data = snapshot.data();
    return {
        id: snapshot.id,
        name: data.name,
        outputs: data.outputs,
        maxResolution: data.maxResolution,
        codecs: data.codecs || [],
        audio: data.audio,
    };
};

export const getMediaServersFromDB = async (): Promise<MediaServer[]> => {
    const mediaServerCollection = getMediaServerCollection();
    try {
        const snapshot = await getDocs(mediaServerCollection);
        return snapshot.docs.map(fromFirestore).sort((a, b) => a.name.localeCompare(b.name));
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            const contextualError = new FirestorePermissionError({
              operation: 'list',
              path: mediaServerCollection.path,
            });
            errorEmitter.emit('permission-error', contextualError);
            throw contextualError;
        }
        console.warn("Media server fetch failed (offline or network):", error);
        throw error;
    }
};

export const addMediaServer = async (server: Omit<MediaServer, 'id'>): Promise<string> => {
    const docRef = await addDoc(getMediaServerCollection(), server);
    return docRef.id;
};

export const updateMediaServer = async (id: string, server: Partial<Omit<MediaServer, 'id'>>): Promise<void> => {
    const { firestore } = initializeFirebase();
    const serverDoc = doc(firestore, 'media-servers', id);
    await updateDoc(serverDoc, server);
};

export const deleteMediaServer = async (id: string): Promise<void> => {
    const { firestore } = initializeFirebase();
    const serverDoc = doc(firestore, 'media-servers', id);
    await deleteDoc(serverDoc);
};
