import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sparkles,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import { NotificationSettings } from '../types/notification';
import { ParsedIngredient } from '../types/fridge';
import { calculateDDay } from '../utils/recipeLogic';
import {
  requestBrowserNotificationPermission,
  sendBrowserPushNotification,
  persistNotificationSettings,
} from '../lib/notificationService';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: NotificationSettings;
  onUpdateSettings: (newSettings: NotificationSettings) => void;
  ingredients: ParsedIngredient[];
}

const PRESET_TIMES = [
  { label: '오전 09:00 (아침 추천)', value: '09:00' },
  { label: '오전 11:30 (점심 준비)', value: '11:30' },
  { label: '오후 06:00 (퇴근/저녁)', value: '18:00' },
  { label: '오후 08:30 (야식/정리)', value: '20:30' },
];

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  ingredients,
}) => {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [time, setTime] = useState(settings.time || '09:00');
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [testSentMessage, setTestSentMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
    setEnabled(settings.enabled);
    setTime(settings.time || '09:00');
  }, [isOpen, settings]);

  if (!isOpen) return null;

  // Imminent / expired ingredients in user's fridge
  const urgentIngredients = ingredients.filter((i) => {
    const dday = calculateDDay(i.expiryDate);
    return dday.status === 'warning' || dday.status === 'expired';
  });

  const handleRequestPermission = async () => {
    const perm = await requestBrowserNotificationPermission();
    setPermission(perm);
    if (perm === 'granted') {
      setEnabled(true);
    }
  };

  const handleSendTestNotification = async () => {
    setTestSentMessage(null);
    let currentPerm = permission;
    if (currentPerm !== 'granted') {
      currentPerm = await requestBrowserNotificationPermission();
      setPermission(currentPerm);
    }

    if (currentPerm !== 'granted') {
      setTestSentMessage('브라우저 알림 권한이 허용되지 않아 알림을 보낼 수 없습니다.');
      return;
    }

    const previewList = urgentIngredients.length > 0
      ? urgentIngredients.slice(0, 3).map((i) => i.name).join(', ')
      : '두부, 대파, 콩나물';

    const count = urgentIngredients.length > 0 ? urgentIngredients.length : 3;

    const success = sendBrowserPushNotification(
      '🚨 [냉장고를 부탁해] 유통기한 임박 식재료 알림!',
      {
        body: `'${previewList}' 등 ${count}개 재료의 유통기한이 임박했습니다. 오늘 AI 요리로 구출해보세요!`,
      }
    );

    if (success) {
      setTestSentMessage('🔔 테스트 푸시 알림이 발송되었습니다! (화면 우측 상단/시스템 알림창 확인)');
    } else {
      setTestSentMessage('알림 발송에 실패했습니다. 브라우저 설정을 확인해주세요.');
    }

    setTimeout(() => {
      setTestSentMessage(null);
    }, 4500);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated: NotificationSettings = {
        ...settings,
        enabled,
        time,
      };
      await persistNotificationSettings(updated);
      onUpdateSettings(updated);
      onClose();
    } catch (e) {
      console.error('Failed to save notification settings:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 animate-fadeIn">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Bell className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-400 tracking-wider uppercase block">
                스마트 유통기한 알림
              </span>
              <h3 className="text-base sm:text-lg font-black text-white">
                임박 식재료 정기 푸시 알림 설정
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Permission Status Alert */}
          {permission === 'granted' ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold">브라우저 푸시 알림 권한 허용됨</span>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  설정하신 시간에 맞춰 임박한 식재료가 있을 때 알림을 띄워드립니다.
                </p>
              </div>
            </div>
          ) : permission === 'denied' ? (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">브라우저 알림이 차단되어 있습니다</span>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  브라우저 주소창 좌측의 설정(자물쇠) 아이콘을 눌러 알림 권한을 '허용'으로 변경해주세요.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-xs text-amber-950">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>푸시 알림을 받으시려면 브라우저 권한 허용이 필요합니다.</span>
              </div>
              <button
                type="button"
                onClick={handleRequestPermission}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-2xs"
              >
                권한 허용하기
              </button>
            </div>
          )}

          {/* Toggle On/Off */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div>
              <span className="text-xs sm:text-sm font-bold text-slate-800 block">
                유통기한 임박 식재료 매일 알림 받기
              </span>
              <span className="text-[11px] text-slate-500">
                보관 중인 재료 중 유통기한이 지나거나 2일 이내로 남은 품목이 있을 때만 발송됩니다.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                enabled ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Time Picker */}
          <div className={enabled ? 'space-y-3' : 'space-y-3 opacity-50 pointer-events-none'}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                알림 시간 설정 (예: 매일 오전 9시)
              </label>
              <span className="text-xs font-black text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                현재 설정: {time}
              </span>
            </div>

            {/* Quick Preset Buttons */}
            <div className="grid grid-cols-2 gap-2">
              {PRESET_TIMES.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setTime(preset.value)}
                  className={`p-2.5 rounded-xl text-xs font-bold transition-all border text-left cursor-pointer ${
                    time === preset.value
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <span className="block font-mono text-sm">{preset.value}</span>
                  <span className="text-[10px] opacity-90 block">{preset.label}</span>
                </button>
              ))}
            </div>

            {/* Custom Time Input */}
            <div className="pt-1">
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                직접 시간 입력:
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 cursor-pointer"
              />
            </div>
          </div>

          {/* Current Imminent Ingredients Preview */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                현재 알림 대상 임박 재료 ({urgentIngredients.length}개)
              </span>
              <span className="text-[10px] text-slate-400">냉장고 보관 기준</span>
            </div>

            {urgentIngredients.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {urgentIngredients.map((item) => {
                  const dday = calculateDDay(item.expiryDate);
                  return (
                    <span
                      key={item.id}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-semibold inline-flex items-center gap-1 ${
                        dday.status === 'expired'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}
                    >
                      <span>{item.name}</span>
                      <span className="text-[10px] font-mono font-bold">({dday.label})</span>
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-1">
                현재 유통기한이 임박한 식재료가 없습니다. 신선하게 잘 관리되고 있습니다!
              </p>
            )}
          </div>

          {/* Test Notification Action */}
          <div>
            <button
              type="button"
              onClick={handleSendTestNotification}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-200"
            >
              <Send className="w-3.5 h-3.5 text-amber-600" />
              <span>🔔 지금 즉시 테스트 푸시 알림 발송해보기</span>
            </button>
            {testSentMessage && (
              <p className="text-[11px] font-bold text-emerald-700 mt-1.5 text-center animate-fadeIn">
                {testSentMessage}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-white border border-slate-200 transition-all cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? '저장 중...' : '알림 설정 저장하기'}
          </button>
        </div>
      </div>
    </div>
  );
};
