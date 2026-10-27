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
} from 'lucide-react';
import { IngredientStatus, ParsedIngredient } from '../types/fridge';
import { calculateDDay, calculateRemainingQuantity } from '../utils/recipeLogic';
import { getRecognizableIcon, generateStylizedFoodSvg } from '../utils/ingredientIcons';
import { fetchOrGenerateIngredientImage } from '../lib/ingredientsService';
import { InventoryUsageModal } from './InventoryUsageModal';

interface IngredientsDashboardProps {
  ingredients: ParsedIngredient[];
  onAddIngredient: (item: Omit<ParsedIngredient, 'id'>) => Promise<void>;
  onUpdateIngredient: (id: string, updates: Partial<ParsedIngredient>) => Promise<void>;
  onDeleteIngredient: (id: string) => Promise<void>;
  onTriggerRecipeGeneration: () => void;
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
  const [filter, setFilter] = useState<'all' | 'urgent' | 'fresh'>('all');
  const [generatingImageId, setGeneratingImageId] = useState<string | null>(null);
  const [usageTargetItem, setUsageTargetItem] = useState<ParsedIngredient | null>(null);

  // Dynamically evaluate freshness status for each ingredient based on remaining expiry date
  const ingredientsWithEvaluatedStatus = ingredients.map((item) => {
    const dday = calculateDDay(item.expiryDate);
    return {
      ...item,
      evaluatedStatus: dday.status,
      dday,
    };
  });

  const expiredCount = ingredientsWithEvaluatedStatus.filter((i) => i.evaluatedStatus === 'expired').length;
  const warningCount = ingredientsWithEvaluatedStatus.filter((i) => i.evaluatedStatus === 'warning').length;
  const freshCount = ingredientsWithEvaluatedStatus.filter((i) => i.evaluatedStatus === 'fresh').length;

  const filteredIngredients = ingredientsWithEvaluatedStatus.filter((item) => {
    if (filter === 'urgent') return item.evaluatedStatus === 'expired' || item.evaluatedStatus === 'warning';
    if (filter === 'fresh') return item.evaluatedStatus === 'fresh';
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
    const isUrgent = item.evaluatedStatus === 'expired' || item.evaluatedStatus === 'warning';
    const reason = isUrgent
      ? `유통기한 임박(${item.expiryDate}) 보충 구매`
      : '식재료 보충 구매';
    onAddShoppingItem(item.name, reason);
    showToast(`🛒 '${item.name}' 장바구니에 추가되었습니다!`);
  };

  const handleAddAllUrgentToCart = () => {
    const urgentItems = ingredientsWithEvaluatedStatus.filter(
      (i) => i.evaluatedStatus === 'expired' || i.evaluatedStatus === 'warning'
    );
    if (urgentItems.length === 0) return;
    urgentItems.forEach((ing) => {
      onAddShoppingItem(ing.name, `유통기한 임박/경과(${ing.expiryDate}) 즉시 대체 구매`);
    });
    showToast(`🛒 임박 식재료 ${urgentItems.length}개가 장바구니에 담겼습니다!`);
  };

  const handleUpdateQuantity = async (id: string, newQuantity: string) => {
    await onUpdateIngredient(id, { quantity: newQuantity });
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
            <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md font-bold border border-orange-200/70">
              🔥 Firebase 실시간 연동
            </span>
            <span className="text-xs text-slate-400 font-medium">총 {ingredients.length}개 품목</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
            식재료 신선도 및 실시간 재고 관리
          </h3>
        </div>

        {/* Counter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200/80 text-xs font-bold">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>기한 지남: {expiredCount}개</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/80 text-xs font-bold">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>임박: {warningCount}개</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>신선: {freshCount}개</span>
          </div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/70 self-start">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            전체 ({ingredients.length})
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
            🚨 위험·임박만 ({expiredCount + warningCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('fresh')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filter === 'fresh'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 hover:text-emerald-800'
            }`}
          >
            ✅ 신선 ({freshCount})
          </button>
        </div>

        {/* Action: Batch Urgent Add to Cart & Recipe Generate */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {expiredCount + warningCount > 0 && (
            <button
              type="button"
              onClick={handleAddAllUrgentToCart}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="임박 및 경과 재료를 장바구니에 일괄 추가합니다"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-amber-600" />
              <span>🚨 임박 재료 장바구니 담기 ({expiredCount + warningCount}개)</span>
            </button>
          )}

          {ingredients.length > 0 && (
            <button
              type="button"
              onClick={onTriggerRecipeGeneration}
              disabled={isGeneratingRecipes}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              {isGeneratingRecipes ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>셰프가 레시피 추천 조합 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>현재 보관 재료로 요리 추천받기</span>
                </>
              )}
            </button>
          )}
        </div>
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
          <span className="text-[11px] text-orange-600 font-bold bg-orange-50 px-2.5 py-1 rounded-md inline-block">
            등록된 재료는 Firebase에 저장되어 재고 차감 및 유통기한 추적이 가능합니다.
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

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between hover:shadow-xs ${
                  isExpired
                    ? 'bg-rose-50/60 border-rose-200 text-rose-950'
                    : isWarning
                    ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                    : 'bg-slate-50/70 border-slate-200 text-slate-800'
                }`}
              >
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
                        <span className="text-[10px] text-slate-500 block">
                          {iconMatch.category}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteIngredient(item.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-white/80 transition-all cursor-pointer"
                      title="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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

                {/* Expiry Date and Automatic Freshness Judgement Badge */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/50 text-xs">
                  <div className="flex items-center gap-1 text-slate-500">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span className="text-[11px] font-medium">{item.expiryDate}</span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold select-none shadow-2xs ${
                      isExpired
                        ? 'bg-rose-600 text-white'
                        : isWarning
                        ? 'bg-amber-500 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                    title={`남은 유통기한 기준 자동 판정 (${dday.label})`}
                  >
                    {isExpired ? `🚨 ${dday.label}` : isWarning ? `⚠️ ${dday.label}` : `✅ ${dday.label}`}
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
