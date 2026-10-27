import React from 'react';
import { Lightbulb, ShieldCheck, HeartHandshake } from 'lucide-react';

export const ChefTipsBanner: React.FC = () => {
  const tips = [
    {
      title: '두부 신선 연장 꿀팁',
      desc: '남은 두부는 밀폐용기에 넣고 생수를 두부가 잠기도록 부은 뒤 소금 반 스푼을 넣으면 4~5일 더 신선합니다.',
    },
    {
      title: '대파 무르지 않게 보관법',
      desc: '깨끗이 씻어 물기를 완전히 닦은 뒤 밀폐용기 바닥에 키친타월을 깔고 세워서 냉장 보관하세요.',
    },
    {
      title: '버섯은 절대 물에 씻지 마세요',
      desc: '버섯을 물에 씻어 보관하면 수분을 흡수해 금방 상합니다. 키친타월로 감싸 지퍼백에 보관하세요.',
    },
  ];

  return (
    <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-amber-400 text-slate-900">
          <Lightbulb className="w-4 h-4" />
        </div>
        <h4 className="text-base font-bold text-white">
          천재 셰프의 제로 웨이스트 식재료 보관 비법
        </h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tips.map((tip, idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs leading-relaxed"
          >
            <div className="font-bold text-amber-300 mb-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{tip.title}</span>
            </div>
            <p className="text-slate-300 font-medium">{tip.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
