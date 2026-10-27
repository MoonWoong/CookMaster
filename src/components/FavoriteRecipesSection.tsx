import React from 'react';
import {
  Star,
  Trash2,
  Play,
  Clock,
  ChefHat,
  ShoppingBag,
  AlertTriangle,
  Sparkles,
  ExternalLink,
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
}

export const FavoriteRecipesSection: React.FC<FavoriteRecipesSectionProps> = ({
  favorites,
  onDeleteFavorite,
  onStartCooking,
  onAddShoppingItem,
}) => {
  return (
    <section className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200/90 shadow-sm transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-amber-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-black tracking-wide flex items-center gap-1.5 shadow-sm">
              <Star className="w-3.5 h-3.5 fill-white" />
              나의 즐겨찾기 레시피
            </span>
            <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md font-bold border border-orange-200/70">
              🔥 Firebase 영구 보관
            </span>
            <span className="text-xs font-semibold text-slate-500">
              총 {favorites.length}개 보관 중
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-2">
            다시 보고 싶은 나만의 셰프 레시피 모음
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            마음에 들어 보관해 둔 레시피는 냉장고 상태와 무관하게 언제든 요리 가이드를 실행할 수 있습니다.
          </p>
        </div>
      </div>

      {/* Grid of Saved Favorite Recipes */}
      {favorites.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-amber-200/80 bg-amber-50/30">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <Star className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-slate-800 mb-1">
            아직 저장된 즐겨찾기 레시피가 없습니다
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            추천된 레시피 카드 상단의 <span className="font-bold text-amber-700">[⭐ 즐겨찾기 저장]</span> 버튼을 누르면 이 곳에 안전하게 보관되어 언제든 다시 조리할 수 있습니다.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {favorites.map((recipe) => {
            const isUrgent = recipe.recipeType === 'urgent';
            const isAlternative = recipe.recipeType === 'alternative';

            return (
              <div
                key={recipe.id}
                className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-5 flex flex-col justify-between hover:shadow-md transition-all hover:border-amber-300"
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
                      onClick={() => onDeleteFavorite(recipe.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-white transition-all cursor-pointer"
                      title="즐겨찾기에서 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 mb-3 line-clamp-2">
                    {recipe.title}
                  </h4>

                  {/* Rescued Ingredients if any */}
                  {recipe.usedExpiringIngredients && recipe.usedExpiringIngredients.length > 0 && (
                    <div className="mb-3">
                      <span className="text-[10px] font-bold text-rose-700 flex items-center gap-1 mb-1">
                        <AlertTriangle className="w-3 h-3 text-rose-500" /> 핵심 구출 재료:
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
                      <ChefHat className="w-3 h-3 text-amber-600" /> 필요 재료 ({recipe.ingredients.length}개):
                    </span>
                    <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed font-medium">
                      {recipe.ingredients.join(', ')}
                    </p>
                  </div>

                  {/* Missing ingredients with Coupang search links if expansion recipe */}
                  {recipe.missingIngredientsToBuy && recipe.missingIngredientsToBuy.length > 0 && (
                    <div className="mb-3 pt-2 border-t border-slate-200/60">
                      <span className="text-[10px] font-bold text-indigo-700 flex items-center gap-1 mb-1.5">
                        <ShoppingBag className="w-3 h-3 text-indigo-600" /> 추가 구매 재료 (쿠팡 바로가기):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {recipe.missingIngredientsToBuy.map((missing, i) => (
                          <div key={i} className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-[10px]">
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

                {/* Footer Action: Start Cooking */}
                <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {recipe.steps.length}단계 레시피
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      onStartCooking({
                        title: recipe.title,
                        steps: recipe.steps,
                        ingredients: recipe.ingredients,
                      })
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-2xs transition-all hover:scale-105 cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>요리 가이드</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
