import React, { useState, useRef } from 'react';
import {
  FileText,
  Camera,
  Upload,
  Sparkles,
  X,
  Plus,
  RotateCcw,
  AlertTriangle,
  Receipt,
  Refrigerator,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { InputMode, ParsedIngredient, IngredientStatus, ItemType, DateManageType } from '../types/fridge';
import { calculateDDay, calculateStorageDay } from '../utils/recipeLogic';

interface InputSectionProps {
  onDirectAddIngredient: (item: Omit<ParsedIngredient, 'id'>) => Promise<void>;
  onAnalyzeExtract: (text: string, imageBase64: string | null) => Promise<void>;
  isLoading: boolean;
}

export const InputSection: React.FC<InputSectionProps> = ({
  onDirectAddIngredient,
  onAnalyzeExtract,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState<'form' | 'ai'>('form');

  // Direct Form State
  const [formName, setFormName] = useState('');
  const [formDateManageType, setFormDateManageType] = useState<DateManageType>('expiry');
  const [formExpiry, setFormExpiry] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [formRegisteredDate, setFormRegisteredDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [formQuantity, setFormQuantity] = useState('1개');
  const [formItemType, setFormItemType] = useState<ItemType>('ingredient');
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);

  // AI Scan State
  const [aiMode, setAiMode] = useState<InputMode>('text');
  const [aiText, setAiText] = useState('');
  const [aiImageBase64, setAiImageBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  // Auto calculated freshness for direct form
  const formDDay = calculateDDay(formExpiry);
  const formStorageDay = calculateStorageDay(formRegisteredDate, undefined, formItemType);

  // Handle Form Submission
  const handleDirectFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setIsSubmittingForm(true);
    setFormSuccessMessage(null);

    try {
      const isRegistered = formDateManageType === 'registered';
      const status = isRegistered ? formStorageDay.status : formDDay.status;

      await onDirectAddIngredient({
        name: formName.trim(),
        expiryDate: isRegistered ? formRegisteredDate.trim() : (formExpiry.trim() || '정보 없음'),
        dateManageType: formDateManageType,
        registeredDate: isRegistered ? formRegisteredDate.trim() : undefined,
        quantity: formQuantity.trim() || '1개',
        itemType: formItemType,
        status,
      });

      const typeLabel = formItemType === 'side_dish' ? '반찬' : '식재료';
      const dateLabel = isRegistered ? `등록일 ${formRegisteredDate}` : `유통기한 ${formExpiry}`;
      setFormSuccessMessage(`'${formName.trim()}' (${typeLabel} · ${dateLabel}) 등록 완료!`);
      setFormName('');
      setTimeout(() => setFormSuccessMessage(null), 2500);
    } catch (e) {
      console.error('Failed to add ingredient:', e);
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError('이미지 파일(JPG, PNG, WebP 등)만 업로드할 수 있습니다.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setAiImageBase64(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClearAiInput = () => {
    setAiText('');
    setAiImageBase64(null);
  };

  return (
    <section id="input-section" className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/90 transition-all scroll-mt-24">
      {/* Top Header & Main Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/60 inline-block mb-1">
            STEP 1 • 식재료 등록
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            냉장고 식재료를 등록해보세요
          </h2>
        </div>

        {/* Tab Selector: Direct Form vs AI Scan */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200/70 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'form'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>양식으로 직접 입력</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>AI 다중 메모/사진 스캔</span>
          </button>
        </div>
      </div>

      {/* MODE 1: Direct Form Input */}
      {activeTab === 'form' && (
        <div className="space-y-4 animate-fadeIn">

          {/* Form Success Toast */}
          {formSuccessMessage && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{formSuccessMessage}</span>
            </div>
          )}

          {/* Direct Input Form */}
          <form onSubmit={handleDirectFormSubmit} className="space-y-4 pt-2">
            {/* Dual Type Selectors: Category (식재료/반찬) & Date Management Mode (유통기한/등록일) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/90">
              {/* Category Type Selector: 식재료 vs 반찬 */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 shrink-0">품목 구분:</span>
                <div className="inline-flex p-1 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => {
                      setFormItemType('ingredient');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      formItemType === 'ingredient'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>🥬 요리 식재료</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormItemType('side_dish');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      formItemType === 'side_dish'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>🍱 보관 반찬</span>
                  </button>
                </div>
              </div>

              {/* Date Management Mode: 유통기한 기준 vs 등록일 기준 */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 shrink-0">관리 방식:</span>
                <div className="inline-flex p-1 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setFormDateManageType('expiry')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      formDateManageType === 'expiry'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>유통기한 기준</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormDateManageType('registered')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      formDateManageType === 'registered'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>등록일(보관일) 기준</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 w-full">
              {/* Ingredient Name */}
              <div className="min-w-0 w-full sm:col-span-2 lg:col-span-1">
                <label className="text-xs font-bold text-slate-700 mb-1.5 block truncate">
                  {formItemType === 'side_dish' ? '반찬 품목명' : '식재료 품목명'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={formItemType === 'side_dish' ? '예: 배추김치, 멸치볶음, 진미채' : '예: 찌개용 두부, 대파, 삼겹살'}
                  className="w-full min-w-0 max-w-full box-border px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                  required
                />
              </div>

              {/* Quantity */}
              <div className="min-w-0 w-full">
                <label className="text-xs font-bold text-slate-700 mb-1.5 block truncate">
                  수량 (단위 자유)
                </label>
                <input
                  type="text"
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(e.target.value)}
                  placeholder="예: 1모, 300g, 2개, 반봉지"
                  className="w-full min-w-0 max-w-full box-border px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>

              {/* Date Input: Expiry Date vs Registration Date */}
              {formDateManageType === 'expiry' ? (
                <div className="min-w-0 w-full">
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1 min-w-0">
                    <label className="text-xs font-bold text-slate-700 truncate">
                      유통기한 (소비기한) <span className="text-rose-500">*</span>
                    </label>
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded shrink-0 ${
                        formDDay.status === 'expired'
                          ? 'bg-rose-100 text-rose-700'
                          : formDDay.status === 'warning'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {formDDay.label}
                    </span>
                  </div>
                  <div className="relative min-w-0 w-full">
                    <input
                      type="date"
                      value={formExpiry}
                      onChange={(e) => setFormExpiry(e.target.value)}
                      className="w-full min-w-0 max-w-full box-border px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 cursor-pointer"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 truncate">
                    * 유통기한 만료 전 우선 요리 레시피를 추천해드립니다.
                  </p>
                </div>
              ) : (
                <div className="min-w-0 w-full">
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1 min-w-0">
                    <label className="text-xs font-bold text-slate-700 truncate">
                      등록일 (보관 시작일) <span className="text-blue-500">*</span>
                    </label>
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded shrink-0 ${
                        formStorageDay.status === 'expired'
                          ? 'bg-rose-100 text-rose-700'
                          : formStorageDay.status === 'warning'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {formStorageDay.label}
                    </span>
                  </div>
                  <div className="relative min-w-0 w-full">
                    <input
                      type="date"
                      value={formRegisteredDate}
                      onChange={(e) => setFormRegisteredDate(e.target.value)}
                      className="w-full min-w-0 max-w-full box-border px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 truncate">
                    * 등록일 기준으로 보관 기간(N일차)을 추적합니다.
                  </p>
                </div>
              )}
            </div>

            {/* Direct Submit Button */}
            <div className="pt-2 text-right">
              <button
                type="submit"
                disabled={isSubmittingForm || !formName.trim()}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>{isSubmittingForm ? '냉장고에 등록 중...' : '내 냉장고에 등록하기'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODE 2: AI Multi-item Scan & Extract with Review */}
      {activeTab === 'ai' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Sub Tab: Text vs Photo */}
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => setAiMode('text')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                aiMode === 'text'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              자유 텍스트 메모
            </button>
            <button
              type="button"
              onClick={() => setAiMode('image')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                aiMode === 'image'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              사진/영수증 촬영·업로드
            </button>
          </div>

          {aiMode === 'text' ? (
            <div className="relative min-w-0 w-full">
              <textarea
                rows={4}
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                placeholder="예: 두부 1모 (유통기한 내일 10/27), 팽이버섯 1봉 (유통기한 지남), 삼겹살 300g, 계란 5알, 대파 1단, 양파 2개..."
                className="w-full min-w-0 max-w-full box-border p-4 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none text-slate-800 text-sm leading-relaxed transition-all placeholder:text-slate-400 bg-slate-50/50"
              />
              {aiText && (
                <button
                  type="button"
                  onClick={() => setAiText('')}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-200/80 hover:bg-slate-300 text-slate-600 text-xs flex items-center gap-1 transition-all cursor-pointer"
                  title="텍스트 지우기"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>비우기</span>
                </button>
              )}
            </div>
          ) : (
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                accept="image/*"
                className="hidden"
              />

              {uploadError && (
                <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {!aiImageBase64 ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                    dragActive
                      ? 'border-emerald-500 bg-emerald-50/70'
                      : 'border-slate-300 hover:border-emerald-500 bg-slate-50/60 hover:bg-emerald-50/30'
                  }`}
                >
                  <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800 mb-1">
                    냉장고 사진이나 영수증을 올려주세요
                  </p>
                  <p className="text-xs text-slate-500 mb-3">
                    AI가 사진에서 품목명, 수량, 유통기한을 자동 추출하여 확인 목록을 만들어드립니다.
                  </p>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                  >
                    사진 파일 선택
                  </button>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 p-2">
                  <img
                    src={aiImageBase64}
                    alt="미리보기"
                    className="w-full max-h-64 object-contain mx-auto rounded-xl bg-white"
                  />
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAiImageBase64(null)}
                      className="p-1.5 rounded-lg bg-black/60 hover:bg-rose-600 text-white transition-all cursor-pointer"
                      title="사진 제거"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {aiText && (
                    <div className="mt-2 p-2 bg-slate-800/90 rounded-xl text-white text-xs">
                      <span className="text-emerald-400 font-bold block mb-0.5">첨부 메모:</span>
                      <p>{aiText}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* AI Extract Trigger Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              💡 분석 후 등록 예정 목록이 표시되며, 수정 후 최종 저장을 누르면 등록됩니다.
            </span>

            <button
              type="button"
              disabled={isLoading || (aiMode === 'text' && !aiText.trim()) || (aiMode === 'image' && !aiImageBase64)}
              onClick={() => onAnalyzeExtract(aiText, aiImageBase64)}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>AI 분석 목록 추출 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>AI 분석 후 등록 목록 검토하기</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
