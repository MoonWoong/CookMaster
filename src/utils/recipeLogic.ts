import {
  FridgeAssistantData,
  IngredientStatus,
  ParsedIngredient,
  ShoppingListItem,
  ItemType,
  DateManageType,
} from '../types/fridge';

/**
 * Calculates remaining days from an expiry date string or keyword.
 */
export function calculateDDay(
  expiryDateStr: string,
  baseDate: Date = new Date()
): { daysRemaining: number | null; label: string; status: IngredientStatus } {
  if (!expiryDateStr) {
    return { daysRemaining: null, label: '정보 없음', status: 'fresh' };
  }

  const clean = expiryDateStr.trim().toLowerCase();

  // Check for textual hints first
  if (clean.includes('지남') || clean.includes('경과') || clean.includes('만료') || clean.includes('expired')) {
    return { daysRemaining: -1, label: '기한 지남', status: 'expired' };
  }
  if (clean.includes('오늘') || clean.includes('d-day') || clean.includes('d-0') || clean.includes('당일')) {
    return { daysRemaining: 0, label: 'D-Day (오늘)', status: 'warning' };
  }
  if (clean.includes('내일') || clean.includes('d-1')) {
    return { daysRemaining: 1, label: 'D-1 (내일)', status: 'warning' };
  }
  if (clean.includes('임박') || clean.includes('d-2') || clean.includes('d-3')) {
    return { daysRemaining: 2, label: 'D-2 (임박)', status: 'warning' };
  }

  // Attempt to parse YYYY-MM-DD or YYYY.MM.DD
  const dateMatch = clean.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (dateMatch) {
    const year = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10) - 1;
    const day = parseInt(dateMatch[3], 10);

    const targetDate = new Date(year, month, day);
    const today = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        daysRemaining: diffDays,
        label: `${Math.abs(diffDays)}일 지남`,
        status: 'expired',
      };
    }
    if (diffDays === 0) {
      return { daysRemaining: 0, label: 'D-Day (오늘)', status: 'warning' };
    }
    if (diffDays <= 3) {
      return { daysRemaining: diffDays, label: `D-${diffDays} (임박)`, status: 'warning' };
    }
    return { daysRemaining: diffDays, label: `D-${diffDays}`, status: 'fresh' };
  }

  return { daysRemaining: null, label: expiryDateStr, status: 'fresh' };
}

/**
 * Calculates storage days and freshness status based on registration/storage date (등록일).
 */
export function calculateStorageDay(
  registeredDateStr: string,
  baseDate: Date = new Date(),
  itemType: ItemType = 'ingredient'
): { daysPassed: number; label: string; status: IngredientStatus } {
  if (!registeredDateStr) {
    return { daysPassed: 0, label: '오늘 등록 (0일차)', status: 'fresh' };
  }

  const clean = registeredDateStr.trim();
  const dateMatch = clean.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (!dateMatch) {
    return { daysPassed: 0, label: clean, status: 'fresh' };
  }

  const year = parseInt(dateMatch[1], 10);
  const month = parseInt(dateMatch[2], 10) - 1;
  const day = parseInt(dateMatch[3], 10);

  const regDate = new Date(year, month, day);
  const today = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());

  const diffTime = today.getTime() - regDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return { daysPassed: 0, label: '오늘 등록 (0일차)', status: 'fresh' };
  }

  // Side dishes (반찬) typically last longer (kimchi, jangjorim, anchovies) than fresh ingredients
  const isSideDish = itemType === 'side_dish';
  const warningThreshold = isSideDish ? 10 : 5; // side dishes warning at day 10+, raw ingredients at day 5+
  const expiredThreshold = isSideDish ? 25 : 12; // side dishes critical at day 25+, raw ingredients at day 12+

  if (diffDays >= expiredThreshold) {
    return {
      daysPassed: diffDays,
      label: `보관 ${diffDays}일차 (장기보관)`,
      status: 'expired',
    };
  }
  if (diffDays >= warningThreshold) {
    return {
      daysPassed: diffDays,
      label: `보관 ${diffDays}일차 (소진권장)`,
      status: 'warning',
    };
  }

  return {
    daysPassed: diffDays,
    label: `보관 ${diffDays}일차`,
    status: 'fresh',
  };
}

/**
 * Unified calculation helper supporting both 'expiry' and 'registered' date management types.
 */
export function calculateIngredientFreshness(
  item: {
    expiryDate: string;
    dateManageType?: DateManageType;
    registeredDate?: string;
    itemType?: ItemType;
    name?: string;
    [key: string]: any;
  },
  baseDate: Date = new Date()
): {
  type: DateManageType;
  displayDate: string;
  label: string;
  subLabel: string;
  status: IngredientStatus;
  isUrgentOrWarning: boolean;
} {
  const isRegistered = item.dateManageType === 'registered';

  if (isRegistered) {
    const regDate = item.registeredDate || item.expiryDate;
    const res = calculateStorageDay(regDate, baseDate, item.itemType);
    return {
      type: 'registered',
      displayDate: regDate,
      label: res.label,
      subLabel: `등록일: ${regDate}`,
      status: res.status,
      isUrgentOrWarning: res.status === 'warning' || res.status === 'expired',
    };
  }

  const dday = calculateDDay(item.expiryDate, baseDate);
  return {
    type: 'expiry',
    displayDate: item.expiryDate,
    label: dday.label,
    subLabel: `유통기한: ${item.expiryDate}`,
    status: dday.status,
    isUrgentOrWarning: dday.status === 'warning' || dday.status === 'expired',
  };
}

/**
 * Generates direct Coupang search link for a shopping item
 */
export function generateCoupangSearchUrl(item: string): string {
  const cleanItem = item.replace(/\(.*?\)/g, '').trim();
  return `https://www.coupang.com/np/search?component=&q=${encodeURIComponent(cleanItem)}`;
}

/**
 * Formats seconds into MM:SS
 */
export function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Extracts cooking minutes mentioned in recipe step text (e.g. "5분간 끓여줍니다" -> 5)
 */
export function extractMinutesFromStep(stepText: string): number | null {
  if (!stepText) return null;
  const match = stepText.match(/(\d+)\s*분/);
  if (match) {
    const mins = parseInt(match[1], 10);
    return mins > 0 && mins <= 180 ? mins : null;
  }
  return null;
}

/**
 * Normalizes raw response from Gemini into complete FridgeAssistantData
 */
/**
 * Extracts numeric quantity and unit from item name if present (e.g. "계란 5알" -> "5알")
 */
export function extractQuantityFromName(fullName: string): { cleanName: string; quantity: string } {
  if (!fullName) return { cleanName: '', quantity: '1개' };

  const match = fullName.match(/^(.*?)\s*(\d+(?:\.\d+)?\s*(?:개|알|구|모|단|봉|봉지|캔|통|팩|g|kg|ml|l|L|마리|포기|쪽|스푼|줄))\s*$/i);
  if (match) {
    return {
      cleanName: match[1].trim(),
      quantity: match[2].trim(),
    };
  }

  return {
    cleanName: fullName.trim(),
    quantity: '1개',
  };
}

/**
 * Calculates remaining inventory quantity after using a given amount
 * e.g. "5개" - 2 -> "3개" (isDepleted: false)
 * e.g. "2알" - 2 -> "0알" (isDepleted: true)
 */
export function calculateRemainingQuantity(
  currentQuantity: string,
  usedCount: number
): { remaining: string; isDepleted: boolean; remainingNumber: number } {
  if (!currentQuantity || usedCount <= 0) {
    return { remaining: currentQuantity || '0', isDepleted: false, remainingNumber: 0 };
  }

  const match = currentQuantity.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z가-힣%]*)$/);
  if (match) {
    const num = parseFloat(match[1]);
    const unit = match[2] || '';
    const newNum = Math.max(0, num - usedCount);
    const formatted = Number.isInteger(newNum) ? newNum.toString() : newNum.toFixed(1);
    const remaining = unit ? `${formatted}${unit}` : formatted;
    return {
      remaining,
      isDepleted: newNum <= 0,
      remainingNumber: newNum,
    };
  }

  return {
    remaining: '0',
    isDepleted: true,
    remainingNumber: 0,
  };
}

export function normalizeFridgeResponse(
  raw: any,
  baseDate: Date = new Date()
): FridgeAssistantData {
  const rawIngredients = Array.isArray(raw?.parsedIngredients) ? raw.parsedIngredients : [];

  const parsedIngredients: ParsedIngredient[] = rawIngredients.map((item: any, index: number) => {
    const rawName = String(item?.name || `식재료 ${index + 1}`).trim();
    const extracted = extractQuantityFromName(rawName);
    const name = extracted.cleanName || rawName;
    const quantity = String(item?.quantity || extracted.quantity || '1개').trim();
    const expiryDate = String(item?.expiryDate || '정보 없음').trim();
    const ddayInfo = calculateDDay(expiryDate, baseDate);

    // If item.status is provided, respect it unless dday calculation determined expired
    let status: IngredientStatus = ddayInfo.status;
    if (item?.status === 'expired' || item?.status?.includes('지남')) {
      status = 'expired';
    } else if (item?.status === 'warning' || item?.status?.includes('임박')) {
      status = 'warning';
    } else if (item?.status === 'fresh' || item?.status?.includes('신선')) {
      status = ddayInfo.status === 'expired' ? 'expired' : 'fresh';
    }

    return {
      id: `ing-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      expiryDate,
      status,
      quantity,
    };
  });

  const rawUrgent = raw?.recipes?.urgentRecipe || {};
  const urgentRecipe = {
    title: String(rawUrgent.title || '유통기한 임박 식재료 구출 찌개/볶음'),
    usedExpiringIngredients: Array.isArray(rawUrgent.usedExpiringIngredients)
      ? rawUrgent.usedExpiringIngredients.map(String)
      : [],
    ingredients: Array.isArray(rawUrgent.ingredients)
      ? rawUrgent.ingredients.map(String)
      : [],
    steps: Array.isArray(rawUrgent.steps)
      ? rawUrgent.steps.map(String)
      : ['재료를 깨끗이 손질합니다.', '팬에 기름을 두르고 볶거나 냄비에 끓여 완성합니다.'],
    estimatedTimeMinutes: 15,
    difficulty: '쉬움' as const,
  };

  const rawAlternative = raw?.recipes?.alternativeRecipe || {};
  const alternativeRecipe = {
    title: String(rawAlternative.title || '남은 식재료를 활용한 별미 요리'),
    ingredients: Array.isArray(rawAlternative.ingredients)
      ? rawAlternative.ingredients.map(String)
      : [],
    steps: Array.isArray(rawAlternative.steps)
      ? rawAlternative.steps.map(String)
      : ['재료를 한 입 크기로 썰어 준비합니다.', '양념을 더해 맛있게 조리합니다.'],
    estimatedTimeMinutes: 20,
    difficulty: '보통' as const,
  };

  const rawExpansions = Array.isArray(raw?.recipes?.expansionRecipes)
    ? raw.recipes.expansionRecipes
    : [];
  const expansionRecipes = rawExpansions.map((exp: any, index: number) => ({
    title: String(exp?.title || `확장 레시피 ${index + 1}`),
    currentIngredientsUsed: Array.isArray(exp?.currentIngredientsUsed)
      ? exp.currentIngredientsUsed.map(String)
      : [],
    missingIngredientsToBuy: Array.isArray(exp?.missingIngredientsToBuy)
      ? exp.missingIngredientsToBuy.map(String)
      : [],
    briefSteps: String(exp?.briefSteps || '재료를 추가하여 간단히 조리합니다.'),
    estimatedTimeMinutes: 25,
  }));

  const rawShopping = Array.isArray(raw?.shoppingList) ? raw.shoppingList : [];
  const shoppingList: ShoppingListItem[] = rawShopping.map((shop: any, index: number) => {
    const item = String(shop?.item || `식재료 ${index + 1}`).trim();
    return {
      id: `shop-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      item,
      reason: String(shop?.reason || '부족한 식재료 보충'),
      coupangUrl: generateCoupangSearchUrl(item),
      checked: false,
    };
  });

  return {
    parsedIngredients,
    recipes: {
      urgentRecipe,
      alternativeRecipe,
      expansionRecipes,
    },
    shoppingList,
  };
}
