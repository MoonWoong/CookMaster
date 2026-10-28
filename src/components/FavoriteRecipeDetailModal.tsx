import React, { useState } from 'react';
import {
  X,
  Star,
  Trash2,
  Play,
  ShoppingCart,
  CheckCircle2,
  ExternalLink,
  ChefHat,
  AlertTriangle,
  ShoppingBag,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';
import { FavoriteRecipe } from '../types/fridge';
import { generateCoupangSearchUrl } from '../utils/recipeLogic';

interface FavoriteRecipeDetailModalProps {
  recipe: FavoriteRecipe | null;
  isOpen: boolean;
  onClose: () => void;
  onStartCooking: (recipe: {
    title: string;
    steps: string[];
    ingredients: string[];
  }) => void;
  onAddShoppingItem: (item: string, reason: string) => void;
  onDeleteFavorite: (id: string) => Promise<void>;
  onNavigateToCart?: () => void;
}

export const FavoriteRecipeDetailModal: React.FC<FavoriteRecipeDetailModalProps> = ({
  recipe,
  isOpen,
  onClose,
  onStartCooking,
  onAddShoppingItem,
  onDeleteFavorite,
  onNavigateToCart,
}) => {
  if (!isOpen || !recipe) return null;

  // Selected ingredients for batch adding
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>(() => [
    ...recipe.ingredients,
  ]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const isUrgent = recipe.recipeType === 'urgent';
  const isAlternative = recipe.recipeType === 'alternative';

  const handleToggleSelectAll = () => {
    if (selectedIngredients.length === recipe.ingredients.length) {
      setSelectedIngredients([]);
    } else {
      setSelectedIngredients([...recipe.ingredients]);
    }
  };

  const handleToggleIngredient = (item: string) => {
    setSelectedIngredients((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleAddSingleIngredientToCart = (item: string) => {
    onAddShoppingItem(item, `[${recipe.title}] 조리 필요 재료`);
    showToast(`🛒 '${item}' 재료를 장바구니에 담았습니다.`);
  };

  const handleAddSelectedToCart = () => {
    if (selectedIngredients.length === 0) return;
    selectedIngredients.forEach((item) => {
      onAddShoppingItem(item, `[${recipe.title}] 조리 필요 재료`);
    });
    showToast(`🛒 선택한 재료 ${selectedIngredients.length}개가 장바구니에 담겼습니다!`);
  };

  const handleAddAllToCart = () => {
    recipe.ingredients.forEach((item) => {
      onAddShoppingItem(item, `[${recipe.title}] 조리 필요 재료`);
    });
    showToast(`🛒 전체 재료 ${recipe.ingredients.length}개가 장바구니에 담겼습니다!`);
  };

  const handleDelete = async () => {
    if (!recipe) return;
    setIsDeleting(true);
    try {
      await onDeleteFavorite(recipe.id);
      onClose();
    } catch (e) {
      console.error('Failed to delete favorite:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 animate-fadeIn my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-start justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                  isUrgent
                    ? 'bg-rose-500 text-white'
                    : isAlternative
                    ? 'bg-amber-400 text-amber-950'
                    : 'bg-indigo-500 text-white'
                }`}
              >
                {isUrgent ? '🚨 골든타임 임박 구출' : isAlternative ? '🍳 별미 변신 요리' : '🛒 확장 맞춤 요리'}
              </span>
              <span className="text-xs text-amber-300 font-semibold flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-300" /> 즐겨찾기 보관 레시피
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {recipe.title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast feedback */}
        {toastMessage && (
          <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between animate-fadeIn shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
              <span>{toastMessage}</span>
            </div>
            {onNavigateToCart && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToCart();
                }}
                className="text-[11px] text-emerald-700 underline font-bold hover:text-emerald-900 cursor-pointer"
              >
                장바구니 확인하기 →
              </button>
            )}
          </div>
        )}

        {/* Modal Scrollable Content */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Rescued Ingredients highlight */}
          {recipe.usedExpiringIngredients && recipe.usedExpiringIngredients.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
              <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                골든타임 구출 식재료:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {recipe.usedExpiringIngredients.map((item, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2.5 py-1 rounded-lg bg-white text-rose-900 font-bold border border-rose-200/80 shadow-2xs"
                  >
                    🔥 {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Chef Tip if available */}
          {recipe.chefTip && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-amber-900 block mb-0.5">셰프의 한 끗 비법</span>
                <p className="text-xs text-amber-800 leading-relaxed font-medium">{recipe.chefTip}</p>
              </div>
            </div>
          )}

          {/* Missing Ingredients with direct coupang link (for expansion recipes) */}
          {recipe.missingIngredientsToBuy && recipe.missingIngredientsToBuy.length > 0 && (
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-indigo-600" />
                  추가 구매가 필요한 재료:
                </span>
                <span className="text-[11px] text-indigo-600 font-medium">쿠팡 바로가기 지원</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {recipe.missingIngredientsToBuy.map((missing, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-xl bg-white border border-indigo-100 shadow-2xs"
                  >
                    <span className="text-xs font-bold text-slate-800 truncate mr-2">{missing}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAddSingleIngredientToCart(missing)}
                        className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold cursor-pointer"
                        title="장바구니 담기"
                      >
                        + 장바구니
                      </button>
                      <a
                        href={generateCoupangSearchUrl(missing)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-extrabold inline-flex items-center gap-0.5"
                      >
                        쿠팡 <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* INGREDIENTS SECTION WITH CART CONTROLS */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <ChefHat className="w-4 h-4 text-amber-600" />
                  필요한 식재료 목록 ({recipe.ingredients.length}가지)
                </h4>
                <p className="text-[11px] text-slate-500">
                  필요한 재료를 선택하거나 한 번에 장바구니로 보낼 수 있습니다.
                </p>
              </div>

              {/* Select all & Quick buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                >
                  {selectedIngredients.length === recipe.ingredients.length ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>전체 해제</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                      <span>전체 선택</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleAddSelectedToCart}
                  disabled={selectedIngredients.length === 0}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>선택 담기 ({selectedIngredients.length})</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddAllToCart}
                  className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                >
                  <span>전체 담기</span>
                </button>
              </div>
            </div>

            {/* Ingredients Item List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {recipe.ingredients.map((item, idx) => {
                const isSelected = selectedIngredients.includes(item);
                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-300'
                        : 'bg-slate-50 border-slate-200/90'
                    }`}
                  >
                    <label className="flex items-center gap-2 min-w-0 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleIngredient(item)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                      />
                      <span className="text-xs font-semibold text-slate-800 truncate">{item}</span>
                    </label>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAddSingleIngredientToCart(item)}
                        className="p-1.5 rounded-lg bg-white hover:bg-emerald-100 text-emerald-700 border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer text-[11px] font-bold inline-flex items-center gap-0.5"
                        title="장바구니에 담기"
                      >
                        <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="hidden sm:inline">담기</span>
                      </button>

                      <a
                        href={generateCoupangSearchUrl(item)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-300 transition-all text-[11px] font-bold inline-flex items-center gap-0.5"
                        title="쿠팡 검색"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COOKING STEPS */}
          <div className="space-y-3 pt-2">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              단계별 조리 순서 ({recipe.steps.length}단계)
            </h4>

            <div className="space-y-2.5">
              {recipe.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-200/80"
                >
                  <span className="w-6 h-6 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xs font-black shrink-0 mt-0.5 shadow-2xs">
                    {idx + 1}
                  </span>
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleDelete}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isDeleting ? '삭제 중...' : '즐겨찾기에서 제거'}</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs cursor-pointer"
            >
              닫기
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onStartCooking({
                  title: recipe.title,
                  steps: recipe.steps,
                  ingredients: recipe.ingredients,
                });
              }}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs sm:text-sm shadow-md transition-all hover:scale-[1.01] cursor-pointer flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>요리 가이드 시작</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
