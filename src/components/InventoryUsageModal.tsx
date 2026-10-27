import React, { useState } from 'react';
import { X, Minus, Plus, ShoppingCart, Trash2, Check, AlertTriangle } from 'lucide-react';
import { ParsedIngredient } from '../types/fridge';
import { calculateRemainingQuantity } from '../utils/recipeLogic';

interface InventoryUsageModalProps {
  ingredient: ParsedIngredient | null;
  onClose: () => void;
  onUpdateQuantity: (id: string, newQuantity: string) => Promise<void>;
  onDeleteIngredient: (id: string) => Promise<void>;
  onAddShoppingItem: (item: string, reason: string) => void;
}

export const InventoryUsageModal: React.FC<InventoryUsageModalProps> = ({
  ingredient,
  onClose,
  onUpdateQuantity,
  onDeleteIngredient,
  onAddShoppingItem,
}) => {
  if (!ingredient) return null;

  const currentQty = ingredient.quantity || '1개';
  const [usedAmount, setUsedAmount] = useState<number>(1);
  const [customRemaining, setCustomRemaining] = useState<string>('');
  const [useCustomInput, setUseCustomInput] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [removeAndShopIfDepleted, setRemoveAndShopIfDepleted] = useState<boolean>(true);

  // Auto calculate remaining
  const calcResult = calculateRemainingQuantity(currentQty, usedAmount);
  const isDepletedNow = useCustomInput
    ? (!customRemaining || customRemaining.trim() === '0' || customRemaining.trim().startsWith('0'))
    : calcResult.isDepleted;

  const handleApply = async () => {
    setIsSubmitting(true);
    try {
      const finalRemaining = useCustomInput
        ? customRemaining.trim()
        : calcResult.remaining;

      if (isDepletedNow) {
        if (removeAndShopIfDepleted) {
          onAddShoppingItem(ingredient.name, '식재료 전량 소진으로 쿠팡 재구매 필요');
          await onDeleteIngredient(ingredient.id);
        } else {
          await onUpdateQuantity(ingredient.id, '0개 (소진됨)');
        }
      } else {
        await onUpdateQuantity(ingredient.id, finalRemaining);
      }
      onClose();
    } catch (e) {
      console.error('Failed to update inventory:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 animate-fadeIn">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-400 tracking-wider uppercase block">
              식재료 재고 차감 / 사용 관리
            </span>
            <h3 className="text-base font-bold text-white truncate max-w-[240px]">
              {ingredient.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Current Stock Display */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-bold">현재 보관 재고:</span>
            <span className="text-base font-black text-slate-900 font-mono">
              {currentQty}
            </span>
          </div>

          {!useCustomInput ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  사용한 수량을 설정하세요:
                </label>
                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => setUsedAmount((prev) => Math.max(1, prev - 1))}
                    className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <div className="text-center">
                    <span className="text-2xl font-black text-emerald-700 font-mono">
                      {usedAmount}
                    </span>
                    <span className="text-xs text-slate-400 block font-medium">사용</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setUsedAmount((prev) => prev + 1)}
                    className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Remaining calculation preview */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-xs text-emerald-800 font-bold block mb-0.5">
                  차감 후 남은 재고 예정
                </span>
                <span className="text-xl font-black text-emerald-900 font-mono">
                  {calcResult.remaining}
                </span>
                {calcResult.isDepleted && (
                  <span className="text-[11px] text-rose-600 font-bold block mt-1">
                    ⚠️ 재고가 전량 소진됩니다!
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                남은 재고를 직접 입력하세요 (단위 자유):
              </label>
              <input
                type="text"
                value={customRemaining}
                onChange={(e) => setCustomRemaining(e.target.value)}
                placeholder="예: 3개, 150g, 반모, 0"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Toggle between stepper and freeform */}
          <div className="text-right">
            <button
              type="button"
              onClick={() => setUseCustomInput(!useCustomInput)}
              className="text-[11px] text-emerald-700 hover:underline font-medium cursor-pointer"
            >
              {useCustomInput ? '← 기본 수량 조절기로 변경' : '수량/단위 직접 입력하기 →'}
            </button>
          </div>

          {/* Depleted Actions Option */}
          {isDepletedNow && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <label className="flex items-start gap-2 cursor-pointer font-bold select-none">
                <input
                  type="checkbox"
                  checked={removeAndShopIfDepleted}
                  onChange={(e) => setRemoveAndShopIfDepleted(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>
                  냉장고에서 재료를 비우고 쿠팡 장보기 목록에 자동 추가하기
                </span>
              </label>
              <p className="text-[11px] text-amber-700 font-normal mt-1 pl-5">
                {removeAndShopIfDepleted
                  ? '적용 시 재료가 삭제되며 장보기 탭에 담깁니다.'
                  : '체크 해제 시 0개(소진됨) 상태로 목록에 남겨둡니다.'}
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleApply}
              className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>재고 차감 적용</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-all cursor-pointer"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
