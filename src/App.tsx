import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Header } from './components/Header';
import { InputSection } from './components/InputSection';
import { IngredientsDashboard } from './components/IngredientsDashboard';
import { RecipeDisplay } from './components/RecipeDisplay';
import { ShoppingListSection } from './components/ShoppingListSection';
import { FavoriteRecipesSection } from './components/FavoriteRecipesSection';
import { CookingGuideModal } from './components/CookingGuideModal';
import { ChefTipsBanner } from './components/ChefTipsBanner';
import { AuthModal } from './components/AuthModal';
import { PendingIngredientsReviewModal } from './components/PendingIngredientsReviewModal';
import { RegisterIngredientModal } from './components/RegisterIngredientModal';
import {
  FridgeAssistantData,
  ParsedIngredient,
  ShoppingListItem,
  FavoriteRecipe,
} from './types/fridge';
import { PRESET_SCENARIOS, PresetScenario } from './data/presets';
import { normalizeFridgeResponse, calculateDDay, extractQuantityFromName } from './utils/recipeLogic';
import { auth } from './lib/firebase';
import {
  getActiveSimpleUser,
  logoutSimpleUser,
  SimpleUser,
} from './lib/simpleAuth';
import {
  testFirestoreConnection,
  getCurrentUserId,
  subscribeToIngredients,
  addIngredientToFirestore,
  updateIngredientInFirestore,
  deleteIngredientFromFirestore,
  batchAddIngredientsToFirestore,
  subscribeToFavoriteRecipes,
  addFavoriteRecipeToFirestore,
  deleteFavoriteRecipeFromFirestore,
} from './lib/ingredientsService';
import { ChefHat } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<SimpleUser | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('guest');
  const [activePresetId, setActivePresetId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingRecipes, setIsGeneratingRecipes] = useState<boolean>(false);
  const [isSavingReview, setIsSavingReview] = useState<boolean>(false);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [pendingReviewItems, setPendingReviewItems] = useState<ParsedIngredient[]>([]);

  // Firestore ingredients state
  const [firestoreIngredients, setFirestoreIngredients] = useState<ParsedIngredient[]>([]);

  // Generated recipes & shopping list state
  const [recipesData, setRecipesData] = useState<{
    urgentRecipe: FridgeAssistantData['recipes']['urgentRecipe'];
    alternativeRecipe: FridgeAssistantData['recipes']['alternativeRecipe'];
    expansionRecipes: FridgeAssistantData['recipes']['expansionRecipes'];
  } | null>(null);

  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [favoriteRecipes, setFavoriteRecipes] = useState<FavoriteRecipe[]>([]);
  const [cartRegisterTarget, setCartRegisterTarget] = useState<ShoppingListItem | null>(null);
  const [isSavingCartFridge, setIsSavingCartFridge] = useState<boolean>(false);

  const [activeCookingRecipe, setActiveCookingRecipe] = useState<{
    title: string;
    steps: string[];
    ingredients: string[];
  } | null>(null);

  // Cart local persistence per user
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`fridge_cart_${currentUserId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setShoppingList(parsed);
        }
      }
    } catch (_) {}
  }, [currentUserId]);

  useEffect(() => {
    try {
      localStorage.setItem(`fridge_cart_${currentUserId}`, JSON.stringify(shoppingList));
    } catch (_) {}
  }, [shoppingList, currentUserId]);

  // 1. Auth & Connection initialization
  useEffect(() => {
    testFirestoreConnection();

    // Check simple local account first
    const simple = getActiveSimpleUser();
    if (simple) {
      setCurrentUser(simple);
      setCurrentUserId(simple.uid);
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const u: SimpleUser = {
          uid: firebaseUser.uid,
          id: firebaseUser.email || firebaseUser.uid,
          nickname: firebaseUser.displayName || '회원',
          displayName: firebaseUser.displayName || '회원',
        };
        setCurrentUser(u);
        setCurrentUserId(firebaseUser.uid);
      } else {
        const simpleStored = getActiveSimpleUser();
        if (simpleStored) {
          setCurrentUser(simpleStored);
          setCurrentUserId(simpleStored.uid);
        } else {
          setCurrentUser(null);
          setCurrentUserId(getCurrentUserId());
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Real-time Firestore Ingredients sync
  useEffect(() => {
    const unsubscribe = subscribeToIngredients(
      currentUserId,
      (items) => {
        setFirestoreIngredients(items);
      },
      (err) => {
        console.warn('Firestore subscription notice:', err);
      }
    );

    return () => unsubscribe();
  }, [currentUserId]);

  // 3. Real-time Firestore Favorite Recipes sync
  useEffect(() => {
    const unsubscribe = subscribeToFavoriteRecipes(
      currentUserId,
      (recipes) => {
        setFavoriteRecipes(recipes);
      },
      (err) => {
        console.warn('Favorite recipes subscription notice:', err);
      }
    );

    return () => unsubscribe();
  }, [currentUserId]);

  const handleLogout = async () => {
    logoutSimpleUser();
    try {
      await signOut(auth);
    } catch (_) {}
    setCurrentUser(null);
    setCurrentUserId(getCurrentUserId());
  };

  const handleAuthSuccess = (u: SimpleUser) => {
    setCurrentUser(u);
    setCurrentUserId(u.uid);
  };

  // Direct Form Add Ingredient Handler -> Saves immediately to Firestore
  const handleDirectAddIngredient = async (item: Omit<ParsedIngredient, 'id'>) => {
    await addIngredientToFirestore(item, currentUserId);
  };

  // AI Extraction Handler -> Shows Review Modal Before Saving
  const handleAnalyzeExtract = async (text: string, imgData: string | null) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/analyze-fridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          imageBase64: imgData,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const resJson = await response.json();
      if (resJson.success && resJson.data) {
        const normalized = normalizeFridgeResponse(resJson.data);

        // Put candidate ingredients into pending review modal! Do NOT auto-save immediately.
        if (normalized.parsedIngredients && normalized.parsedIngredients.length > 0) {
          setPendingReviewItems(normalized.parsedIngredients);
          setIsReviewModalOpen(true);
        }

        // Cache candidate recipes
        setRecipesData(normalized.recipes);
        setShoppingList(normalized.shoppingList);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      const fallback = normalizeFridgeResponse({});
      if (fallback.parsedIngredients && fallback.parsedIngredients.length > 0) {
        setPendingReviewItems(fallback.parsedIngredients);
        setIsReviewModalOpen(true);
      }
      setRecipesData(fallback.recipes);
      setShoppingList(fallback.shoppingList);
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm Save from Review Modal
  const handleConfirmSaveReview = async (confirmedItems: ParsedIngredient[]) => {
    setIsSavingReview(true);
    try {
      await batchAddIngredientsToFirestore(confirmedItems, currentUserId);
      setIsReviewModalOpen(false);
    } catch (e) {
      console.error('Failed to save reviewed ingredients to Firestore:', e);
    } finally {
      setIsSavingReview(false);
    }
  };

  // Trigger recipe generation from already registered Firestore ingredients
  const handleTriggerRecipeFromRegisteredIngredients = async () => {
    if (firestoreIngredients.length === 0) return;
    setIsGeneratingRecipes(true);
    try {
      const ingredientText = firestoreIngredients
        .map((i) => `${i.name} ${i.quantity || '1개'} (유통기한: ${i.expiryDate}, 상태: ${i.status})`)
        .join(', ');

      const response = await fetch('/api/analyze-fridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ingredientText }),
      });

      if (response.ok) {
        const resJson = await response.json();
        if (resJson.success && resJson.data) {
          const normalized = normalizeFridgeResponse(resJson.data);
          setRecipesData(normalized.recipes);
          setShoppingList(normalized.shoppingList);
        }
      }
    } catch (e) {
      console.error('Failed to generate recipes from existing ingredients:', e);
    } finally {
      setIsGeneratingRecipes(false);
    }
  };

  // Preset selection handler
  const handleSelectPreset = (preset: PresetScenario) => {
    setActivePresetId(preset.id);
    if (preset.type === 'image' && preset.imagePreviewUrl) {
      handleAnalyzeExtract(preset.textInput, preset.imagePreviewUrl);
    } else {
      handleAnalyzeExtract(preset.textInput, null);
    }
  };

  // Firestore CRUD handlers
  const handleAddIngredient = async (item: Omit<ParsedIngredient, 'id'>) => {
    await addIngredientToFirestore(item, currentUserId);
  };

  const handleUpdateIngredient = async (id: string, updates: Partial<ParsedIngredient>) => {
    await updateIngredientInFirestore(id, updates);
  };

  const handleDeleteIngredient = async (id: string) => {
    await deleteIngredientFromFirestore(id);
  };

  // Shopping list handlers
  const handleToggleShoppingItem = (id: string) => {
    setShoppingList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleDeleteShoppingItem = (id: string) => {
    setShoppingList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddShoppingItem = (item: string, reason: string) => {
    const newItem: ShoppingListItem = {
      id: `shop-user-${Date.now()}`,
      item,
      reason,
      checked: false,
    };
    setShoppingList((prev) => [newItem, ...prev]);
  };

  // Open fridge registration popup for cart item
  const handleOpenFridgeRegisterFromCart = (cartItem: ShoppingListItem) => {
    setCartRegisterTarget(cartItem);
  };

  // Confirm registration from cart popup -> saves to Firestore with auto status and removes from cart
  const handleConfirmFridgeRegisterFromCart = async (data: {
    name: string;
    expiryDate: string;
    quantity: string;
  }) => {
    setIsSavingCartFridge(true);
    try {
      const dday = calculateDDay(data.expiryDate);
      await addIngredientToFirestore(
        {
          name: data.name,
          expiryDate: data.expiryDate,
          quantity: data.quantity,
          status: dday.status,
        },
        currentUserId
      );

      // Remove from cart once successfully registered into fridge
      if (cartRegisterTarget) {
        setShoppingList((prev) => prev.filter((i) => i.id !== cartRegisterTarget.id));
        setCartRegisterTarget(null);
      }
    } catch (e) {
      console.error('Failed to register ingredient from cart to Firestore:', e);
      throw e;
    } finally {
      setIsSavingCartFridge(false);
    }
  };

  // Favorite recipes handlers
  const favoriteRecipeTitles = new Set(favoriteRecipes.map((r) => r.title));

  const handleToggleFavoriteRecipe = async (
    recipe: Omit<FavoriteRecipe, 'id' | 'userId' | 'createdAt'>
  ) => {
    try {
      const existing = favoriteRecipes.find((r) => r.title === recipe.title);
      if (existing) {
        await deleteFavoriteRecipeFromFirestore(existing.id);
      } else {
        await addFavoriteRecipeToFirestore(recipe, currentUserId);
      }
    } catch (e) {
      console.error('Failed to toggle favorite recipe in Firestore:', e);
    }
  };

  const handleDeleteFavoriteRecipe = async (id: string) => {
    try {
      await deleteFavoriteRecipeFromFirestore(id);
    } catch (e) {
      console.error('Failed to delete favorite recipe from Firestore:', e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <Header
        onSelectPreset={handleSelectPreset}
        activePresetId={activePresetId}
        user={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8 space-y-8">
        {/* STEP 1: Input Section (Direct Form or AI Scan with Review) */}
        <InputSection
          onDirectAddIngredient={handleDirectAddIngredient}
          onAnalyzeExtract={handleAnalyzeExtract}
          isLoading={isLoading}
          onSelectPreset={handleSelectPreset}
        />

        {/* Loading Indicator Overlay/Banner */}
        {isLoading && (
          <div className="bg-white rounded-3xl p-8 border border-emerald-200 text-center shadow-md animate-pulse">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <ChefHat className="w-8 h-8 animate-spin" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              AI가 식재료와 유통기한을 정밀 분석하고 있습니다...
            </h3>
            <p className="text-xs text-slate-500">
              분석이 완료되면 등록 전 수정 가능한 검토 목록을 띄워드립니다.
            </p>
          </div>
        )}

        {/* STEP 2: Ingredients Dashboard with Inventory Management */}
        <IngredientsDashboard
          ingredients={firestoreIngredients}
          onAddIngredient={handleAddIngredient}
          onUpdateIngredient={handleUpdateIngredient}
          onDeleteIngredient={handleDeleteIngredient}
          onTriggerRecipeGeneration={handleTriggerRecipeFromRegisteredIngredients}
          isGeneratingRecipes={isGeneratingRecipes}
          onAddShoppingItem={handleAddShoppingItem}
        />

        {/* STEP 3: Recipes Section (Shown when recipe recommendation generated) */}
        {recipesData && !isLoading && (
          <div className="space-y-8 animate-fadeIn">
            <RecipeDisplay
              urgentRecipe={recipesData.urgentRecipe}
              alternativeRecipe={recipesData.alternativeRecipe}
              expansionRecipes={recipesData.expansionRecipes}
              onStartCooking={(recipe) => setActiveCookingRecipe(recipe)}
              onAddShoppingItem={handleAddShoppingItem}
              favoriteRecipeTitles={favoriteRecipeTitles}
              onToggleFavorite={handleToggleFavoriteRecipe}
            />
          </div>
        )}

        {/* STEP 4: Favorite Recipes Section (Firebase Persistent) */}
        <FavoriteRecipesSection
          favorites={favoriteRecipes}
          onDeleteFavorite={handleDeleteFavoriteRecipe}
          onStartCooking={(recipe) => setActiveCookingRecipe(recipe)}
          onAddShoppingItem={handleAddShoppingItem}
        />

        {/* STEP 5: General Shopping Cart (Always accessible for custom registration, Coupang search, and fridge transfer) */}
        <ShoppingListSection
          items={shoppingList}
          onToggleItem={handleToggleShoppingItem}
          onDeleteItem={handleDeleteShoppingItem}
          onAddItem={handleAddShoppingItem}
          onRegisterToFridge={handleOpenFridgeRegisterFromCart}
        />

        {/* Smart Storage Tips */}
        <ChefTipsBanner />
      </main>

      {/* Review Modal for AI Detected Items Before Firestore Save */}
      <PendingIngredientsReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        pendingItems={pendingReviewItems}
        onConfirmSave={handleConfirmSaveReview}
        isSaving={isSavingReview}
      />

      {/* Ingredient Registration Modal (Opened from Shopping Cart) */}
      <RegisterIngredientModal
        isOpen={!!cartRegisterTarget}
        onClose={() => setCartRegisterTarget(null)}
        initialName={cartRegisterTarget?.item || ''}
        initialQuantity={
          cartRegisterTarget
            ? extractQuantityFromName(cartRegisterTarget.item)?.quantity || '1개'
            : '1개'
        }
        sourceNote={
          cartRegisterTarget
            ? `장바구니 '${cartRegisterTarget.item}' 구매 완료 후 냉장고 등록`
            : undefined
        }
        onConfirm={handleConfirmFridgeRegisterFromCart}
        isSaving={isSavingCartFridge}
      />

      {/* Simple Auth Modal (ID / Password / Nickname) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Interactive Cooking Assistant Modal */}
      {activeCookingRecipe && (
        <CookingGuideModal
          recipe={activeCookingRecipe}
          onClose={() => setActiveCookingRecipe(null)}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>냉장고를 부탁해 • 스마트 주방 AI 어시스턴트 엔진</span>
          <span className="text-orange-600 font-semibold">
            Firebase Firestore 실시간 데이터베이스 연동 중
          </span>
        </div>
      </footer>
    </div>
  );
}
