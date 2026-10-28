export type IngredientStatus = 'fresh' | 'warning' | 'expired';
export type ItemType = 'ingredient' | 'side_dish'; // 'ingredient' = 식재료, 'side_dish' = 반찬

export interface ParsedIngredient {
  id: string;
  name: string;
  expiryDate: string; // "YYYY-MM-DD" or "임박/D-day"
  status: IngredientStatus;
  itemType?: ItemType; // 'ingredient' (식재료) | 'side_dish' (반찬)
  category?: string;
  quantity?: string;
  imageUrl?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UrgentRecipe {
  title: string;
  usedExpiringIngredients: string[];
  ingredients: string[];
  steps: string[];
  estimatedTimeMinutes?: number;
  difficulty?: '쉬움' | '보통' | '숙련';
  chefTip?: string;
}

export interface AlternativeRecipe {
  title: string;
  ingredients: string[];
  steps: string[];
  estimatedTimeMinutes?: number;
  difficulty?: '쉬움' | '보통' | '숙련';
  chefTip?: string;
}

export interface ExpansionRecipe {
  title: string;
  currentIngredientsUsed: string[];
  missingIngredientsToBuy: string[];
  briefSteps: string;
  estimatedTimeMinutes?: number;
}

export interface ShoppingListItem {
  id: string;
  userId?: string;
  item: string;
  reason?: string;
  coupangUrl?: string;
  checked?: boolean;
  createdAt?: string;
}

export interface FavoriteRecipe {
  id: string;
  userId: string;
  title: string;
  recipeType: 'urgent' | 'alternative' | 'expansion' | 'custom';
  ingredients: string[];
  steps: string[];
  usedExpiringIngredients?: string[];
  missingIngredientsToBuy?: string[];
  briefSteps?: string;
  chefTip?: string;
  estimatedTimeMinutes?: number;
  difficulty?: '쉬움' | '보통' | '숙련';
  createdAt?: string;
}

export interface FridgeAssistantData {
  parsedIngredients: ParsedIngredient[];
  recipes: {
    urgentRecipe: UrgentRecipe;
    alternativeRecipe: AlternativeRecipe;
    expansionRecipes: ExpansionRecipe[];
  };
  shoppingList: ShoppingListItem[];
}

export type InputMode = 'text' | 'image';
