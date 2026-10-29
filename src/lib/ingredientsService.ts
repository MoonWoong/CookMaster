import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  getDocFromServer,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { handleFirestoreError, OperationType } from './firebaseErrors';
import { ParsedIngredient, FavoriteRecipe, ShoppingListItem } from '../types/fridge';
import { getRecognizableIcon, generateStylizedFoodSvg } from '../utils/ingredientIcons';

const COLLECTION_NAME = 'ingredients';
const FAVORITES_COLLECTION_NAME = 'favorite_recipes';

/**
 * Validates connection to Firestore on app startup
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client is offline, check connection.');
      return false;
    }
    // Expected permission/not-found on dummy test doc is okay
    return true;
  }
}

/**
 * Gets currently active user ID (either auth UID or persisted guest ID)
 */
export function getCurrentUserId(): string {
  if (auth.currentUser?.uid) {
    return auth.currentUser.uid;
  }
  let guestId = localStorage.getItem('fridge_guest_uid');
  if (!guestId) {
    guestId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    localStorage.setItem('fridge_guest_uid', guestId);
  }
  return guestId;
}

/**
 * Subscribes to real-time updates for refrigerator ingredients
 */
export function subscribeToIngredients(
  userId: string,
  onData: (ingredients: ParsedIngredient[]) => void,
  onError?: (err: any) => void
): () => void {
  const colRef = collection(db, COLLECTION_NAME);
  
  // Real-time listener
  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      const items: ParsedIngredient[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Filter by user ID (or allow user's items)
        if (data.userId === userId || data.userId === 'guest' || !data.userId) {
          items.push({
            id: docSnap.id,
            name: data.name || '',
            expiryDate: data.expiryDate || '정보 없음',
            status: data.status || 'fresh',
            itemType: data.itemType === 'side_dish' ? 'side_dish' : 'ingredient',
            dateManageType: data.dateManageType === 'registered' ? 'registered' : 'expiry',
            registeredDate: data.registeredDate || undefined,
            category: data.category || '',
            quantity: data.quantity || '',
            imageUrl: data.imageUrl || undefined,
            userId: data.userId || userId,
            createdAt: data.createdAt || undefined,
            updatedAt: data.updatedAt || undefined,
          });
        }
      });
      onData(items);
    },
    (error) => {
      if (typeof onError === 'function') {
        onError(error);
      }
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    }
  );

  return unsubscribe;
}

/**
 * Generates an illustrative stylized image using Imagen / Gemini or aesthetic SVG
 */
export async function fetchOrGenerateIngredientImage(name: string): Promise<string> {
  const iconMatch = getRecognizableIcon(name);
  if (iconMatch.recognized) {
    // Has a recognized standard emoji/icon
    return '';
  }

  try {
    const res = await fetch('/api/generate-ingredient-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredientName: name }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.imageUrl) {
        return json.imageUrl;
      }
    }
  } catch (e) {
    console.warn('Backend image generator unavailable:', e);
  }

  // Beautiful stylized SVG sticker fallback
  return generateStylizedFoodSvg(name);
}

/**
 * Adds a new ingredient into Firestore
 */
export async function addIngredientToFirestore(
  ingredient: Omit<ParsedIngredient, 'id'>,
  userId: string
): Promise<string> {
  const id = `ing_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const path = `${COLLECTION_NAME}/${id}`;

  try {
    let imageUrl = ingredient.imageUrl;
    if (!imageUrl) {
      const iconCheck = getRecognizableIcon(ingredient.name);
      if (!iconCheck.recognized) {
        imageUrl = await fetchOrGenerateIngredientImage(ingredient.name);
      }
    }

    const docData: any = {
      id,
      name: ingredient.name.trim(),
      expiryDate: ingredient.expiryDate.trim(),
      status: ingredient.status,
      itemType: ingredient.itemType === 'side_dish' ? 'side_dish' : 'ingredient',
      dateManageType: ingredient.dateManageType === 'registered' ? 'registered' : 'expiry',
      userId: userId || 'guest',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (ingredient.registeredDate) docData.registeredDate = ingredient.registeredDate.trim();
    if (ingredient.category) docData.category = ingredient.category;
    if (ingredient.quantity) docData.quantity = ingredient.quantity;
    if (imageUrl) docData.imageUrl = imageUrl;

    await setDoc(doc(db, COLLECTION_NAME, id), docData);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Updates an ingredient in Firestore
 */
export async function updateIngredientInFirestore(
  id: string,
  updates: Partial<ParsedIngredient>
): Promise<void> {
  const path = `${COLLECTION_NAME}/${id}`;
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const updateData: any = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    delete updateData.id;

    await updateDoc(docRef, updateData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Deletes an ingredient from Firestore
 */
export async function deleteIngredientFromFirestore(id: string): Promise<void> {
  const path = `${COLLECTION_NAME}/${id}`;
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Batch adds multiple parsed ingredients to Firestore
 */
export async function batchAddIngredientsToFirestore(
  ingredients: ParsedIngredient[],
  userId: string
): Promise<void> {
  for (const ing of ingredients) {
    await addIngredientToFirestore(
      {
        name: ing.name,
        expiryDate: ing.expiryDate,
        status: ing.status,
        itemType: ing.itemType || 'ingredient',
        dateManageType: ing.dateManageType || 'expiry',
        registeredDate: ing.registeredDate,
        category: ing.category,
        quantity: ing.quantity,
        imageUrl: ing.imageUrl,
      },
      userId
    );
  }
}

/**
 * Subscribes to real-time updates for favorite recipes
 */
export function subscribeToFavoriteRecipes(
  userId: string,
  onData: (recipes: FavoriteRecipe[]) => void,
  onError?: (err: any) => void
): () => void {
  const colRef = collection(db, FAVORITES_COLLECTION_NAME);

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      const items: FavoriteRecipe[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.userId === userId || data.userId === 'guest' || !data.userId) {
          items.push({
            id: docSnap.id,
            userId: data.userId || userId,
            title: data.title || '',
            recipeType: data.recipeType || 'custom',
            ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
            steps: Array.isArray(data.steps) ? data.steps : [],
            usedExpiringIngredients: Array.isArray(data.usedExpiringIngredients) ? data.usedExpiringIngredients : undefined,
            missingIngredientsToBuy: Array.isArray(data.missingIngredientsToBuy) ? data.missingIngredientsToBuy : undefined,
            briefSteps: data.briefSteps || undefined,
            chefTip: data.chefTip || undefined,
            estimatedTimeMinutes: data.estimatedTimeMinutes || undefined,
            difficulty: data.difficulty || undefined,
            createdAt: data.createdAt || undefined,
          });
        }
      });
      // Sort newest first
      items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onData(items);
    },
    (error) => {
      if (typeof onError === 'function') {
        onError(error);
      }
      handleFirestoreError(error, OperationType.LIST, FAVORITES_COLLECTION_NAME);
    }
  );

  return unsubscribe;
}

/**
 * Adds a recipe to favorites in Firestore
 */
export async function addFavoriteRecipeToFirestore(
  recipe: Omit<FavoriteRecipe, 'id' | 'userId'>,
  userId: string
): Promise<string> {
  const id = `fav_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const path = `${FAVORITES_COLLECTION_NAME}/${id}`;

  try {
    const docData: any = {
      id,
      userId,
      title: recipe.title,
      recipeType: recipe.recipeType,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      createdAt: new Date().toISOString(),
    };

    if (recipe.usedExpiringIngredients) docData.usedExpiringIngredients = recipe.usedExpiringIngredients;
    if (recipe.missingIngredientsToBuy) docData.missingIngredientsToBuy = recipe.missingIngredientsToBuy;
    if (recipe.briefSteps) docData.briefSteps = recipe.briefSteps;
    if (recipe.chefTip) docData.chefTip = recipe.chefTip;
    if (recipe.estimatedTimeMinutes) docData.estimatedTimeMinutes = recipe.estimatedTimeMinutes;
    if (recipe.difficulty) docData.difficulty = recipe.difficulty;

    await setDoc(doc(db, FAVORITES_COLLECTION_NAME, id), docData);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

/**
 * Deletes a recipe from favorites in Firestore
 */
export async function deleteFavoriteRecipeFromFirestore(id: string): Promise<void> {
  const path = `${FAVORITES_COLLECTION_NAME}/${id}`;
  try {
    await deleteDoc(doc(db, FAVORITES_COLLECTION_NAME, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

const CART_COLLECTION_NAME = 'cart_items';

/**
 * Subscribes to real-time updates for shopping cart items from Firestore
 */
export function subscribeToCartItems(
  userId: string,
  onData: (items: ShoppingListItem[]) => void,
  onError?: (err: any) => void
): () => void {
  const colRef = collection(db, CART_COLLECTION_NAME);

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      const items: ShoppingListItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.userId === userId || data.userId === 'guest' || !data.userId) {
          items.push({
            id: docSnap.id,
            userId: data.userId || userId,
            item: data.item || '',
            reason: data.reason || '',
            checked: !!data.checked,
            createdAt: data.createdAt || undefined,
          });
        }
      });
      // Sort newest first
      items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onData(items);
    },
    (error) => {
      if (typeof onError === 'function') {
        onError(error);
      }
      handleFirestoreError(error, OperationType.GET, CART_COLLECTION_NAME);
    }
  );

  return unsubscribe;
}

/**
 * Adds a shopping cart item to Firestore
 */
export async function addCartItemToFirestore(
  item: string,
  reason: string,
  userId: string
): Promise<string> {
  const cleanId = `cart_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `${CART_COLLECTION_NAME}/${cleanId}`;

  try {
    const docData = {
      id: cleanId,
      userId,
      item: item.trim(),
      reason: reason.trim() || '쇼핑 목록',
      checked: false,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, CART_COLLECTION_NAME, cleanId), docData);
    return cleanId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

/**
 * Updates a shopping cart item in Firestore (e.g. toggle checked)
 */
export async function updateCartItemInFirestore(
  id: string,
  updates: Partial<ShoppingListItem>
): Promise<void> {
  const path = `${CART_COLLECTION_NAME}/${id}`;
  try {
    const docRef = doc(db, CART_COLLECTION_NAME, id);
    const cleanUpdates: Record<string, any> = {};
    if (typeof updates.checked === 'boolean') cleanUpdates.checked = updates.checked;
    if (typeof updates.item === 'string') cleanUpdates.item = updates.item;
    if (typeof updates.reason === 'string') cleanUpdates.reason = updates.reason;

    await updateDoc(docRef, cleanUpdates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

/**
 * Deletes a shopping cart item from Firestore
 */
export async function deleteCartItemFromFirestore(id: string): Promise<void> {
  const path = `${CART_COLLECTION_NAME}/${id}`;
  try {
    await deleteDoc(doc(db, CART_COLLECTION_NAME, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

