import React, { useState } from 'react';
import {
  ShoppingCart,
  ExternalLink,
  Check,
  Copy,
  Plus,
  Trash2,
  Refrigerator,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { ShoppingListItem } from '../types/fridge';
import { generateCoupangSearchUrl } from '../utils/recipeLogic';

interface ShoppingListSectionProps {
  items: ShoppingListItem[];
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onAddItem: (item: string, reason: string) => void;
  onRegisterToFridge: (cartItem: ShoppingListItem) => void;
}

const COMMON_GROCERY_TAGS = [
  { name: '신선 대란 10구', reason: '달걀 요리 필수' },
  { name: '서울우유 1L', reason: '아침 및 베이킹용' },
  { name: '국산 찌개용 두부 300g', reason: '된장/김치찌개용' },
  { name: '흙대파 1단', reason: '기본 국/볶음 향신채' },
  { name: '햇양파 1.5kg', reason: '기본 요리 베이스' },
  { name: '한돈 삼겹살 500g', reason: '구이 및 찌개용' },
  { name: '무농약 콩나물 300g', reason: '국/무침용' },
];

export const ShoppingListSection: React.FC<ShoppingListSectionProps> = ({
  items,
  onToggleItem,
  onDeleteItem,
  onAddItem,
  onRegisterToFridge,
}) => {
  const [copied, setCopied] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemReason, setNewItemReason] = useState('');

  const completedCount = items.filter((i) => i.checked).length;

  const handleCopyAll = () => {
    if (items.length === 0) return;
    const textLines = items.map(
      (it) => `[${it.checked ? 'X' : ' '}] ${it.item}${it.reason ? ` (${it.reason})` : ''}`
    );
    const fullText = `🛒 [냉장고를 부탁해] 장보기 목록\n${textLines.join('\n')}`;

    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    onAddItem(newItemName.trim(), newItemReason.trim() || '필요 식재료 보충');
    setNewItemName('');
    setNewItemReason('');
  };

  const handleAddPreset = (tag: typeof COMMON_GROCERY_TAGS[0]) => {
    onAddItem(tag.name, tag.reason);
  };

  return (
    <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-black tracking-wide flex items-center gap-1.5 shadow-sm">
              <ShoppingCart className="w-4 h-4 text-emerald-200" />
              일반 장바구니
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {completedCount} / {items.length}개 구매 완료
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-2">
            구매하고 싶은 장바구니 목록
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            구매할 식재료를 등록하고 쿠팡에서 바로 검색하거나, 구매 후 냉장고 식재료로 즉시 등록해보세요.
          </p>
        </div>

        {items.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleCopyAll}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              title="카카오톡이나 메모장에 붙여넣을 수 있게 복사"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">복사 완료!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>장보기 목록 복사</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Direct Add to Cart Form */}
      <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90">
        <span className="text-xs font-bold text-slate-800 block mb-2 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5 text-emerald-600" /> 구매하고 싶은 물품 직접 등록
        </span>

        <form onSubmit={handleAddSubmit} className="flex flex-col sm:flex-row gap-2.5 items-end">
          <div className="flex-1 w-full">
            <label className="text-[11px] font-bold text-slate-600 mb-1 block">
              구매 품목명 (쿠팡 검색 최적화) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="예: 신선 대란 10구, 찌개용 두부, 햇양파 1망..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
              required
            />
          </div>

          <div className="w-full sm:w-64">
            <label className="text-[11px] font-bold text-slate-600 mb-1 block">
              수량 / 메모 (선택)
            </label>
            <input
              type="text"
              value={newItemReason}
              onChange={(e) => setNewItemReason(e.target.value)}
              placeholder="예: 2팩, 된장찌개용, 세일 상품"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={!newItemName.trim()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>장바구니 담기</span>
          </button>
        </form>

        {/* Quick Add Pills */}
        <div className="mt-3 pt-3 border-t border-slate-200/70">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 mr-1">
              원클릭 담기:
            </span>
            {COMMON_GROCERY_TAGS.map((tag, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAddPreset(tag)}
                className="text-[11px] px-2 py-1 rounded-lg bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 font-medium transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
              >
                <Plus className="w-2.5 h-2.5 text-emerald-600" />
                <span>{tag.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
            <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700 mb-1">
              장바구니에 담긴 물품이 없습니다
            </p>
            <p className="text-xs text-slate-400">
              위 입력창이나 추천 메뉴에서 필요한 식재료를 장바구니에 담아보세요.
            </p>
          </div>
        ) : (
          items.map((item) => {
            const coupangUrl = item.coupangUrl || generateCoupangSearchUrl(item.item);

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  item.checked
                    ? 'bg-slate-50/80 border-slate-200 opacity-70'
                    : 'bg-white border-slate-200/90 hover:border-emerald-300 hover:shadow-xs'
                }`}
              >
                {/* Left: Checkbox & Item Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    id={`shop-chk-${item.id}`}
                    checked={!!item.checked}
                    onChange={() => onToggleItem(item.id)}
                    className="w-5 h-5 rounded-md text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer shrink-0"
                  />

                  <label
                    htmlFor={`shop-chk-${item.id}`}
                    className="cursor-pointer select-none min-w-0"
                  >
                    <span
                      className={`text-sm font-bold block truncate ${
                        item.checked
                          ? 'line-through text-slate-400'
                          : 'text-slate-900'
                      }`}
                    >
                      {item.item}
                    </span>
                    {item.reason && (
                      <span className="text-xs text-slate-500 block mt-0.5 truncate">
                        💡 {item.reason}
                      </span>
                    )}
                  </label>
                </div>

                {/* Right: Actions (Coupang Link + Register to Fridge Button + Delete) */}
                <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
                  {/* Coupang Direct Link */}
                  <a
                    href={coupangUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs hover:scale-105"
                    title={`쿠팡에서 '${item.item}' 최저가 바로 검색`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span>쿠팡 최저가 검색</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {/* Register to Fridge Button (Opens identical registration modal) */}
                  <button
                    type="button"
                    onClick={() => onRegisterToFridge(item)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer hover:scale-105"
                    title="구매 완료 후 냉장고 식재료로 등록"
                  >
                    <Refrigerator className="w-3.5 h-3.5" />
                    <span>식재료로 넣기</span>
                  </button>

                  {/* Delete Item Button */}
                  <button
                    type="button"
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-all cursor-pointer"
                    title="장바구니에서 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
