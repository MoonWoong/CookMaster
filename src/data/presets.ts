export interface PresetScenario {
  id: string;
  name: string;
  description: string;
  badge: string;
  type: 'text' | 'image';
  textInput: string;
  imagePreviewUrl?: string;
  sampleImageBase64?: string;
}

// Crisp lightweight SVG data URLs for realistic fridge & receipt sample scanning
const sampleFridgeSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400" fill="%23f1f5f9"><rect width="600" height="400" fill="%23e2e8f0"/><rect x="20" y="20" width="560" height="360" rx="16" fill="%23ffffff" stroke="%23cbd5e1" stroke-width="4"/><line x1="20" y1="140" x2="580" y2="140" stroke="%2394a3b8" stroke-width="6"/><line x1="20" y1="260" x2="580" y2="260" stroke="%2394a3b8" stroke-width="6"/><rect x="50" y="50" width="90" height="70" rx="8" fill="%23fef08a" stroke="%23eab308"/><text x="95" y="90" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23713f12" text-anchor="middle">두부 1모</text><text x="95" y="108" font-family="sans-serif" font-size="11" fill="%23dc2626" text-anchor="middle">유통기한 D-1</text><rect x="160" y="45" width="100" height="75" rx="8" fill="%23fed7aa" stroke="%23f97316"/><text x="210" y="85" font-family="sans-serif" font-size="14" font-weight="bold" fill="%237c2d12" text-anchor="middle">팽이버섯</text><text x="210" y="105" font-family="sans-serif" font-size="11" fill="%23dc2626" text-anchor="middle">어제 지남!</text><rect x="280" y="60" width="130" height="60" rx="8" fill="%23fecdd3" stroke="%23e11d48"/><text x="345" y="95" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23881337" text-anchor="middle">삼겹살 200g</text><rect x="50" y="160" width="120" height="80" rx="8" fill="%23bbf7d0" stroke="%2322c55e"/><text x="110" y="205" font-family="sans-serif" font-size="14" font-weight="bold" fill="%2314532d" text-anchor="middle">대파 1단</text><rect x="190" y="165" width="110" height="75" rx="8" fill="%23bbf7d0" stroke="%2322c55e"/><text x="245" y="208" font-family="sans-serif" font-size="14" font-weight="bold" fill="%2314532d" text-anchor="middle">양파 2개</text><rect x="320" y="160" width="140" height="80" rx="8" fill="%23ffedd5" stroke="%23ea580c"/><text x="390" y="205" font-family="sans-serif" font-size="14" font-weight="bold" fill="%237c2d12" text-anchor="middle">묵은지 반포기</text><rect x="50" y="280" width="150" height="80" rx="8" fill="%23fef9c3" stroke="%23ca8a04"/><text x="125" y="325" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23713f12" text-anchor="middle">신선 달걀 10알</text><text x="300" y="340" font-family="sans-serif" font-size="18" font-weight="bold" fill="%230f172a" text-anchor="middle">🧊 우리집 냉장고 선반 실사</text></svg>`;

const sampleReceiptSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560" viewBox="0 0 400 560" fill="%23f8fafc"><rect width="400" height="560" fill="%23f8fafc"/><rect x="25" y="25" width="350" height="510" rx="4" fill="%23ffffff" stroke="%23cbd5e1" stroke-width="2"/><text x="200" y="65" font-family="monospace" font-size="20" font-weight="bold" fill="%230f172a" text-anchor="middle">[이마트몰 영수증]</text><text x="200" y="90" font-family="monospace" font-size="12" fill="%2364748b" text-anchor="middle">구매일자: 2026-10-21 17:34</text><line x1="45" y1="105" x2="355" y2="105" stroke="%2394a3b8" stroke-dasharray="4"/><text x="50" y="135" font-family="monospace" font-size="13" fill="%231e293b">1. [국산] 찌개두부 300g (소비기한 10/24)</text><text x="50" y="165" font-family="monospace" font-size="13" fill="%23dc2626">2. 친환경 팽이버섯 1봉 (소비기한 10/22 지남)</text><text x="50" y="195" font-family="monospace" font-size="13" fill="%231e293b">3. 국내산 한돈 삼겹살 300g (10/25)</text><text x="50" y="225" font-family="monospace" font-size="13" fill="%231e293b">4. 흙대파 1단 500g</text><text x="50" y="255" font-family="monospace" font-size="13" fill="%231e293b">5. 햇양파 1.5kg 망</text><text x="50" y="285" font-family="monospace" font-size="13" fill="%231e293b">6. 무항생제 신선 대란 10구</text><line x1="45" y1="315" x2="355" y2="315" stroke="%2394a3b8" stroke-dasharray="4"/><text x="200" y="345" font-family="monospace" font-size="14" font-weight="bold" fill="%230f172a" text-anchor="middle">합계: 28,400원</text><rect x="60" y="380" width="280" height="90" rx="8" fill="%23eff6ff" stroke="%233b82f6"/><text x="200" y="415" font-family="sans-serif" font-size="13" font-weight="bold" fill="%231d4ed8" text-anchor="middle">📸 영수증 AI 자동 인식</text><text x="200" y="435" font-family="sans-serif" font-size="11" fill="%232563eb" text-anchor="middle">품목 및 유통기한 자동 추출</text></svg>`;

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: 'preset-crisis',
    name: '🚨 유통기한 비상 냉장고',
    description: '두부(내일 만료), 팽이버섯(어제 지남!), 삼겹살 등 즉시 구출이 필요한 재료들',
    badge: '추천 예제 1',
    type: 'text',
    textInput:
      '찌개용 두부 반모 (유통기한: 내일 2026-10-24), 팽이버섯 1봉 (유통기한: 어제 2026-10-22 지남), 한돈 삼겹살 200g (유통기한: 2026-10-25), 묵은지 반포기 (신선), 대파 1단, 양파 2개, 신선란 4알, 다진마늘',
  },
  {
    id: 'preset-solo',
    name: '🍳 자취생 알뜰 냉장고',
    description: '달걀, 굴소스, 김치, 스팸, 콩나물 등 남은 재료로 색다른 변신이 필요한 순간',
    badge: '추천 예제 2',
    type: 'text',
    textInput:
      '계란 5알 (2026-11-04), 콩나물 반봉지 (2026-10-24 임박), 캔 스팸 1통, 대파 1/2단, 신김치, 진간장, 참기름, 고춧가루, 냉동 밥 2공기',
  },
  {
    id: 'preset-fridge-photo',
    name: '📸 냉장고 선반 사진 스캔',
    description: '냉장고 문을 열고 찍은 실제 선반 사진으로 재료와 유통기한 한눈에 분석',
    badge: '사진 스캔',
    type: 'image',
    textInput: '냉장고 상단 신선실과 채소칸 사진입니다. 유통기한 임박한 것부터 구출해주세요.',
    imagePreviewUrl: sampleFridgeSvg,
  },
  {
    id: 'preset-receipt-photo',
    name: '🧾 마트 영수증 사진 스캔',
    description: '이마트/마트 장보기 영수증 사진으로 구입 품목과 소비기한 자동 판독',
    badge: '영수증 스캔',
    type: 'image',
    textInput: '이틀 전 구매한 이마트 장보기 영수증입니다. 식재료 정리 및 레시피를 부탁합니다.',
    imagePreviewUrl: sampleReceiptSvg,
  },
];
