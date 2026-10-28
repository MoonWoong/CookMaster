import React from 'react';
import {
  Flame,
  Sparkles,
  ShoppingBag,
  Clock,
  ChefHat,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowRight,
  ExternalLink,
  PlusCircle,
  Star,
} from 'lucide-react';
import {
  AlternativeRecipe,
  ExpansionRecipe,
  UrgentRecipe,
  FavoriteRecipe,
} from '../types/fridge';
import { generateCoupangSearchUrl } from '../utils/recipeLogic';

interface RecipeDisplayProps {
  urgentRecipe: UrgentRecipe;
  alternativeRecipe: AlternativeRecipe;
  expansionRecipes: ExpansionRecipe[];
  onStartCooking: (recipe: { title: string; steps: string[]; ingredients: string[] }) => void;
  onAddShoppingItem: (item: string, reason: string) => void;
  favoriteRecipeTitles?: Set<string>;
  onToggleFavorite?: (recipe: Omit<FavoriteRecipe, 'id' | 'userId' | 'createdAt'>) => void;
}

export const RecipeDisplay: React.FC<RecipeDisplayProps> = ({
  urgentRecipe,
  alternativeRecipe,
  expansionRecipes,
  onStartCooking,
  onAddShoppingItem,
  favoriteRecipeTitles = new Set(),
  onToggleFavorite,
}) => {
  return (
    <div className="space-y-8">
      {/* 1. URGENT RESCUE RECIPE (유통기한 임박 레시피 - 1개) */}
      <section className="bg-gradient-to-br from-rose-500/10 via-amber-500/5 to-white rounded-3xl p-6 sm:p-8 border-2 border-rose-300 shadow-md relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-rose-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-black tracking-wide flex items-center gap-1.5 shadow-sm">
              <Flame className="w-4 h-4 text-amber-300 animate-bounce" />
              1. 골든타임 유통기한 구출 레시피
            </span>
            <span className="text-xs font-semibold text-rose-800 bg-rose-100/90 px-2.5 py-0.5 rounded-md border border-rose-200">
              최우선 추천
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onToggleFavorite && (
              <button
                type="button"
                onClick={() =>
                  onToggleFavorite({
                    title: urgentRecipe.title,
                    recipeType: 'urgent',
                    ingredients: urgentRecipe.ingredients,
                    steps: urgentRecipe.steps,
                    usedExpiringIngredients: urgentRecipe.usedExpiringIngredients,
                    chefTip: urgentRecipe.chefTip,
                    difficulty: urgentRecipe.difficulty,
                  })
                }
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer ${
                  favoriteRecipeTitles.has(urgentRecipe.title)
                    ? 'bg-amber-400 text-amber-950 hover:bg-amber-500'
                    : 'bg-white hover:bg-rose-50 text-slate-700 border border-slate-200 hover:border-amber-300'
                }`}
                title={favoriteRecipeTitles.has(urgentRecipe.title) ? '즐겨찾기에서 제거' : '나의 즐겨찾기에 저장'}
              >
                <Star
                  className={`w-4 h-4 ${
                    favoriteRecipeTitles.has(urgentRecipe.title)
                      ? 'fill-amber-950 text-amber-950'
                      : 'text-amber-500'
                  }`}
                />
                <span>
                  {favoriteRecipeTitles.has(urgentRecipe.title) ? '즐겨찾기 보관됨' : '즐겨찾기 저장'}
                </span>
              </button>
            )}

            <button
              type="button"
              aria-label="유통기한 구출 요리 단계별 가이드 시작"
              onClick={() =>
                onStartCooking({
                  title: urgentRecipe.title,
                  steps: urgentRecipe.steps,
                  ingredients: urgentRecipe.ingredients,
                })
              }
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-extrabold shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>단계별 요리 가이드 시작</span>
            </button>
          </div>
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-3 tracking-tight">
          {urgentRecipe.title}
        </h3>

        {/* Used Expiring Ingredients Badges */}
        {urgentRecipe.usedExpiringIngredients && urgentRecipe.usedExpiringIngredients.length > 0 && (
          <div className="mb-5 p-3.5 rounded-2xl bg-white/90 border border-rose-200 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span>구출 성공한 유통기한 임박 식재료:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {urgentRecipe.usedExpiringIngredients.map((item, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 text-xs font-bold border border-rose-300/80 inline-flex items-center gap-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Ingredients & Steps Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Ingredients list */}
          <div className="lg:col-span-5 bg-white/80 rounded-2xl p-4 sm:p-5 border border-slate-200">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <ChefHat className="w-4 h-4 text-rose-500" /> 필요 식재료 및 분량
            </h4>
            <ul className="space-y-2">
              {urgentRecipe.ingredients.map((ing, idx) => (
                <li
                  key={idx}
                  className="text-xs sm:text-sm text-slate-700 font-medium flex items-start gap-2 bg-slate-50/80 p-2 rounded-xl"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                  <span>{ing}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Steps list */}
          <div className="lg:col-span-7 bg-white/80 rounded-2xl p-4 sm:p-5 border border-slate-200">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" /> 조리 순서 (셰프 레시피)
            </h4>
            <div className="space-y-3">
              {urgentRecipe.steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
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
      </section>

      {/* 2. ALTERNATIVE RECIPE (남은 식재료 색다른 변신 레시피 - 1개) */}
      <section className="bg-gradient-to-br from-amber-500/10 via-emerald-500/5 to-white rounded-3xl p-6 sm:p-8 border border-amber-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-black tracking-wide flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-4 h-4 text-amber-100" />
              2. 남은 식재료 색다른 재발견 레시피
            </span>
            <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-md border border-amber-200">
              맛있는 변신
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onToggleFavorite && (
              <button
                type="button"
                onClick={() =>
                  onToggleFavorite({
                    title: alternativeRecipe.title,
                    recipeType: 'alternative',
                    ingredients: alternativeRecipe.ingredients,
                    steps: alternativeRecipe.steps,
                    chefTip: alternativeRecipe.chefTip,
                    difficulty: alternativeRecipe.difficulty,
                  })
                }
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer ${
                  favoriteRecipeTitles.has(alternativeRecipe.title)
                    ? 'bg-amber-400 text-amber-950 hover:bg-amber-500'
                    : 'bg-white hover:bg-amber-50 text-slate-700 border border-slate-200 hover:border-amber-300'
                }`}
                title={favoriteRecipeTitles.has(alternativeRecipe.title) ? '즐겨찾기에서 제거' : '나의 즐겨찾기에 저장'}
              >
                <Star
                  className={`w-4 h-4 ${
                    favoriteRecipeTitles.has(alternativeRecipe.title)
                      ? 'fill-amber-950 text-amber-950'
                      : 'text-amber-500'
                  }`}
                />
                <span>
                  {favoriteRecipeTitles.has(alternativeRecipe.title) ? '즐겨찾기 보관됨' : '즐겨찾기 저장'}
                </span>
              </button>
            )}

            <button
              type="button"
              aria-label="색다른 변신 요리 단계별 가이드 시작"
              onClick={() =>
                onStartCooking({
                  title: alternativeRecipe.title,
                  steps: alternativeRecipe.steps,
                  ingredients: alternativeRecipe.ingredients,
                })
              }
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-extrabold shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>단계별 요리 가이드 시작</span>
            </button>
          </div>
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-4 tracking-tight">
          {alternativeRecipe.title}
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white/80 rounded-2xl p-4 sm:p-5 border border-slate-200">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <ChefHat className="w-4 h-4 text-amber-500" /> 사용 재료 리스트
            </h4>
            <ul className="space-y-2">
              {alternativeRecipe.ingredients.map((ing, idx) => (
                <li
                  key={idx}
                  className="text-xs sm:text-sm text-slate-700 font-medium flex items-start gap-2 bg-slate-50/80 p-2 rounded-xl"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <span>{ing}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-7 bg-white/80 rounded-2xl p-4 sm:p-5 border border-slate-200">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" /> 조리 순서
            </h4>
            <div className="space-y-3">
              {alternativeRecipe.steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
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
      </section>

      {/* 3. EXPANSION RECIPES (확장 레시피 - 2~3개) */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-black tracking-wide flex items-center gap-1.5 shadow-sm">
                <ShoppingBag className="w-4 h-4 text-indigo-200" />
                3. 똑똑한 확장 레시피 ({expansionRecipes.length}가지)
              </span>
              <span className="text-xs font-semibold text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200">
                1~2개 추가 구매로 완성!
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-2">
              가진 재료에 딱 몇 가지만 더해 풍성한 식탁 차리기
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {expansionRecipes.map((exp, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 flex flex-col justify-between hover:shadow-md transition-all hover:border-indigo-300"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-indigo-600">
                      메뉴 {idx + 1}
                    </span>
                    {onToggleFavorite && (
                      <button
                        type="button"
                        onClick={() =>
                          onToggleFavorite({
                            title: exp.title,
                            recipeType: 'expansion',
                            ingredients: [
                              ...exp.currentIngredientsUsed,
                              ...exp.missingIngredientsToBuy,
                            ],
                            steps: [exp.briefSteps],
                            usedExpiringIngredients: exp.currentIngredientsUsed,
                            missingIngredientsToBuy: exp.missingIngredientsToBuy,
                            briefSteps: exp.briefSteps,
                          })
                        }
                        className={`p-1 rounded-lg transition-all cursor-pointer ${
                          favoriteRecipeTitles.has(exp.title)
                            ? 'bg-amber-100 text-amber-900'
                            : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'
                        }`}
                        title={
                          favoriteRecipeTitles.has(exp.title)
                            ? '즐겨찾기에서 제거'
                            : '즐겨찾기 저장'
                        }
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            favoriteRecipeTitles.has(exp.title)
                              ? 'fill-amber-400 text-amber-500'
                              : ''
                          }`}
                        />
                      </button>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">간편 조리</span>
                </div>
                <h4 className="text-base font-bold text-slate-900 mb-3">
                  {exp.title}
                </h4>

                {/* Current ingredients used */}
                <div className="mb-3">
                  <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 가진 재료 활용:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {exp.currentIngredientsUsed.map((item, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-medium"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Missing ingredients to buy with Add to Cart button only */}
                <div className="mb-3">
                  <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1 mb-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-amber-600" /> 추가 구매 필요 재료:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {exp.missingIngredientsToBuy.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 bg-amber-50/90 border border-amber-200/90 rounded-xl px-2.5 py-1 text-xs shadow-2xs"
                      >
                        <span className="font-bold text-amber-950 text-xs">{item}</span>

                        {/* Add to general cart button only */}
                        <button
                          type="button"
                          onClick={() => onAddShoppingItem(item, `확장 메뉴: ${exp.title}용 재료`)}
                          className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] inline-flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                          title="장바구니에 담기"
                        >
                          <PlusCircle className="w-3 h-3 text-white" />
                          <span>장바구니 담기</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Brief steps */}
                <div className="p-3 rounded-xl bg-white border border-slate-200/80 text-xs text-slate-700 leading-relaxed font-medium">
                  <p>{exp.briefSteps}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
