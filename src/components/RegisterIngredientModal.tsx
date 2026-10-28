import React, { useState, useEffect } from 'react';
import { X, Plus, Calendar, Package, Sparkles, CheckCircle2 } from 'lucide-react';
import { calculateDDay } from '../utils/recipeLogic';

interface RegisterIngredientModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName?: string;
  initialQuantity?: string;
  sourceNote?: string;
  onConfirm: (data: { name: string; expiryDate: string; quantity: string }) => Promise<void>;
  isSaving?: boolean;
}

export const RegisterIngredientModal: React.FC<RegisterIngredientModalProps> = ({
  isOpen,
  onClose,
  initialName = '',
  initialQuantity = '1개',
  sourceNote,
  onConfirm,
  isSaving = false,
}) => {
  const [name, setName] = useState('');
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [quantity, setQuantity] = useState('1개');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setQuantity(initialQuantity || '1개');
      const d = new Date();
      d.setDate(d.getDate() + 3);
      setExpiryDate(d.toISOString().slice(0, 10));
      setErrorMsg(null);
    }
  }, [isOpen, initialName, initialQuantity]);

  if (!isOpen) return null;

  const dday = calculateDDay(expiryDate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('품목명을 입력해주세요.');
      return;
    }
    setErrorMsg(null);
    try {
      await onConfirm({
        name: name.trim(),
        expiryDate: expiryDate || '정보 없음',
        quantity: quantity.trim() || '1개',
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || '식재료 등록 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 animate-fadeIn">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Sparkles className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-400 tracking-wider uppercase block">
                식재료 등록 팝업
              </span>
              <h3 className="text-base font-bold text-white">
                냉장고에 식재료 등록하기
              </h3>
            </div>
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

        {sourceNote && (
          <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-100 text-emerald-900 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{sourceNote}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {/* Item Name */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              품목명 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 찌개용 두부, 신선란, 삼겹살"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold outline-none focus:border-emerald-500 focus:bg-white"
              required
              autoFocus
            />
          </div>

          {/* Expiry Date */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                유통기한 (YYYY-MM-DD)
              </label>
              {/* Dynamic status preview based on remaining expiry date */}
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                  dday.status === 'expired'
                    ? 'bg-rose-100 text-rose-700 border border-rose-200'
                    : dday.status === 'warning'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                자동 판정: {dday.label}
              </span>
            </div>
            <div className="relative">
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium outline-none focus:border-emerald-500 focus:bg-white"
                required
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              * 신선도 상태는 유통기한 날짜를 기준으로 자동 판별되어 냉장고에 노출됩니다.
            </p>
          </div>

          {/* Quantity (Free Unit) */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              수량 (단위자유) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="예: 1개, 5알, 300g, 1모, 500ml"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold font-mono outline-none focus:border-emerald-500 focus:bg-white"
              required
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 pt-3">
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{isSaving ? '보관함에 저장 중...' : '냉장고에 등록하기'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-all cursor-pointer"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
