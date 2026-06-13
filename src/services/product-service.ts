import { initializeFirebase } from '@/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export interface LEDProduct {
  id: string;
  name: string;
  manufacturer: string;
  parent_id?: string; // To link half-panels to full panels
  width_px: number;
  height_px: number;
  width_mm: number;
  height_mm: number;
  pixel_pitch: number;
  weight_kg: number;
  power_watts_max: number;
  power_watts_avg: number;
  usageType: 'indoor' | 'outdoor';
  isFloor: boolean;
  max_tiles_ground: number;
  max_tiles_flown: number;
}

const getProductCollection = () => {
    const { firestore } = initializeFirebase();
    return collection(firestore, 'led-products');
};

const fromFirestore = (snapshot: QueryDocumentSnapshot<DocumentData, DocumentData>): LEDProduct => {
    const data = snapshot.data();
    return {
        id: snapshot.id,
        name: data.name,
        manufacturer: data.manufacturer,
        parent_id: data.parent_id,
        width_px: data.width_px,
        height_px: data.height_px,
        width_mm: data.width_mm,
        height_mm: data.height_mm,
        pixel_pitch: data.pixel_pitch,
        weight_kg: data.weight_kg,
        power_watts_max: data.power_watts_max,
        power_watts_avg: data.power_watts_avg,
        usageType: data.usageType || 'indoor',
        isFloor: data.isFloor || false,
        max_tiles_ground: data.max_tiles_ground || 0,
        max_tiles_flown: data.max_tiles_flown || 0,
    };
};

export const getProducts = async (): Promise<LEDProduct[]> => {
    const productCollection = getProductCollection();
    try {
        const snapshot = await getDocs(productCollection);
        return snapshot.docs.map(fromFirestore).sort((a, b) => a.manufacturer.localeCompare(b.manufacturer) || a.name.localeCompare(b.name));
    } catch (error: any) {
        // Only trigger the permission error listener if it's actually a rules violation
        if (error.code === 'permission-denied') {
            const contextualError = new FirestorePermissionError({
              operation: 'list',
              path: productCollection.path,
            });
            errorEmitter.emit('permission-error', contextualError);
            throw contextualError;
        }
        console.warn("Product fetch failed (offline or network):", error);
        throw error;
    }
};

export const addProduct = async (product: Omit<LEDProduct, 'id'>): Promise<string> => {
    const docRef = await addDoc(getProductCollection(), product);
    return docRef.id;
};

export const updateProduct = async (id: string, product: Partial<Omit<LEDProduct, 'id'>>): Promise<void> => {
    const { firestore } = initializeFirebase();
    const productDoc = doc(firestore, 'led-products', id);
    await updateDoc(productDoc, product);
};

export const deleteProduct = async (id: string): Promise<void> => {
    const { firestore } = initializeFirebase();
    const productDoc = doc(firestore, 'led-products', id);
    await deleteDoc(productDoc);
};
