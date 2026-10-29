import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  Calendar,
  Sparkles,
  Image as ImageIcon,
  Loader2,
  Refrigerator,
  Package,
  MinusCircle,
  Scissors,
  ShoppingCart,
  Star,
  UtensilsCrossed,
  X,
  Clock,
} from 'lucide-react';
import { IngredientStatus, ParsedIngredient, ItemType, DateManageType } from '../types/fridge';
import {
  calculateDDay,
  calculateStorageDay,
  calculateIngredientFreshness,
  calculateRemainingQuantity,
} from '../utils/recipeLogic';
import { getRecognizableIcon, generateStylizedFoodSvg } from '../utils/ingredientIcons';
import { fetchOrGenerateIngredientImage } from '../lib/ingredientsService';
import { InventoryUsageModal } from './InventoryUsageModal';

interface IngredientsDashboardProps {
  ingredients: ParsedIngredient[];
  onAddIngredient: (item: Omit<ParsedIngredient, 'id'>) => Promise<void>;
  onUpdateIngredient: (id: string, updates: Partial<ParsedIngredient>) => Promise<void>;
  onDeleteIngredient: (id: string) => Promise<void>;
  onTriggerRecipeGeneration: (selectedMainIngredients?: string[]) => void;
  isGeneratingRecipes?: boolean;
  onAddShoppingItem: (item: string, reason: string) => void;
}

export const IngredientsDashboard: React.FC<IngredientsDashboardProps> = ({
  ingredients,
  onAddIngredient,
  onUpdateIngredient,
  onDeleteIngredient,
  onTriggerRecipeGeneration,
  isGeneratingRecipes,
  onAddShoppingItem,
}) => {
  const [filter, setFilter] = useState<'all' | 'ingredients' | 'side_dishes' | 'urgent'>('all');
  const [generatingImageId, setGeneratingImageId] = useState<string | null>(null);
  const [usageTargetItem, setUsageTargetItem] = useState<ParsedIngredient | null>(null);
  const [selectedMainIngredients, setSelectedMainIngredients] = useState<string[]>([]);

  // Dynamically evaluate freshness status and item type for each ingredient
  const ingredientsWithEvaluatedStatus = ingredients.map((item) => {
    const freshness = calculateIngredientFreshness(item);
    return {
      ...item,
      itemType: item.itemType || 'ingredient',
      dateManageType: item.dateManageType || 'expiry',
      evaluatedStatus: freshness.status,
      freshness,
      dday: { label: freshness.label, status: freshness.status },
    };
  });

  const rawIngredientsCount = ingredientsWithEvaluatedStatus.filter((i) => i.itemType !== 'side_dish').length;
  const sideDishCount = ingredientsWithEvaluatedStatus.filter((i) => i.itemType === 'side_dish').length;
  const expiredCount = ingredientsWithEvaluatedStatus.filter((i) => i.evaluatedStatus === 'expired').length;
  const warningCount = ingredientsWithEvaluatedStatus.filter((i) => i.evaluatedStatus === 'warning').length;
  const freshCount = ingredientsWithEvaluatedStatus.filter((i) => i.evaluatedStatus === 'fresh').length;

  const filteredIngredients = ingredientsWithEvaluatedStatus.filter((item) => {
    if (filter === 'ingredients') return item.itemType !== 'side_dish';
    if (filter === 'side_dishes') return item.itemType === 'side_dish';
    if (filter === 'urgent') return item.evaluatedStatus === 'expired' || item.evaluatedStatus === 'warning';
    return true;
  });

  const handleGenerateCustomIllustration = async (item: ParsedIngredient) => {
    setGeneratingImageId(item.id);
    try {
      const generatedUrl = await fetchOrGenerateIngredientImage(item.name);
      await onUpdateIngredient(item.id, {
        imageUrl: generatedUrl,
      });
    } catch (e) {
      console.warn('Failed to generate illustration:', e);
      const fallbackUrl = generateStylizedFoodSvg(item.name);
      await onUpdateIngredient(item.id, {
        imageUrl: fallbackUrl,
      });
    } finally {
      setGeneratingImageId(null);
    }
  };

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleAddSingleToCart = (item: (typeof ingredientsWithEvaluatedStatus)[0]) => {
    const reason = item.itemType === 'side_dish' ? '반찬 재구매' : '식재료 보충 구매';
    onAddShoppingItem(item.name, reason);
    showToast(`🛒 '${item.name}' 장바구니에 담겼습니다!`);
  };

  const handleUpdateQuantity = async (id: string, newQuantity: string) => {
    await onUpdateIngredient(id, { quantity: newQuantity });
  };

  const handleToggleMainIngredient = (name: string) => {
    setSelectedMainIngredients((prev) => {
      if (prev.includes(name)) {
        return prev.filter((n) => n !== name);
      } else {
        return [...prev, name];
      }
    });
  };

  const handleClearMainIngredients = () => {
    setSelectedMainIngredients([]);
  };

  const handleRecommendRecipes = () => {
    onTriggerRecipeGeneration(selectedMainIngredients.length > 0 ? selectedMainIngredients : undefined);
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/90">
      {/* Toast Notice for Cart additions */}
      {toastMessage && (
        <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-amber-600" />
            <span>{toastMessage}</span>
          </div>
          <span className="text-[11px] text-amber-700 underline font-semibold">장바구니에서 확인 가능</span>
        </div>
      )}

      {/* Header & Stats Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/60">
              내 냉장고 현황판
            </span>
            <span className="text-xs text-slate-500 font-medium">
              총 {ingredients.length}개 품목 (식재료 {rawIngredientsCount} · 반찬 {sideDishCount})
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
            식재료 & 반찬 재고 관리 및 맞춤 요리
          </h3>
        </div>

        {/* Counter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200/80 text-xs font-bold">
            <span>🥬 식재료: {rawIngredientsCount}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200/80 text-xs font-bold">
            <span>🍱 반찬: {sideDishCount}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200/80 text-xs font-bold">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>기한 지남: {expiredCount}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/80 text-xs font-bold">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>임박: {warningCount}</span>
          </div>
        </div>
      </div>

      {/* Main Ingredient (주재료) Selection Banner */}
      {ingredients.length > 0 && (
        <div
          className={`mb-5 p-4 rounded-2xl border transition-all ${
            selectedMainIngredients.length > 0
              ? 'bg-amber-50/90 border-amber-300 shadow-2xs'
              : 'bg-slate-50/80 border-slate-200'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span
                className={`p-2 rounded-xl shrink-0 ${
                  selectedMainIngredients.length > 0
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                <UtensilsCrossed className="w-4 h-4" />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    메인 식재료 지정 요리 추천
                  </h4>
                  {selectedMainIngredients.length > 0 ? (
                    <span className="text-[11px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                      {selectedMainIngredients.length}개 재료 선택됨
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                      원하는 재료의 [⭐ 메인] 버튼을 눌러보세요
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  활용하고 싶은 메인 식재료를 선택하시면, 해당 재료를 중심으로 한 맞춤 셰프 레시피를 우선 추천해 드립니다.
                </p>
              </div>
            </div>

            {/* If selected, show fast-recommend action button */}
            {selectedMainIngredients.length > 0 && (
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleClearMainIngredients}
                  className="px-2.5 py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-all cursor-pointer"
                >
                  선택 초기화
                </button>
              </div>
            )}
          </div>

          {/* Selected Chips List */}
          {selectedMainIngredients.length > 0 && (
            <div className="mt-3 pt-3 border-t border-amber-200/80 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-amber-900 shrink-0">선택된 메인 재료:</span>
              {selectedMainIngredients.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-amber-300 text-amber-900 text-xs font-bold shadow-2xs"
                >
                  <span>⭐ {name}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleMainIngredient(name)}
                    className="p-0.5 hover:bg-amber-100 rounded-full text-amber-700 cursor-pointer"
                    title="선택 해제"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter and Prominent Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 p-2 bg-slate-50/80 rounded-2xl border border-slate-200/80">
        {/* Category & Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200/70 flex-wrap">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            전체 ({ingredients.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('ingredients')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filter === 'ingredients'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 hover:text-emerald-900'
            }`}
          >
            🥬 식재료 ({rawIngredientsCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('side_dishes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filter === 'side_dishes'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-800 hover:text-amber-950'
            }`}
          >
            🍱 반찬 ({sideDishCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('urgent')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filter === 'urgent'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-600 hover:text-rose-700'
            }`}
          >
            🚨 임박·위험 ({expiredCount + warningCount})
          </button>
        </div>

        {/* PROMINENT, EYE-CATCHING AI RECIPE RECOMMENDATION BUTTON */}
        {ingredients.length > 0 && (
          <button
            type="button"
            onClick={handleRecommendRecipes}
            disabled={isGeneratingRecipes}
            className={`w-full lg:w-auto px-6 py-3 rounded-2xl text-white font-extrabold text-sm sm:text-base transition-all shadow-md hover:shadow-xl cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2.5 active:scale-[0.98] ${
              selectedMainIngredients.length > 0
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 ring-2 ring-amber-300 ring-offset-2'
                : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 ring-2 ring-emerald-300 ring-offset-2'
            }`}
          >
            {isGeneratingRecipes ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>AI 셰프가 특급 맞춤 레시피 개발 중...</span>
              </>
            ) : selectedMainIngredients.length > 0 ? (
              <>
                <Sparkles className="w-5 h-5 text-yellow-200 animate-pulse" />
                <span>'{selectedMainIngredients.join(', ')}' 메인 맞춤 요리 추천받기 ➔</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
                <span>✨ AI 맞춤 요리 레시피 추천받기 ➔</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Empty State when no ingredients registered */}
      {ingredients.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Refrigerator className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-slate-800 mb-1">
            냉장고에 등록된 식재료가 없습니다
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-2 leading-relaxed">
            상단 양식에서 식재료(품목, 유통기한, 수량)를 직접 입력하거나 사진/영수증을 스캔하여 등록해보세요.
          </p>
          <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-md inline-block border border-emerald-200/60">
            등록된 재료는 실시간 보관함에 안전하게 저장되어 재고 차감 및 유통기한 추적이 가능합니다.
          </span>
        </div>
      ) : (
        /* Ingredients Grid with Inventory Controls */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {filteredIngredients.map((item) => {
            const isExpired = item.evaluatedStatus === 'expired';
            const isWarning = item.evaluatedStatus === 'warning';
            const dday = item.dday;
            const iconMatch = getRecognizableIcon(item.name);
            const lacksIcon = !iconMatch.recognized;
            const displayImage = item.imageUrl || (lacksIcon ? generateStylizedFoodSvg(item.name) : null);
            const isGeneratingThis = generatingImageId === item.id;
            const itemQty = item.quantity || '1개';
            const isMain = selectedMainIngredients.includes(item.name);

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between hover:shadow-xs relative ${
                  isMain
                    ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/80 shadow-xs'
                    : isExpired
                    ? 'bg-rose-50/60 border-rose-200 text-rose-950'
                    : isWarning
                    ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                    : 'bg-slate-50/70 border-slate-200 text-slate-800'
                }`}
              >
                {/* Main badge indicator if selected */}
                {isMain && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black shadow-2xs tracking-wide">
                    ★ 메인 재료 선택됨
                  </span>
                )}

                <div>
                  {/* Top Bar with Icon or Stylized Illustration Thumbnail */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      {iconMatch.recognized && !item.imageUrl ? (
                        <span className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-xl shadow-2xs">
                          {iconMatch.icon}
                        </span>
                      ) : (
                        <div className="relative group/thumb">
                          <img
                            src={displayImage || generateStylizedFoodSvg(item.name)}
                            alt={item.name}
                            className="w-10 h-10 rounded-2xl object-cover border border-emerald-300 shadow-2xs bg-white"
                          />
                          <span
                            className="absolute -bottom-1 -right-1 text-[9px] bg-emerald-600 text-white px-1 rounded-sm font-bold shadow-2xs"
                            title="AI 일러스트"
                          >
                            🎨 AI
                          </span>
                        </div>
                      )}

                      <div className="min-w-0">
                        <span className="font-bold text-sm leading-tight text-slate-900 block truncate">
                          {item.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateIngredient(item.id, {
                                itemType: item.itemType === 'side_dish' ? 'ingredient' : 'side_dish',
                              })
                            }
                            className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold border transition-all cursor-pointer ${
                              item.itemType === 'side_dish'
                                ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                            }`}
                            title="클릭하여 식재료/반찬 구분 전환"
                          >
                            {item.itemType === 'side_dish' ? '🍱 반찬' : '🥬 식재료'}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onUpdateIngredient(item.id, {
                                dateManageType: item.dateManageType === 'registered' ? 'expiry' : 'registered',
                                registeredDate: item.registeredDate || item.expiryDate || new Date().toISOString().slice(0, 10),
                              })
                            }
                            className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold border transition-all cursor-pointer ${
                              item.dateManageType === 'registered'
                                ? 'bg-blue-100 text-blue-900 border-blue-300 hover:bg-blue-200'
                                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                            }`}
                            title="클릭하여 유통기한/등록일 관리 방식 전환"
                          >
                            {item.dateManageType === 'registered' ? '📝 등록일' : '📅 유통기한'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleMainIngredient(item.name)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          isMain
                            ? 'bg-amber-500 text-white shadow-2xs font-black'
                            : 'bg-white hover:bg-amber-50 text-slate-600 hover:text-amber-700 border border-slate-200'
                        }`}
                        title={isMain ? '메인 재료 해제' : '오늘 요리의 메인 재료로 지정'}
                      >
                        <Star className={`w-3 h-3 ${isMain ? 'fill-white text-white' : 'text-amber-400'}`} />
                        <span>{isMain ? '메인✓' : '메인'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteIngredient(item.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-white/80 transition-all cursor-pointer"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quantity & Inventory Stock Manager Bar */}
                  <div className="my-2.5 p-2 rounded-xl bg-white/95 border border-slate-200/80 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Package className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-xs font-black text-slate-800 font-mono truncate">
                        {itemQty}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setUsageTargetItem(item)}
                        className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold inline-flex items-center gap-0.5 cursor-pointer transition-all"
                        title="재고 사용량 차감하기"
                      >
                        <Scissors className="w-3 h-3 text-emerald-600" />
                        <span>사용</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddSingleToCart(item)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-0.5 cursor-pointer transition-all ${
                          isWarning || isExpired
                            ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                        }`}
                        title={isWarning || isExpired ? '임박 재료 장바구니에 담기' : '장바구니에 담기'}
                      >
                        <ShoppingCart className="w-3 h-3" />
                        <span>담기</span>
                      </button>
                    </div>
                  </div>

                  {/* Stylized Illustration Card for ingredients lacking standard icons */}
                  {lacksIcon && (
                    <div className="mb-2 p-1.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between gap-1 text-[11px]">
                      <span className="text-emerald-800 font-medium text-[10px]">
                        맞춤 일러스트
                      </span>
                      <button
                        type="button"
                        disabled={isGeneratingThis}
                        onClick={() => handleGenerateCustomIllustration(item)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-white text-emerald-700 border border-emerald-300 font-bold hover:bg-emerald-50 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        {isGeneratingThis ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5 text-amber-500" />}
                        <span>재생성</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Expiry Date / Registration Date and Automatic Freshness Judgement Badge */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/50 text-xs">
                  <div className="flex items-center gap-1 text-slate-500 min-w-0">
                    {item.dateManageType === 'registered' ? (
                      <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    ) : (
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <span className="text-[11px] font-medium truncate">
                      {item.freshness.subLabel}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold select-none shadow-2xs shrink-0 ${
                      isExpired
                        ? 'bg-rose-600 text-white'
                        : isWarning
                        ? 'bg-amber-500 text-white'
                        : item.dateManageType === 'registered'
                        ? 'bg-blue-600 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                    title={item.freshness.subLabel}
                  >
                    {isExpired
                      ? `🚨 ${item.freshness.label}`
                      : isWarning
                      ? `⚠️ ${item.freshness.label}`
                      : `✅ ${item.freshness.label}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inventory Usage Modal */}
      {usageTargetItem && (
        <InventoryUsageModal
          ingredient={usageTargetItem}
          onClose={() => setUsageTargetItem(null)}
          onUpdateQuantity={handleUpdateQuantity}
          onDeleteIngredient={onDeleteIngredient}
          onAddShoppingItem={onAddShoppingItem}
        />
      )}
    </div>
  );
};
