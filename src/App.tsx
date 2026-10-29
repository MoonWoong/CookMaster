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
import { FavoriteRecipeDetailModal } from './components/FavoriteRecipeDetailModal';
import {
  FridgeAssistantData,
  ParsedIngredient,
  ShoppingListItem,
  FavoriteRecipe,
  ItemType,
  DateManageType,
} from './types/fridge';
import {
  normalizeFridgeResponse,
  calculateDDay,
  calculateIngredientFreshness,
  extractQuantityFromName,
} from './utils/recipeLogic';
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
  subscribeToCartItems,
  addCartItemToFirestore,
  updateCartItemInFirestore,
  deleteCartItemFromFirestore,
} from './lib/ingredientsService';
import { NotificationSettingsModal } from './components/NotificationSettingsModal';
import { NotificationSettings, DEFAULT_NOTIFICATION_SETTINGS } from './types/notification';
import {
  fetchNotificationSettings,
  persistNotificationSettings,
  evaluateScheduledAlarm,
  sendBrowserPushNotification,
} from './lib/notificationService';
import { ChefHat, Refrigerator, Star, ShoppingCart, Bell, X, AlertTriangle } from 'lucide-react';

export type NavTab = 'fridge' | 'favorites' | 'cart';

export default function App() {
  const [activeNavTab, setActiveNavTab] = useState<NavTab>('fridge');
  const [detailModalRecipe, setDetailModalRecipe] = useState<FavoriteRecipe | null>(null);
  const [currentUser, setCurrentUser] = useState<SimpleUser | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('guest');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingRecipes, setIsGeneratingRecipes] = useState<boolean>(false);
  const [isSavingReview, setIsSavingReview] = useState<boolean>(false);

  // Modals & Notification state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState<boolean>(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [scheduledAlarmBanner, setScheduledAlarmBanner] = useState<{
    message: string;
    items: ParsedIngredient[];
  } | null>(null);
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

  // Cart real-time Firestore synchronization & cross-device persistence
  useEffect(() => {
    // One-time migration of any legacy localStorage cart items to Firestore
    try {
      const stored = localStorage.getItem(`fridge_cart_${currentUserId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach(async (it: any) => {
            if (it && it.item) {
              await addCartItemToFirestore(it.item, it.reason || '장바구니 항목', currentUserId);
            }
          });
          localStorage.removeItem(`fridge_cart_${currentUserId}`);
        }
      }
    } catch (_) {}

    // Real-time subscription to user's cart in Firestore
    const unsubscribe = subscribeToCartItems(
      currentUserId,
      (items) => {
        setShoppingList(items);
      },
      (err) => {
        console.warn('Cart items subscription notice:', err);
      }
    );

    return () => unsubscribe();
  }, [currentUserId]);

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

  // 4. Fetch notification settings for current user
  useEffect(() => {
    fetchNotificationSettings(currentUserId).then((settings) => {
      setNotificationSettings(settings);
    });
  }, [currentUserId]);

  // 5. Periodic check (every 25 seconds) to trigger push notification at user-configured time
  useEffect(() => {
    const checkScheduledNotification = () => {
      if (!notificationSettings.enabled || firestoreIngredients.length === 0) return;

      const evalResult = evaluateScheduledAlarm(firestoreIngredients, notificationSettings);
      if (evalResult.shouldTrigger && evalResult.urgentItems.length > 0) {
        const previewNames = evalResult.urgentItems
          .slice(0, 3)
          .map((i) => i.name)
          .join(', ');
        const count = evalResult.urgentItems.length;
        const title = '🚨 [냉장고를 부탁해] 유통기한 임박 식재료 알림!';
        const body = `'${previewNames}' 등 ${count}개 재료의 유통기한이 임박했습니다. 오늘 AI 요리로 구출해보세요!`;

        // Send browser push notification
        sendBrowserPushNotification(title, { body });

        // Show in-app banner alert if user currently has window open
        setScheduledAlarmBanner({
          message: body,
          items: evalResult.urgentItems,
        });

        // Mark today as notified so it only sends once per day
        const todayStr = new Date().toISOString().slice(0, 10);
        const updated = {
          ...notificationSettings,
          lastNotifiedDate: todayStr,
        };
        setNotificationSettings(updated);
        persistNotificationSettings(updated);
      }
    };

    checkScheduledNotification();
    const timer = setInterval(checkScheduledNotification, 25000);
    return () => clearInterval(timer);
  }, [firestoreIngredients, notificationSettings]);

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
          currentIngredients:
            firestoreIngredients.length > 0
              ? firestoreIngredients.map((i) => ({
                  name: i.name,
                  quantity: i.quantity,
                  expiryDate: i.expiryDate,
                  itemType: i.itemType || 'ingredient',
                  dateManageType: i.dateManageType,
                  registeredDate: i.registeredDate,
                  status: i.status,
                }))
              : undefined,
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

  const [lastRecommendedMainIngredients, setLastRecommendedMainIngredients] = useState<string[] | null>(null);

  // Trigger recipe generation from already registered Firestore ingredients
  const handleTriggerRecipeFromRegisteredIngredients = async (selectedMainIngredients?: string[]) => {
    if (firestoreIngredients.length === 0) return;
    setIsGeneratingRecipes(true);
    setLastRecommendedMainIngredients(
      selectedMainIngredients && selectedMainIngredients.length > 0 ? selectedMainIngredients : null
    );

    // Scroll smoothly to loading area so user gets instant visual feedback
    setTimeout(() => {
      document.getElementById('recipe-generating-loading')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);

    try {
      const ingredientText = firestoreIngredients
        .map(
          (i) =>
            `${i.name} (${i.itemType === 'side_dish' ? '반찬' : '식재료'}, ${i.quantity || '1개'}, 유통기한: ${i.expiryDate})`
        )
        .join(', ');

      const response = await fetch('/api/analyze-fridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: ingredientText,
          currentIngredients: firestoreIngredients.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            expiryDate: i.expiryDate,
            itemType: i.itemType || 'ingredient',
            dateManageType: i.dateManageType,
            registeredDate: i.registeredDate,
            status: i.status,
          })),
          mainIngredients:
            selectedMainIngredients && selectedMainIngredients.length > 0
              ? selectedMainIngredients
              : undefined,
        }),
      });

      if (response.ok) {
        const resJson = await response.json();
        if (resJson.success && resJson.data) {
          const normalized = normalizeFridgeResponse(resJson.data);

          // Client-side guarantee: sanitize urgent recipe against actual fridge ingredients
          if (firestoreIngredients.length > 0 && normalized.recipes?.urgentRecipe) {
            const validNames = firestoreIngredients.map((i) => i.name.trim().toLowerCase());
            const hasCand = (name: string) => {
              const clean = name
                .replace(/\(.*?\)/g, '')
                .replace(/[\d\.]+\s*(개|알|봉|모|단|g|kg|캔|통|팩)/g, '')
                .trim()
                .toLowerCase();
              return validNames.some((v) => v.includes(clean) || clean.includes(v));
            };
            const filteredUsed = (normalized.recipes.urgentRecipe.usedExpiringIngredients || []).filter(hasCand);
            const actualUrgent =
              firestoreIngredients.find((i) => i.status === 'expired' || i.status === 'warning') ||
              firestoreIngredients[0];

            normalized.recipes.urgentRecipe.usedExpiringIngredients =
              filteredUsed.length > 0 ? filteredUsed : [actualUrgent.name];

            // If recipe title contains forbidden phantom ingredients like '콩나물' when user has none, sanitize title
            if (
              normalized.recipes.urgentRecipe.title.includes('콩나물') &&
              !validNames.some((v) => v.includes('콩나물'))
            ) {
              normalized.recipes.urgentRecipe.title = `기한 임박 [${actualUrgent.name}] 구출! 셰프 특제 요리`;
            }
          }

          setRecipesData(normalized.recipes);

          // Scroll directly down to recipe results
          setTimeout(() => {
            const el = document.getElementById('recipes-section');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 120);
        }
      }
    } catch (e) {
      console.error('Failed to generate recipes from existing ingredients:', e);
    } finally {
      setIsGeneratingRecipes(false);
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

  // Shopping list handlers (Persisted in Firestore across devices)
  const handleToggleShoppingItem = async (id: string) => {
    const target = shoppingList.find((i) => i.id === id);
    if (!target) return;
    try {
      await updateCartItemInFirestore(id, { checked: !target.checked });
    } catch (e) {
      console.error('Failed to update cart item in Firestore:', e);
    }
  };

  const handleDeleteShoppingItem = async (id: string) => {
    try {
      await deleteCartItemFromFirestore(id);
    } catch (e) {
      console.error('Failed to delete cart item from Firestore:', e);
    }
  };

  const handleAddShoppingItem = async (item: string, reason: string) => {
    try {
      await addCartItemToFirestore(item, reason, currentUserId);
    } catch (e) {
      console.error('Failed to add cart item to Firestore:', e);
    }
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
    itemType?: ItemType;
    dateManageType?: DateManageType;
    registeredDate?: string;
  }) => {
    setIsSavingCartFridge(true);
    try {
      const freshness = calculateIngredientFreshness({
        name: data.name,
        expiryDate: data.expiryDate,
        quantity: data.quantity,
        itemType: data.itemType || 'ingredient',
        dateManageType: data.dateManageType || 'expiry',
        registeredDate: data.registeredDate,
      });
      await addIngredientToFirestore(
        {
          name: data.name,
          expiryDate: data.expiryDate,
          quantity: data.quantity,
          status: freshness.status,
          itemType: data.itemType || 'ingredient',
          dateManageType: data.dateManageType || 'expiry',
          registeredDate: data.registeredDate,
        },
        currentUserId
      );

      // Remove from cart once successfully registered into fridge
      if (cartRegisterTarget) {
        await deleteCartItemFromFirestore(cartRegisterTarget.id);
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

  const urgentCount = firestoreIngredients.filter((i) => {
    const freshness = calculateIngredientFreshness(i);
    return freshness.status === 'warning' || freshness.status === 'expired';
  }).length;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Header with Mall-Style Cart Icon and Alarm Settings */}
      <Header
        user={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        cartCount={shoppingList.length}
        onOpenCart={() => setActiveNavTab('cart')}
        activeNavTab={activeNavTab}
        onOpenNotificationModal={currentUser ? () => setIsNotificationModalOpen(true) : undefined}
        urgentCount={urgentCount}
        notificationTime={notificationSettings.time}
        notificationEnabled={notificationSettings.enabled}
      />

      {/* Top View Navigation Tabs (3-column responsive grid so all tabs fit on mobile without sliding) */}
      <div className="max-w-6xl w-full mx-auto px-3 sm:px-4 pt-3 sm:pt-5">
        <div className="grid grid-cols-3 gap-1 sm:gap-2 p-1 sm:p-1.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveNavTab('fridge')}
            className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeNavTab === 'fridge'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Refrigerator className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">
              <span className="sm:hidden">냉장고</span>
              <span className="hidden sm:inline">냉장고 & AI 요리</span>
            </span>
            {firestoreIngredients.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black shrink-0 ${
                  activeNavTab === 'fridge'
                    ? 'bg-emerald-800 text-emerald-100'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {firestoreIngredients.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveNavTab('favorites')}
            className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeNavTab === 'favorites'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Star
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                activeNavTab === 'favorites' ? 'fill-white text-white' : 'text-amber-500'
              }`}
            />
            <span className="truncate">
              <span className="sm:hidden">즐겨찾기</span>
              <span className="hidden sm:inline">즐겨찾기 레시피</span>
            </span>
            <span
              className={`px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-full text-[10px] sm:text-[11px] font-black shrink-0 ${
                activeNavTab === 'favorites'
                  ? 'bg-amber-700 text-amber-100'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {favoriteRecipes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveNavTab('cart')}
            className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeNavTab === 'cart'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
            <span className="truncate">
              <span className="sm:hidden">장바구니</span>
              <span className="hidden sm:inline">일반 장바구니</span>
            </span>
            {shoppingList.length > 0 && (
              <span
                className={`px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-full text-[10px] sm:text-[11px] font-black shrink-0 ${
                  activeNavTab === 'cart'
                    ? 'bg-slate-700 text-slate-100'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {shoppingList.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-5 sm:py-7 space-y-8">
        {/* In-app Notification Alarm Banner when triggered */}
        {scheduledAlarmBanner && (
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn border border-amber-300">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-white/20 rounded-2xl shrink-0">
                <Bell className="w-6 h-6 text-yellow-200 animate-bounce" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-100 block">
                  🔔 설정하신 알림 시간({notificationSettings.time}) • 유통기한 임박 식재료 구출 알림!
                </span>
                <p className="text-xs sm:text-sm font-extrabold text-white mt-0.5 leading-snug">
                  {scheduledAlarmBanner.message}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveNavTab('fridge');
                  setScheduledAlarmBanner(null);
                  document.getElementById('input-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-4 py-2 rounded-xl bg-white hover:bg-amber-50 text-amber-950 font-black text-xs shadow-xs transition-all cursor-pointer"
              >
                냉장고 재고 확인
              </button>
              <button
                type="button"
                onClick={() => setScheduledAlarmBanner(null)}
                className="p-2 rounded-xl bg-black/15 hover:bg-black/30 text-white transition-all cursor-pointer"
                title="알림 배너 닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        {/* TAB 1: REFRIGERATOR & AI RECIPES */}
        {activeNavTab === 'fridge' && (
          <div className="space-y-8 animate-fadeIn">
            {/* STEP 1: Input Section (Direct Form or AI Scan with Review) */}
            <InputSection
              onDirectAddIngredient={handleDirectAddIngredient}
              onAnalyzeExtract={handleAnalyzeExtract}
              isLoading={isLoading}
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

            {/* Recipe Generation Loading Banner */}
            {isGeneratingRecipes && (
              <div
                id="recipe-generating-loading"
                className="bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-emerald-500/10 border-2 border-emerald-400/40 rounded-3xl p-8 text-center shadow-lg animate-pulse"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md">
                  <ChefHat className="w-8 h-8 animate-bounce" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">
                  {lastRecommendedMainIngredients && lastRecommendedMainIngredients.length > 0
                    ? `'${lastRecommendedMainIngredients.join(', ')}' 메인 맞춤 요리 레시피를 만드는 중...`
                    : '보유 중인 재고 기반 특급 맞춤 레시피를 개발하고 있습니다...'}
                </h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  재료 조합과 유통기한 우선순위를 반영하여 셰프급 레시피와 필요 추가 재료 목록을 즉시 준비합니다.
                </p>
              </div>
            )}

            {/* STEP 3: Recipes Section (Shown when recipe recommendation generated) */}
            {recipesData && !isLoading && (
              <div id="recipes-section" className="space-y-8 animate-fadeIn scroll-mt-6">
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

            {/* Smart Storage Tips (Shows tips for fridge ingredients if matching, or random) */}
            <ChefTipsBanner ingredients={firestoreIngredients} />
          </div>
        )}

        {/* TAB 2: FAVORITE RECIPES (SEPARATE DEDICATED PAGE / TAB) */}
        {activeNavTab === 'favorites' && (
          <div className="animate-fadeIn">
            <FavoriteRecipesSection
              favorites={favoriteRecipes}
              onDeleteFavorite={handleDeleteFavoriteRecipe}
              onStartCooking={(recipe) => setActiveCookingRecipe(recipe)}
              onAddShoppingItem={handleAddShoppingItem}
              onOpenDetail={(recipe) => setDetailModalRecipe(recipe)}
              onNavigateToFridge={() => setActiveNavTab('fridge')}
            />
          </div>
        )}

        {/* TAB 3: GENERAL SHOPPING CART (SEPARATE DEDICATED PAGE / TAB) */}
        {activeNavTab === 'cart' && (
          <div className="animate-fadeIn">
            <ShoppingListSection
              items={shoppingList}
              onToggleItem={handleToggleShoppingItem}
              onDeleteItem={handleDeleteShoppingItem}
              onAddItem={handleAddShoppingItem}
              onRegisterToFridge={handleOpenFridgeRegisterFromCart}
            />
          </div>
        )}
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

      {/* Favorite Recipe Detail Modal (Allows viewing steps & putting ingredients into cart) */}
      <FavoriteRecipeDetailModal
        recipe={detailModalRecipe}
        isOpen={!!detailModalRecipe}
        onClose={() => setDetailModalRecipe(null)}
        onStartCooking={(recipe) => {
          setDetailModalRecipe(null);
          setActiveCookingRecipe(recipe);
        }}
        onAddShoppingItem={handleAddShoppingItem}
        onDeleteFavorite={handleDeleteFavoriteRecipe}
        onNavigateToCart={() => setActiveNavTab('cart')}
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

      {/* Push Notification Alarm Settings Modal (Only accessible when logged in) */}
      {currentUser && (
        <NotificationSettingsModal
          isOpen={isNotificationModalOpen}
          onClose={() => setIsNotificationModalOpen(false)}
          settings={notificationSettings}
          onUpdateSettings={(newSettings) => setNotificationSettings(newSettings)}
          ingredients={firestoreIngredients}
        />
      )}

      {/* Footer: Subtle and discreet */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-5 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>냉장고를 부탁해 • 스마트 주방 AI 어시스턴트 엔진</span>
          <span className="text-[11px] text-slate-400 font-normal">
            Firebase Firestore 클라우드 연동됨
          </span>
        </div>
      </footer>
    </div>
  );
}
