import { initializeFirebase } from '@/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export interface BitDepthCapacity {
  totalProcessorCapacity: number;
  perPortCapacity: number;
}

export interface RefreshRateCapacities {
  '8bit': BitDepthCapacity;
  '10bit': BitDepthCapacity;
  '12bit': BitDepthCapacity;
}

export interface PortCapacity {
  [refreshRate: string]: RefreshRateCapacities;
}

export interface Processor {
  id: string;
  name: string;
  manufacturer: string;
  maxWidth: number;
  maxHeight: number;
  portCount: number;
  portCapacity: PortCapacity;
}

const getProcessorCollection = () => {
    const { firestore } = initializeFirebase();
    return collection(firestore, 'processors');
};

const fromFirestore = (snapshot: QueryDocumentSnapshot<DocumentData>): Processor => {
    const data = snapshot.data();
    return {
        id: snapshot.id,
        name: data.name,
        manufacturer: data.manufacturer,
        maxWidth: data.maxWidth,
        maxHeight: data.maxHeight,
        portCount: data.portCount,
        portCapacity: data.portCapacity || {},
    };
};

export const getProcessors = async (): Promise<Processor[]> => {
    const processorCollection = getProcessorCollection();
    try {
        const snapshot = await getDocs(processorCollection);
        return snapshot.docs.map(fromFirestore).sort((a, b) => a.manufacturer.localeCompare(b.manufacturer) || a.name.localeCompare(b.name));
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            const contextualError = new FirestorePermissionError({
              operation: 'list',
              path: processorCollection.path,
            });
            errorEmitter.emit('permission-error', contextualError);
            throw contextualError;
        }
        console.warn("Processor fetch failed (offline or network):", error);
        throw error;
    }
};

export const addProcessor = async (processor: Omit<Processor, 'id'>): Promise<string> => {
    const docRef = await addDoc(getProcessorCollection(), processor);
    return docRef.id;
};

export const updateProcessor = async (id: string, processor: Partial<Omit<Processor, 'id'>>): Promise<void> => {
    const { firestore } = initializeFirebase();
    const processorDoc = doc(firestore, 'processors', id);
    await updateDoc(processorDoc, processor);
};

export const deleteProcessor = async (id: string): Promise<void> => {
    const { firestore } = initializeFirebase();
    const processorDoc = doc(firestore, 'processors', id);
    await deleteDoc(processorDoc);
};
