// This file is no longer used for storing mock data, 
// but the type definition is still needed.
// The data is now managed in Firebase Firestore.

import type { LEDProduct as DBProduct } from '@/services/product-service';

export type LEDProduct = DBProduct;

export const ledProducts: LEDProduct[] = [];
