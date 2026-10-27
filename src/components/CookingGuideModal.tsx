import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  Sparkles,
  Award,
} from 'lucide-react';
import { extractMinutesFromStep, formatTimer } from '../utils/recipeLogic';

interface CookingGuideModalProps {
  recipe: {
    title: string;
    steps: string[];
    ingredients: string[];
  } | null;
  onClose: () => void;
}

export const CookingGuideModal: React.FC<CookingGuideModalProps> = ({
  recipe,
  onClose,
}) => {
  if (!recipe) return null;

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentStep = recipe.steps[currentStepIndex] || '';
  const totalSteps = recipe.steps.length;

  // Auto-detect minutes when step changes
  useEffect(() => {
    const detectedMinutes = extractMinutesFromStep(currentStep);
    if (detectedMinutes) {
      setTimerSeconds(detectedMinutes * 60);
      setTimerActive(false);
    } else {
      setTimerSeconds(0);
      setTimerActive(false);
    }
    stopSpeaking();
  }, [currentStepIndex, currentStep]);

  // Timer interval
  useEffect(() => {
    let interval: any = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            playChime();
            setTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timerSeconds]);

  // Audio chime using Web Audio API
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.warn('Audio chime error:', e);
    }
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const handleSpeakCurrentStep = async () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    setIsSpeaking(true);

    try {
      // First attempt: Gemini TTS API
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `${currentStepIndex + 1}단계: ${currentStep}`,
          voiceName: 'Kore',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
          audioRef.current = audio;
          audio.onended = () => setIsSpeaking(false);
          audio.onerror = () => fallbackWebSpeech();
          await audio.play();
          return;
        }
      }
    } catch (e) {
      console.warn('Backend TTS unavailable, falling back to browser speech:', e);
    }

    fallbackWebSpeech();
  };

  const fallbackWebSpeech = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(currentStep);
      utterance.lang = 'ko-KR';
      utterance.rate = 0.95;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsSpeaking(false);
    }
  };

  const handleNext = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
      playChime();
    }
  };

  const handlePrev = () => {
    if (isFinished) {
      setIsFinished(false);
      return;
    }
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-400 tracking-wider uppercase block">
                스마트 주방 쿡 어시스턴트
              </span>
              <h3 className="text-base sm:text-lg font-bold truncate max-w-[280px] sm:max-w-md">
                {recipe.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            aria-label="닫기"
            onClick={() => {
              stopSpeaking();
              onClose();
            }}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5">
          <div
            className="bg-emerald-500 h-1.5 transition-all duration-300"
            style={{
              width: isFinished
                ? '100%'
                : `${((currentStepIndex + 1) / totalSteps) * 100}%`,
            }}
          />
        </div>

        {/* Content Area */}
        <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
          {!isFinished ? (
            <div className="space-y-6">
              {/* Step indicator */}
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                  STEP {currentStepIndex + 1} / {totalSteps}
                </span>

                <button
                  type="button"
                  onClick={handleSpeakCurrentStep}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSpeaking
                      ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX className="w-4 h-4 text-amber-600" />
                      <span>음성 중지</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 text-emerald-600" />
                      <span>음성으로 읽어주기</span>
                    </>
                  )}
                </button>
              </div>

              {/* Main Step Text */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
                <p className="text-lg sm:text-xl text-slate-800 leading-relaxed font-bold">
                  {currentStep}
                </p>
              </div>

              {/* Interactive Kitchen Timer */}
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block">
                      키친 타이머
                    </span>
                    <span className="text-2xl font-black text-slate-900 tracking-wider font-mono">
                      {formatTimer(timerSeconds)}
                    </span>
                  </div>
                </div>

                {/* Timer Controls */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTimerActive(!timerActive)}
                    className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all ${
                      timerActive
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {timerActive ? (
                      <>
                        <Pause className="w-3.5 h-3.5" /> 일시정지
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-white" /> 타이머 시작
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTimerActive(false);
                      setTimerSeconds(0);
                    }}
                    className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 cursor-pointer"
                    title="타이머 리셋"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  {/* Quick Add Minutes */}
                  <div className="flex items-center gap-1">
                    {[1, 3, 5].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setTimerSeconds((prev) => prev + m * 60)}
                        className="px-2 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-800 text-[11px] font-bold hover:bg-emerald-100 cursor-pointer"
                      >
                        +{m}분
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Completed Screen */
            <div className="text-center py-10 space-y-4">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg border border-emerald-200 animate-bounce">
                <Award className="w-10 h-10" />
              </div>
              <h4 className="text-2xl font-black text-slate-900">
                요리가 성공적으로 완성되었습니다! 🎉
              </h4>
              <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                유통기한 임박 식재료를 완벽히 구출하고 맛있는 한 끼를 만들어냈습니다.
                식사 맛있게 하세요!
              </p>
            </div>
          )}
        </div>

        {/* Modal Bottom Navigation */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStepIndex === 0 && !isFinished}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              currentStepIndex === 0 && !isFinished
                ? 'opacity-40 cursor-not-allowed text-slate-400'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>이전 단계</span>
          </button>

          {!isFinished ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
            >
              <span>
                {currentStepIndex === totalSteps - 1 ? '요리 완성하기 🍽️' : '다음 단계'}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                onClose();
              }}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black shadow-sm cursor-pointer"
            >
              닫기 및 레시피로 돌아가기
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
