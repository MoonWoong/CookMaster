import React, { useState } from 'react';
import {
  Star,
  Trash2,
  Play,
  Clock,
  ChefHat,
  ShoppingBag,
  AlertTriangle,
  ExternalLink,
  Search,
  ShoppingCart,
  Eye,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { FavoriteRecipe } from '../types/fridge';
import { generateCoupangSearchUrl } from '../utils/recipeLogic';

interface FavoriteRecipesSectionProps {
  favorites: FavoriteRecipe[];
  onDeleteFavorite: (id: string) => Promise<void>;
  onStartCooking: (recipe: {
    title: string;
    steps: string[];
    ingredients: string[];
  }) => void;
  onAddShoppingItem: (item: string, reason: string) => void;
  onOpenDetail: (recipe: FavoriteRecipe) => void;
  onNavigateToFridge?: () => void;
}

export const FavoriteRecipesSection: React.FC<FavoriteRecipesSectionProps> = ({
  favorites,
  onDeleteFavorite,
  onStartCooking,
  onAddShoppingItem,
  onOpenDetail,
  onNavigateToFridge,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'urgent' | 'alternative' | 'expansion'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const filteredFavorites = favorites.filter((r) => {
    if (selectedFilter !== 'all' && r.recipeType !== selectedFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchIng = r.ingredients.some((ing) => ing.toLowerCase().includes(q));
      return matchTitle || matchIng;
    }
    return true;
  });

  const urgentCount = favorites.filter((r) => r.recipeType === 'urgent').length;
  const altCount = favorites.filter((r) => r.recipeType === 'alternative').length;
  const expCount = favorites.filter((r) => r.recipeType === 'expansion').length;

  const handleAddAllIngredientsToCart = (recipe: FavoriteRecipe, e: React.MouseEvent) => {
    e.stopPropagation();
    recipe.ingredients.forEach((ing) => {
      onAddShoppingItem(ing, `[${recipe.title}] 조리 필요 재료`);
    });
    showToast(`🛒 '${recipe.title}'의 재료 ${recipe.ingredients.length}개가 장바구니에 담겼습니다!`);
  };

  return (
    <section className="bg-white rounded-3xl p-5 sm:p-8 border border-amber-200/90 shadow-sm transition-all animate-fadeIn">
      {/* Toast Notice */}
      {toastMessage && (
        <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-amber-600" />
            <span>{toastMessage}</span>
          </div>
          <span className="text-[11px] text-amber-700 font-semibold underline">장바구니 탭에서 확인</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-amber-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-black tracking-wide flex items-center gap-1.5 shadow-sm">
              <Star className="w-3.5 h-3.5 fill-white" />
              나의 즐겨찾기 레시피
            </span>
            <span className="text-xs font-semibold text-slate-500">
              총 {favorites.length}개 보관 중
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-2">
            다시 보고 싶은 나만의 셰프 레시피 보관함
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            카드를 클릭하여 상세정보를 확인하고, 부족한 재료를 한 번에 장바구니에 담아 쇼핑할 수 있습니다.
          </p>
        </div>

        {/* Search Bar */}
        <div className="w-full md:w-72 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="레시피 제목 또는 식재료 검색..."
            className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none mb-4">
        <button
          type="button"
          onClick={() => setSelectedFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            selectedFilter === 'all'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          전체 ({favorites.length})
        </button>
        <button
          type="button"
          onClick={() => setSelectedFilter('urgent')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            selectedFilter === 'urgent'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60'
          }`}
        >
          🚨 임박 구출 ({urgentCount})
        </button>
        <button
          type="button"
          onClick={() => setSelectedFilter('alternative')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            selectedFilter === 'alternative'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/60'
          }`}
        >
          🍳 별미 변신 ({altCount})
        </button>
        <button
          type="button"
          onClick={() => setSelectedFilter('expansion')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            selectedFilter === 'expansion'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60'
          }`}
        >
          🛒 맞춤 확장 ({expCount})
        </button>
      </div>

      {/* Grid of Saved Favorite Recipes */}
      {filteredFavorites.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-amber-200/80 bg-amber-50/20">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <Star className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-slate-800 mb-1">
            {favorites.length === 0
              ? '아직 저장된 즐겨찾기 레시피가 없습니다'
              : '검색 조건에 맞는 레시피가 없습니다'}
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
            {favorites.length === 0
              ? '냉장고 탭에서 AI 요리 추천을 받은 후 레시피 카드의 [⭐ 즐겨찾기 저장]을 누르면 언제든 보관되어 다시 볼 수 있습니다.'
              : '다른 검색어를 입력하시거나 카테고리 필터를 변경해보세요.'}
          </p>
          {favorites.length === 0 && onNavigateToFridge && (
            <button
              type="button"
              onClick={onNavigateToFridge}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>냉장고 요리 추천 받으러 가기</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFavorites.map((recipe) => {
            const isUrgent = recipe.recipeType === 'urgent';
            const isAlternative = recipe.recipeType === 'alternative';

            return (
              <div
                key={recipe.id}
                onClick={() => onOpenDetail(recipe)}
                className="group rounded-2xl border border-slate-200/90 bg-slate-50/60 p-5 flex flex-col justify-between hover:shadow-md transition-all hover:border-amber-300 hover:bg-amber-50/20 cursor-pointer"
              >
                <div>
                  {/* Top Bar with Type and Delete */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        isUrgent
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : isAlternative
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                      }`}
                    >
                      {isUrgent ? '🚨 임박 재료 구출' : isAlternative ? '🍳 별미 변신 요리' : '🛒 확장 맞춤 요리'}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFavorite(recipe.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition-all cursor-pointer"
                      title="즐겨찾기에서 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 mb-2.5 line-clamp-2 group-hover:text-amber-900 transition-colors">
                    {recipe.title}
                  </h4>

                  {/* Rescued Ingredients if any */}
                  {recipe.usedExpiringIngredients && recipe.usedExpiringIngredients.length > 0 && (
                    <div className="mb-2.5">
                      <span className="text-[10px] font-bold text-rose-700 flex items-center gap-1 mb-1">
                        <AlertTriangle className="w-3 h-3 text-rose-500" /> 구출 재료:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {recipe.usedExpiringIngredients.map((item, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200/60 font-semibold"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ingredients Preview */}
                  <div className="mb-3">
                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 mb-1">
                      <ChefHat className="w-3 h-3 text-amber-600" /> 필요 재료 ({recipe.ingredients.length}가지):
                    </span>
                    <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed font-medium">
                      {recipe.ingredients.join(', ')}
                    </p>
                  </div>

                  {/* Missing ingredients with Coupang search links if expansion recipe */}
                  {recipe.missingIngredientsToBuy && recipe.missingIngredientsToBuy.length > 0 && (
                    <div className="mb-3 pt-2 border-t border-slate-200/60">
                      <span className="text-[10px] font-bold text-indigo-700 flex items-center gap-1 mb-1.5">
                        <ShoppingBag className="w-3 h-3 text-indigo-600" /> 추가 구매 재료:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {recipe.missingIngredientsToBuy.map((missing, i) => (
                          <div
                            key={i}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-[10px]"
                          >
                            <span className="font-semibold text-slate-800">{missing}</span>
                            <a
                              href={generateCoupangSearchUrl(missing)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-rose-600 font-extrabold hover:underline inline-flex items-center gap-0.5"
                            >
                              쿠팡 <ExternalLink className="w-2 h-2" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action Bar */}
                <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDetail(recipe);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>상세보기</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleAddAllIngredientsToCart(recipe, e)}
                      className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all"
                      title="필요 재료 장바구니에 담기"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartCooking({
                          title: recipe.title,
                          steps: recipe.steps,
                          ingredients: recipe.ingredients,
                        });
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-2xs transition-all hover:scale-105"
                    >
                      <Play className="w-3 h-3 fill-white" />
                      <span>요리 가이드</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
