import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { ParsedIngredient, IngredientStatus, DateManageType } from '../types/fridge';
import { calculateDDay, calculateIngredientFreshness } from '../utils/recipeLogic';

interface PendingIngredientsReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingItems: ParsedIngredient[];
  onConfirmSave: (confirmedItems: ParsedIngredient[]) => Promise<void>;
  isSaving: boolean;
}

export const PendingIngredientsReviewModal: React.FC<PendingIngredientsReviewModalProps> = ({
  isOpen,
  onClose,
  pendingItems: initialItems,
  onConfirmSave,
  isSaving,
}) => {
  if (!isOpen) return null;

  const [items, setItems] = useState<ParsedIngredient[]>(initialItems);

  const handleUpdateItem = (index: number, field: keyof ParsedIngredient, value: string) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      if (field === 'expiryDate') {
        const dday = calculateDDay(value);
        item.status = dday.status;
      }

      updated[index] = item;
      return updated;
    });
  };

  const handleDeleteItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAddNewItem = () => {
    setErrorMessage(null);
    const newItem: ParsedIngredient = {
      id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: '',
      expiryDate: '2026-10-30',
      quantity: '1개',
      itemType: 'ingredient',
      status: 'fresh',
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleConfirm = async () => {
    // Filter out items without a name and compute status automatically based on expiryDate
    const validItems = items
      .filter((i) => i.name.trim().length > 0)
      .map((i) => {
        const itemType = (i.itemType || (/김치|볶음|조림|무침|장아찌|젓갈|나물/i.test(i.name) ? 'side_dish' : 'ingredient')) as any;
        const dateManageType = i.dateManageType || (itemType === 'side_dish' ? 'registered' : 'expiry');
        const freshness = calculateIngredientFreshness({ ...i, itemType, dateManageType });
        return {
          ...i,
          name: i.name.trim(),
          itemType,
          dateManageType,
          registeredDate: dateManageType === 'registered' ? i.expiryDate : undefined,
          status: freshness.status,
        };
      });

    if (validItems.length === 0) {
      setErrorMessage('최소 1개 이상의 식재료 품목명을 입력해주세요.');
      return;
    }
    setErrorMessage(null);
    await onConfirmSave(validItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-200 animate-fadeIn flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Sparkles className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-400 tracking-wider uppercase block">
                AI 인식 식재료 검토 단계
              </span>
              <h3 className="text-lg font-bold text-white">
                등록 예정 식재료 목록 확인 및 수정 ({items.length}개)
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Bar */}
        <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-100 text-emerald-900 text-xs font-medium flex items-center justify-between">
          <span>
            💡 품목명, 유통기한 또는 등록일(보관일)을 선택 확인하시고 최종 등록을 눌러주세요.
          </span>
          <button
            type="button"
            onClick={handleAddNewItem}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition-all shrink-0 ml-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>항목 추가</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Scrollable Items Table */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {items.map((item, idx) => {
            const isRegistered = item.dateManageType === 'registered';
            const freshness = calculateIngredientFreshness(item);

            return (
              <div
                key={item.id || idx}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-emerald-300 transition-all flex flex-col sm:flex-row items-start sm:items-center gap-3"
              >
                {/* Index number and Item Type & Date Mode Toggles */}
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-black flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateItem(
                        idx,
                        'itemType',
                        (item.itemType === 'side_dish' ? 'ingredient' : 'side_dish') as any
                      )
                    }
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      item.itemType === 'side_dish'
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    }`}
                    title="클릭하여 식재료/반찬 구분 전환"
                  >
                    {item.itemType === 'side_dish' ? '🍱 반찬' : '🥬 식재료'}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateItem(
                        idx,
                        'dateManageType',
                        (isRegistered ? 'expiry' : 'registered') as any
                      )
                    }
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      isRegistered
                        ? 'bg-blue-100 text-blue-900 border-blue-300'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                    title="클릭하여 유통기한/등록일 관리 방식 전환"
                  >
                    {isRegistered ? '📝 등록일' : '📅 유통기한'}
                  </button>
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0 w-full sm:w-auto">
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5 sm:hidden">
                    품목명
                  </label>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                    placeholder="품목명 (예: 계란, 찌개두부, 멸치볶음)"
                    className="w-full min-w-0 max-w-full box-border px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                {/* Date Input */}
                <div className="w-full sm:w-36 min-w-0">
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5 sm:hidden">
                    {isRegistered ? '등록일(보관시작)' : '유통기한'}
                  </label>
                  <input
                    type="text"
                    value={item.expiryDate}
                    onChange={(e) => handleUpdateItem(idx, 'expiryDate', e.target.value)}
                    placeholder="YYYY-MM-DD"
                    className="w-full min-w-0 max-w-full box-border px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-emerald-500 font-medium"
                  />
                </div>

                {/* Quantity (Free Unit) */}
                <div className="w-full sm:w-28 min-w-0">
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5 sm:hidden">
                    수량 (단위자유)
                  </label>
                  <input
                    type="text"
                    value={item.quantity || '1개'}
                    onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value)}
                    placeholder="예: 5개, 300g"
                    className="w-full min-w-0 max-w-full box-border px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-emerald-500 font-bold font-mono"
                  />
                </div>

                {/* Auto Freshness Status (Read-only, based on Expiry Date or Storage Duration) */}
                <div className="w-full sm:w-28 text-center shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5 sm:hidden">
                    자동 판정
                  </span>
                  <span
                    className={`inline-block px-2 py-1.5 rounded-xl text-[11px] font-black tracking-tight ${
                      freshness.status === 'expired'
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : freshness.status === 'warning'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : isRegistered
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                    title={freshness.subLabel}
                  >
                    {freshness.label}
                  </span>
                </div>

              <button
                type="button"
                onClick={() => handleDeleteItem(idx)}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer self-end sm:self-auto"
                title="삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}

          {items.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-xs">
              검토할 식재료가 없습니다. 상단 '항목 추가'를 눌러 직접 추가해보세요.
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            확인 버튼을 누르면 위 {items.length}개 식재료가 내 냉장고 보관함에 즉시 등록됩니다.
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs cursor-pointer"
            >
              취소
            </button>

            <button
              type="button"
              disabled={isSaving || items.length === 0}
              onClick={handleConfirm}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md transition-all hover:scale-[1.01] cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? '등록 처리 중...' : '내 냉장고에 등록하기'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
