import React, { useState, useMemo } from 'react';
import { Lightbulb, ShieldCheck, Sparkles, RotateCw, CheckCircle2 } from 'lucide-react';
import { ParsedIngredient } from '../types/fridge';

interface ChefTipsBannerProps {
  ingredients?: ParsedIngredient[];
}

interface StorageTip {
  id: string;
  keywords: string[];
  ingredientName: string;
  title: string;
  desc: string;
  category: '채소/나물' | '육류/단백질' | '반찬/김치' | '유제품/기타';
}

const ALL_STORAGE_TIPS: StorageTip[] = [
  {
    id: 'tofu',
    keywords: ['두부', '순두부', '연두부'],
    ingredientName: '두부',
    title: '두부 신선 연장 꿀팁',
    desc: '남은 두부는 밀폐용기에 넣고 두부가 완전히 잠기도록 찬 생수를 부은 뒤 소금 반 스푼을 넣으면 4~5일 더 탱탱하게 보관됩니다.',
    category: '육류/단백질',
  },
  {
    id: 'green_onion',
    keywords: ['대파', '쪽파', '파'],
    ingredientName: '대파',
    title: '대파 무르지 않게 보관법',
    desc: '씻어서 물기를 완전히 말린 후, 밀폐용기 바닥에 키친타월을 깔고 뿌리 쪽이 아래로 가도록 세워서 냉장 보관하면 한 달 이상 싱싱합니다.',
    category: '채소/나물',
  },
  {
    id: 'mushroom',
    keywords: ['버섯', '팽이버섯', '표고', '새송이', '느타리'],
    ingredientName: '버섯',
    title: '버섯은 절대 물에 씻지 마세요',
    desc: '버섯을 물에 씻으면 수분을 흡수해 금방 상하고 향이 날아갑니다. 키친타월로 표면만 털어 지퍼백에 밀봉 보관하세요.',
    category: '채소/나물',
  },
  {
    id: 'egg',
    keywords: ['계란', '달걀', '달걀알', '신선란', '유정란'],
    ingredientName: '달걀',
    title: '달걀 둥근 쪽이 위로 가도록 보관',
    desc: '달걀의 둥근 쪽에 숨구멍(기실)이 있으므로 둥근 쪽을 위로, 뾰족한 쪽을 아래로 세워 보관하고 냉장고 문쪽보다 안쪽 깊숙이 두세요.',
    category: '육류/단백질',
  },
  {
    id: 'onion',
    keywords: ['양파', '적양파', '햇양파'],
    ingredientName: '양파',
    title: '양파 무름 방지 랩핑법',
    desc: '깐 양파는 물기를 완전히 닦고 랩으로 공기가 통하지 않게 꽁꽁 감싸 야채칸에 두면 2주 넘게 아삭함이 유지됩니다.',
    category: '채소/나물',
  },
  {
    id: 'garlic',
    keywords: ['마늘', '다진마늘', '통마늘'],
    ingredientName: '마늘',
    title: '다진 마늘 갈변 방지 비법',
    desc: '마늘을 다질 때 설탕 한 꼬집이나 올리브유 몇 방울을 섞어 얼음틀에 소분 냉동하면 색이 누렇게 변하지 않고 오래갑니다.',
    category: '채소/나물',
  },
  {
    id: 'pork',
    keywords: ['돼지고기', '삼겹살', '목살', '앞다리살', '뒷다리'],
    ingredientName: '돼지고기',
    title: '돼지고기 잡내 없는 냉동법',
    desc: '표면의 핏물을 키친타월로 꼭꼭 눌러 닦아낸 후, 식용유를 표면에 얇게 발라 랩으로 밀착 포장하면 산화와 냉동실 냄새 흡수를 막아줍니다.',
    category: '육류/단백질',
  },
  {
    id: 'beef',
    keywords: ['소고기', '한우', '양지', '차돌박이', '등심'],
    ingredientName: '소고기',
    title: '소고기 신선 보관 비법',
    desc: '핏물을 꼼꼼히 닦고 공기를 최대한 차단해 진공포장하듯 랩핑 후 냉장(김치냉장고 -1~1℃) 또는 급속 냉동 보관하세요.',
    category: '육류/단백질',
  },
  {
    id: 'kimchi',
    keywords: ['김치', '배추김치', '묵은지', '총각김치', '열무김치', '깍두기'],
    ingredientName: '김치',
    title: '김치 군내 없이 아삭하게 유지하기',
    desc: '김치를 꺼낼 때마다 꾹꾹 눌러 국물 속에 잠기게 하고, 표면을 비닐랩이나 위생백으로 공기 차단 밀착을 해주면 하얀 골마지가 생기지 않습니다.',
    category: '반찬/김치',
  },
  {
    id: 'sprouts',
    keywords: ['콩나물', '숙주', '숙주나물'],
    ingredientName: '콩나물',
    title: '콩나물 아삭함 1주일 연장법',
    desc: '봉지째 두면 하루 만에 상합니다. 밀폐용기에 콩나물이 잠길 정도로 찬물을 부어 냉장 보관하고 2일에 한 번 물을 갈아주세요.',
    category: '채소/나물',
  },
  {
    id: 'anchovy',
    keywords: ['멸치', '멸치볶음', '잔멸치'],
    ingredientName: '멸치볶음',
    title: '멸치볶음 눅눅함 방지 보관',
    desc: '수분이 생기지 않도록 밀폐용기 뚜껑 안쪽에 키친타월 한 장을 덧대어 닫아두면 마지막 한 입까지 바삭하게 즐길 수 있습니다.',
    category: '반찬/김치',
  },
  {
    id: 'squid_strip',
    keywords: ['진미채', '진미채볶음', '오징어채'],
    ingredientName: '진미채볶음',
    title: '진미채 딱딱해짐 방지법',
    desc: '냉장고에 넣으면 굳기 쉬운 진미채는 마요네즈 1티스푼을 살짝 버무려 밀폐 보관하면 부드러운 식감이 끝까지 유지됩니다.',
    category: '반찬/김치',
  },
  {
    id: 'jangjorim',
    keywords: ['장조림', '소고기장조림', '메추리알장조림', '돼지고기장조림'],
    ingredientName: '장조림',
    title: '장조림 맑고 신선하게 보관하기',
    desc: '하얀 기름이 굳었을 땐 살짝 걷어내고, 반찬통에서 꺼낼 때 침이나 물기가 묻지 않은 마른 젓가락을 써야 국물이 탁해지지 않습니다.',
    category: '반찬/김치',
  },
  {
    id: 'potato',
    keywords: ['감자', '알감자'],
    ingredientName: '감자',
    title: '감자 싹 트는 것 방지법',
    desc: '냉장고에 넣지 말고 사과 1개와 함께 서늘한 상온에 보관하세요. 사과에서 나오는 에틸렌 가스가 감자의 싹 트는 것을 억제합니다.',
    category: '채소/나물',
  },
  {
    id: 'sweet_potato',
    keywords: ['고구마', '호박고구마', '밤고구마'],
    ingredientName: '고구마',
    title: '고구마는 절대 냉장 보관 금지',
    desc: '고구마를 냉장고에 넣으면 냉해를 입어 쉽게 썩고 맛이 없어집니다. 신문지에 하나씩 싸서 12~15℃ 통풍이 잘되는 그늘에 두세요.',
    category: '채소/나물',
  },
  {
    id: 'carrot',
    keywords: ['당근'],
    ingredientName: '당근',
    title: '당근 수분 유지 보관법',
    desc: '세척 후 물기를 말리고 키친타월로 감싸 지퍼백에 담아 세워서 보관하면 2~3주 동안 무르지 않고 싱싱합니다.',
    category: '채소/나물',
  },
  {
    id: 'bread',
    keywords: ['식빵', '빵', '베이글'],
    ingredientName: '식빵/빵',
    title: '남은 빵은 냉장이 아닌 즉시 냉동!',
    desc: '냉장실 온도는 빵의 전분을 가장 빠르게 노화시킵니다. 남은 빵은 1회분씩 랩으로 밀봉하여 바로 냉동 후 에어프라이어에 데워드세요.',
    category: '유제품/기타',
  },
  {
    id: 'cheese',
    keywords: ['치즈', '모짜렐라', '슬라이스치즈', '체다'],
    ingredientName: '치즈',
    title: '치즈 곰팡이 방지 보관법',
    desc: '개봉 후 비닐 대신 종이호일로 감싼 뒤 지퍼백에 넣으면 치즈가 숨을 쉬면서 습기가 차지 않아 곰팡이가 피지 않습니다.',
    category: '유제품/기타',
  },
  {
    id: 'fishcake',
    keywords: ['어묵', '오뎅'],
    ingredientName: '어묵',
    title: '개봉한 어묵 신선 소분법',
    desc: '끓는 물을 살짝 끼얹어 표면 기름기를 제거하고 물기를 말린 뒤, 한 번 요리할 크기로 썰어 냉동 보관하면 산패 없이 오래 씁니다.',
    category: '육류/단백질',
  },
  {
    id: 'milk',
    keywords: ['우유', '생크림', '두유'],
    ingredientName: '우유',
    title: '우유는 냉장고 문쪽보다 안쪽에',
    desc: '냉장고 문을 자주 열고 닫으면 온도 변화로 우유가 빨리 변질될 수 있습니다. 온도가 가장 일정한 냉장실 안쪽 선반에 보관하세요.',
    category: '유제품/기타',
  },
];

export const ChefTipsBanner: React.FC<ChefTipsBannerProps> = ({ ingredients = [] }) => {
  const [randomSeed, setRandomSeed] = useState(0);

  // Determine matched tips based on user's registered ingredients
  const { displayTips, matchedIngredientNames, isCustomMatched } = useMemo(() => {
    if (!ingredients || ingredients.length === 0) {
      // No ingredients -> Pick 3 random tips based on randomSeed
      const shuffled = [...ALL_STORAGE_TIPS].sort(
        (a, b) => (a.id + randomSeed).localeCompare(b.id + randomSeed)
      );
      return {
        displayTips: shuffled.slice(0, 3),
        matchedIngredientNames: [],
        isCustomMatched: false,
      };
    }

    const fridgeNames = ingredients.map((i) => i.name.toLowerCase().trim());
    const matchedTips: StorageTip[] = [];
    const matchedNames: string[] = [];

    // Find tips where any keyword is contained in user's ingredient names
    for (const tip of ALL_STORAGE_TIPS) {
      const match = tip.keywords.some((kw) =>
        fridgeNames.some((fname) => fname.includes(kw.toLowerCase()))
      );
      if (match) {
        matchedTips.push(tip);
        matchedNames.push(tip.ingredientName);
      }
    }

    if (matchedTips.length > 0) {
      // Shuffle matched tips if more than 3
      const shuffledMatched = [...matchedTips].sort(
        (a, b) => (a.id + randomSeed).localeCompare(b.id + randomSeed)
      );

      // If fewer than 3, fill up with non-matching tips
      let finalTips = shuffledMatched.slice(0, 3);
      if (finalTips.length < 3) {
        const remainingTips = ALL_STORAGE_TIPS.filter(
          (t) => !finalTips.some((ft) => ft.id === t.id)
        ).sort((a, b) => (a.id + randomSeed).localeCompare(b.id + randomSeed));

        finalTips = [...finalTips, ...remainingTips.slice(0, 3 - finalTips.length)];
      }

      return {
        displayTips: finalTips,
        matchedIngredientNames: Array.from(new Set(matchedNames)),
        isCustomMatched: true,
      };
    } else {
      // Refrigerator has items, but none matched our tips -> Pick 3 random
      const shuffled = [...ALL_STORAGE_TIPS].sort(
        (a, b) => (a.id + randomSeed).localeCompare(b.id + randomSeed)
      );
      return {
        displayTips: shuffled.slice(0, 3),
        matchedIngredientNames: [],
        isCustomMatched: false,
      };
    }
  }, [ingredients, randomSeed]);

  const handleRefresh = () => {
    setRandomSeed((prev) => prev + 1);
  };

  return (
    <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-sm transition-all border border-slate-800">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-400 text-slate-900 shadow-xs">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-base font-extrabold text-white">
                천재 셰프의 제로 웨이스트 식재료 보관 비법
              </h4>
              {isCustomMatched ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  내 냉장고 맞춤 꿀팁 ({matchedIngredientNames.join(', ')})
                </span>
              ) : (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10">
                  오늘의 추천 보관 팁
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isCustomMatched
                ? '현재 냉장고에 보관 중인 재료를 분석하여 알맞은 보관법을 우선 제공합니다.'
                : '신선함을 오래 유지하고 버려지는 음식을 줄이는 셰프들의 검증된 팁입니다.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          className="self-end sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold transition-all cursor-pointer border border-white/10 active:scale-95"
          title="다른 보관 꿀팁 보기"
        >
          <RotateCw className="w-3.5 h-3.5 text-amber-300" />
          <span>다른 꿀팁 보기</span>
        </button>
      </div>

      {/* Tips 3-Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {displayTips.map((tip) => {
          const isMatchedThis = matchedIngredientNames.includes(tip.ingredientName);
          return (
            <div
              key={tip.id}
              className={`p-4 rounded-2xl border text-xs leading-relaxed transition-all flex flex-col justify-between ${
                isMatchedThis
                  ? 'bg-emerald-950/40 border-emerald-500/40 shadow-xs'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5 text-xs sm:text-sm">
                    <ShieldCheck
                      className={`w-4 h-4 shrink-0 ${
                        isMatchedThis ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    />
                    <span>{tip.title}</span>
                  </div>
                  {isMatchedThis && (
                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                      내 냉장고 속 재료
                    </span>
                  )}
                </div>
                <p className="text-slate-300 font-medium text-[11px] sm:text-xs">
                  {tip.desc}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
                <span>분류: {tip.category}</span>
                <span className="text-slate-400">품목: {tip.ingredientName}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
