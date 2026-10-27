import React, { useState } from 'react';
import {
  X,
  User as UserIcon,
  Lock,
  Mail,
  Smile,
  LogIn,
  UserPlus,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import {
  registerSimpleUser,
  loginSimpleUser,
  SimpleUser,
} from '../lib/simpleAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: SimpleUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  if (!isOpen) return null;

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!username.trim()) {
      setErrorMsg('아이디를 입력해주세요.');
      return;
    }
    if (!password || password.length < 4) {
      setErrorMsg('비밀번호는 최소 4자리 이상이어야 합니다.');
      return;
    }

    setLoading(true);

    if (mode === 'signup') {
      if (!nickname.trim()) {
        setErrorMsg('닉네임을 입력해주세요.');
        setLoading(false);
        return;
      }

      const res = registerSimpleUser(username, password, nickname);
      if (res.success && res.user) {
        setSuccessMsg(`환영합니다, ${res.user.nickname}님! 회원가입 및 로그인이 완료되었습니다.`);
        onAuthSuccess(res.user);
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setErrorMsg(res.error || '회원가입에 실패했습니다.');
      }
    } else {
      const res = loginSimpleUser(username, password);
      if (res.success && res.user) {
        setSuccessMsg(`반갑습니다, ${res.user.nickname}님! 로그인되었습니다.`);
        onAuthSuccess(res.user);
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setErrorMsg(res.error || '로그인에 실패했습니다.');
      }
    }

    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (cred.user) {
        const simple: SimpleUser = {
          uid: cred.user.uid,
          id: cred.user.email || cred.user.uid,
          nickname: cred.user.displayName || 'Google회원',
          displayName: cred.user.displayName || 'Google회원',
        };
        onAuthSuccess(simple);
        onClose();
      }
    } catch (e: any) {
      console.warn('Google sign-in error:', e);
      setErrorMsg('Google 로그인에 실패했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 animate-fadeIn">
        {/* Modal Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-400 tracking-wider uppercase block">
              내 냉장고 클라우드 계정
            </span>
            <h3 className="text-lg font-bold text-white mt-0.5">
              {mode === 'login' ? '간단 로그인' : '간단 회원가입'}
            </h3>
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

        {/* Tab switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50 p-1.5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>기존 회원 로그인</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'signup'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>간단 회원가입</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Username / ID */}
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 block">
              아이디
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="예: chef123"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                required
              />
            </div>
          </div>

          {/* Nickname (Only for Sign Up) */}
          {mode === 'signup' && (
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                닉네임
              </label>
              <div className="relative">
                <Smile className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="예: 백종원셰프, 자취요리왕"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                  required
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 block">
              비밀번호
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="4자리 이상 비밀번호"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>처리 중...</span>
              </>
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>로그인하기</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>회원가입 완료</span>
              </>
            )}
          </button>

          <div className="relative my-4 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <span className="relative bg-white px-3 text-[11px] text-slate-400 font-medium">
              또는 간편 연결
            </span>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Mail className="w-4 h-4 text-slate-600" />
            <span>Google 계정으로 계속하기</span>
          </button>
        </form>
      </div>
    </div>
  );
};
