export interface IconMatch {
  recognized: boolean;
  icon: string | null;
  category: string;
}

const KNOWN_INGREDIENTS: { keywords: string[]; icon: string; category: string }[] = [
  { keywords: ['계란', '달걀', '대란', '신선란', '란', '알'], icon: '🥚', category: '정육/난류' },
  { keywords: ['두부', '순두부', '찌개두부'], icon: '🧊', category: '콩/두부' },
  { keywords: ['우유', '밀크'], icon: '🥛', category: '유제품' },
  { keywords: ['치즈', '모짜렐라', '체다'], icon: '🧀', category: '유제품' },
  { keywords: ['삼겹살', '돼지고기', '목살', '항정살', '한돈'], icon: '🥩', category: '정육' },
  { keywords: ['소고기', '한우', '차돌박이', '불고기'], icon: '🥩', category: '정육' },
  { keywords: ['닭고기', '닭가슴살', '닭다리'], icon: '🍗', category: '정육' },
  { keywords: ['스팸', '햄', '소시지', '베이컨'], icon: '🥓', category: '가공육' },
  { keywords: ['생선', '고등어', '연어', '참치', '갈치'], icon: '🐟', category: '수산' },
  { keywords: ['새우', '대하'], icon: '🦐', category: '수산' },
  { keywords: ['오징어', '낙지', '문어'], icon: '🦑', category: '수산' },
  { keywords: ['대파', '쪽파', '파'], icon: '🥬', category: '채소' },
  { keywords: ['양파', '햇양파'], icon: '🧅', category: '채소' },
  { keywords: ['마늘', '다진마늘', '통마늘'], icon: '🧄', category: '채소/양념' },
  { keywords: ['팽이버섯', '표고버섯', '새송이버섯', '버섯', '느타리'], icon: '🍄', category: '버섯' },
  { keywords: ['김치', '묵은지', '배추김치', '총각김치'], icon: '🥬', category: '반찬' },
  { keywords: ['당근'], icon: '🥕', category: '채소' },
  { keywords: ['감자', '수미감자'], icon: '🥔', category: '채소' },
  { keywords: ['고구마'], icon: '🍠', category: '채소' },
  { keywords: ['콩나물', '숙주'], icon: '🌱', category: '채소' },
  { keywords: ['토마토', '방울토마토'], icon: '🍅', category: '과채' },
  { keywords: ['고추', '청양고추'], icon: '🌶️', category: '채소' },
  { keywords: ['오이'], icon: '🥒', category: '채소' },
  { keywords: ['가지'], icon: '🍆', category: '채소' },
  { keywords: ['옥수수'], icon: '🌽', category: '곡류' },
  { keywords: ['브로콜리'], icon: '🥦', category: '채소' },
  { keywords: ['사과'], icon: '🍎', category: '과일' },
  { keywords: ['바나나'], icon: '🍌', category: '과일' },
  { keywords: ['딸기'], icon: '🍓', category: '과일' },
  { keywords: ['포도'], icon: '🍇', category: '과일' },
  { keywords: ['밥', '햇반', '쌀'], icon: '🍚', category: '곡류' },
  { keywords: ['빵', '식빵', '바게트'], icon: '🍞', category: '베이커리' },
  { keywords: ['라면', '생면', '면사리'], icon: '🍜', category: '면류' },
];

/**
 * Checks if the ingredient name has a recognizable standard culinary icon
 */
export function getRecognizableIcon(ingredientName: string): IconMatch {
  if (!ingredientName) {
    return { recognized: false, icon: null, category: '기타' };
  }

  const raw = ingredientName.toLowerCase();
  const cleanName = raw.replace(/[\d\(\)gml개봉모팩]/g, '').trim();

  for (const item of KNOWN_INGREDIENTS) {
    for (const kw of item.keywords) {
      if (raw.includes(kw) || cleanName.includes(kw)) {
        return {
          recognized: true,
          icon: item.icon,
          category: item.category,
        };
      }
    }
  }

  return {
    recognized: false,
    icon: null,
    category: '식재료',
  };
}

/**
 * Generates an aesthetic, stylized pastel vector SVG illustration for unindexed or custom ingredients
 */
export function generateStylizedFoodSvg(name: string): string {
  const hash = Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const palettes = [
    { bg: '#fef3c7', fill: '#f59e0b', stroke: '#d97706', accent: '#fde68a' }, // warm amber
    { bg: '#e0f2fe', fill: '#0284c7', stroke: '#0369a1', accent: '#bae6fd' }, // fresh sky
    { bg: '#dcfce7', fill: '#16a34a', stroke: '#15803d', accent: '#bbf7d0' }, // emerald herb
    { bg: '#fce7f3', fill: '#db2777', stroke: '#be185d', accent: '#fbcfe8' }, // berry rose
    { bg: '#f3e8ff', fill: '#9333ea', stroke: '#7e22ce', accent: '#e9d5ff' }, // lavender
    { bg: '#ffedd5', fill: '#ea580c', stroke: '#c2410c', accent: '#fed7aa' }, // terracotta
  ];

  const p = palettes[hash % palettes.length];
  const firstLetter = name.trim().charAt(0) || '식';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <defs>
      <linearGradient id="g_${hash}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${p.bg}" />
        <stop offset="100%" stop-color="${p.accent}" />
      </linearGradient>
      <filter id="f_${hash}" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="${p.stroke}" flood-opacity="0.15" />
      </filter>
    </defs>
    <rect width="200" height="200" rx="32" fill="url(#g_${hash})" />
    <g filter="url(#f_${hash})">
      <circle cx="100" cy="95" r="54" fill="${p.accent}" stroke="${p.stroke}" stroke-width="3" stroke-dasharray="2 3" opacity="0.6"/>
      <path d="M 70,125 C 60,80 140,80 130,125 C 120,140 80,140 70,125 Z" fill="${p.fill}" stroke="${p.stroke}" stroke-width="4" />
      <circle cx="85" cy="100" r="4" fill="#ffffff" />
      <circle cx="115" cy="100" r="4" fill="#ffffff" />
      <path d="M 94,110 Q 100,116 106,110" stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round" />
      <path d="M 100,75 Q 108,60 118,65" stroke="${p.stroke}" stroke-width="4" fill="none" stroke-linecap="round" />
      <circle cx="120" cy="64" r="5" fill="#22c55e" />
    </g>
    <rect x="25" y="152" width="150" height="28" rx="14" fill="#ffffff" opacity="0.9" />
    <text x="100" y="171" font-family="'Pretendard', sans-serif" font-size="12" font-weight="bold" fill="${p.stroke}" text-anchor="middle">${name.slice(0, 10)}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
