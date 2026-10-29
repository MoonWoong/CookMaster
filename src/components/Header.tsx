import React from 'react';
import { ChefHat, Sparkles, Bell, LogIn, LogOut, User as UserIcon, ShoppingCart } from 'lucide-react';
interface HeaderProps {
  user: { uid?: string; displayName?: string | null; nickname?: string } | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  cartCount?: number;
  onOpenCart?: () => void;
  activeNavTab?: string;
  onOpenNotificationModal?: () => void;
  urgentCount?: number;
  notificationTime?: string;
  notificationEnabled?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onOpenAuthModal,
  onLogout,
  cartCount = 0,
  onOpenCart,
  activeNavTab,
  onOpenNotificationModal,
  urgentCount = 0,
  notificationTime = '09:00',
  notificationEnabled = true,
}) => {
  const displayName = user?.nickname || user?.displayName || '회원';

  return (
    <header className="bg-white border-b border-emerald-100 sticky top-0 z-30 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Logo & Brand Identity (+ Mobile Quick Action Icons) */}
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-amber-400 p-0.5 shadow-md flex items-center justify-center text-white shrink-0">
                <div className="w-full h-full bg-emerald-700/80 rounded-[14px] flex items-center justify-center">
                  <ChefHat className="w-6 h-6 text-amber-200" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                    냉장고를 부탁해
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" /> AI 셰프
                    </span>
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  버려지는 식재료 제로! 유통기한 구출 요리부터 스마트 재고 관리까지
                </p>
              </div>
            </div>

            {/* Mobile Header Quick Actions */}
            <div className="flex items-center gap-1.5 md:hidden">
              {/* Mobile Notification Setting Button (Only when user is logged in) */}
              {Boolean(user && onOpenNotificationModal) && (
                <button
                  type="button"
                  onClick={onOpenNotificationModal}
                  className="relative p-2.5 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-all cursor-pointer shadow-xs shrink-0"
                  title="유통기한 임박 알림 시간 설정"
                  aria-label="알림 시간 설정"
                >
                  <Bell className="w-5 h-5 text-amber-600" />
                  {urgentCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                  )}
                </button>
              )}

              {/* Mobile-only Shopping Cart Button (Mall Style sticky header) */}
              {onOpenCart && (
                <button
                  type="button"
                  onClick={onOpenCart}
                  className={`relative flex items-center justify-center p-2.5 rounded-2xl border transition-all cursor-pointer shadow-xs shrink-0 ${
                    activeNavTab === 'cart'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  }`}
                  title="장바구니 확인"
                  aria-label="장바구니 바로가기"
                >
                  <ShoppingCart className="w-5 h-5 text-emerald-600" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black shadow-xs leading-none">
                      {cartCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Desktop & Action Row */}
          <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
            {/* Notification Time Settings Button (Only visible when logged in) */}
            {Boolean(user && onOpenNotificationModal) && (
              <button
                type="button"
                onClick={onOpenNotificationModal}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs border bg-amber-50/80 hover:bg-amber-100 text-amber-900 border-amber-200/90"
                title="매일 유통기한 임박 식재료 푸시 알림 시간 설정"
              >
                <div className="relative">
                  <Bell className="w-3.5 h-3.5 text-amber-600" />
                  {urgentCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  )}
                </div>
                <span>알림 설정</span>
                <span className="px-1.5 py-0.2 rounded-md bg-amber-200/80 text-amber-950 font-mono text-[10px] font-extrabold">
                  {notificationEnabled ? `${notificationTime}` : 'OFF'}
                </span>
              </button>
            )}

            {/* Desktop Shopping Cart Button (Mall Style) */}
            {onOpenCart && (
              <button
                type="button"
                onClick={onOpenCart}
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs border ${
                  activeNavTab === 'cart'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border-slate-200'
                }`}
                title="장바구니 확인"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
                <span>장바구니</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    cartCount > 0 ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {cartCount}
                </span>
              </button>
            )}

            {/* Auth Button */}
            {user ? (
              <div className="flex items-center gap-2 pl-1 bg-emerald-50 border border-emerald-200/80 py-1 px-2.5 rounded-2xl">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black shadow-xs">
                  {displayName.charAt(0)}
                </div>
                <div className="text-left hidden sm:block">
                  <span className="text-xs font-black text-slate-900 block max-w-[100px] truncate leading-tight">
                    {displayName}님
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold block leading-none">
                    내 냉장고 로그인됨
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1 rounded-lg hover:bg-emerald-100 text-slate-500 hover:text-slate-800 text-xs transition-all cursor-pointer ml-1"
                  title="로그아웃"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-300" />
                <span>간단 로그인 / 회원가입</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
