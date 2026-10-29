import express, { Request, Response } from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));

// Initialize GoogleGenAI
const getAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

const CHEF_SYSTEM_INSTRUCTION = `당신은 버려지는 식재료 없이 최고의 맛을 이끌어내는 대한민국 최고 수준의 셰프이자, 스마트 주방 AI 어시스턴트 '냉장고를 부탁해'의 핵심 엔진입니다.
오늘 날짜는 2026-10-29입니다. 식재료의 유통기한/보관일과 현재 날짜(2026-10-29)를 비교하여 신선도를 엄밀하게 판별하세요.

사용자로부터 냉장고에 있는 식재료 리스트(텍스트) 혹은 냉장고 내부/영수증 사진, 그리고 실제 등록된 냉장고 보유 식재료 리스트를 전달받습니다.

# ★ [절대 규칙] 사용자 실제 보유 재고 정밀 인식 및 식재료 날조(환각) 금지:
1. 사용자가 현재 가지고 있지 않은 식재료(예: 콩나물이 없는데 콩나물 요리를 추천하거나, 두부가 없는데 두부를 사용하는 것 등)를 절대로 '유통기한 임박 레시피(urgentRecipe)'의 구출 식재료(usedExpiringIngredients)나 주재료로 임의 추가해서는 안 됩니다!
2. '유통기한 임박 레시피(urgentRecipe)'는 반드시 사용자가 제공한 실제 재고 중 유통기한이 가장 임박했거나 지난 재료(또는 사용자가 지정한 메인 재료)만을 최우선 구출 재료(usedExpiringIngredients)로 삼아야 합니다.
3. 소금, 설탕, 간장, 식용유, 고춧가루, 다진 마늘, 참기름, 물 등 일반 가정의 기본 양념류를 제외하고는, 사용자가 보유하고 있지 않은 새로운 재료는 오직 '확장 레시피(expansionRecipes)'의 '추가 구매 필요 재료(missingIngredientsToBuy)'나 '쇼핑 리스트(shoppingList)'에만 넣어야 합니다.
4. 사용자의 현재 보유 식재료 리스트를 정밀 대조하여, 실제 냉장고에 있는 재료들만을 조합해 최적의 레시피를 제안하세요.

# Core Logic (레시피 추천 기준)
1. 유통기한 임박 레시피 (1개): 현재 유통기한이 가장 임박했거나 지난 실제 보유 재료를 최우선으로 구출하는 메인 요리. (urgentRecipe)
2. 남은 식재료 레시피 (1개): 남은 실제 보유 재료들을 조합해 완전히 다른 스타일로 즐길 수 있는 추가 메인 요리. (alternativeRecipe)
3. 확장 레시피 (2~3개): 현재 가진 재료에 1~2가지 식재료만 추가로 구매하면 만들 수 있는 메뉴들. (expansionRecipes)

# Output Format (JSON 출력 규격)
반드시 마크다운 코드 블록(\`\`\`json ... \`\`\`)을 사용하여 아래 구조의 완벽한 JSON 포맷으로만 응답하세요. 다른 부가적인 텍스트는 작성하지 마세요.

{
  "parsedIngredients": [
    {
      "name": "식재료 이름",
      "expiryDate": "YYYY-MM-DD 또는 '임박/D-day'",
      "status": "fresh (신선) 또는 warning (임박) 또는 expired (지남)"
    }
  ],
  "recipes": {
    "urgentRecipe": {
      "title": "요리 제목",
      "usedExpiringIngredients": ["사용한 임박 재료 1", "재료 2"],
      "ingredients": ["필요한 전체 재료 리스트"],
      "steps": ["조리 순서 1", "조리 순서 2", "조리 순서 3"]
    },
    "alternativeRecipe": {
      "title": "요리 제목",
      "ingredients": ["필요한 전체 재료 리스트"],
      "steps": ["조리 순서 1", "조리 순서 2", "조리 순서 3"]
    },
    "expansionRecipes": [
      {
        "title": "요리 제목",
        "currentIngredientsUsed": ["가진 재료"],
        "missingIngredientsToBuy": ["추가로 사야 하는 재료"],
        "briefSteps": "간단한 조리법 설명"
      }
    ]
  },
  "shoppingList": [
    {
      "item": "쿠팡 링크에 검색할 상품명 (예: 친환경 양파 1kg)",
      "reason": "유통기한 경과 또는 확장 레시피에 필요한 재료"
    }
  ]
}`;

interface FallbackIngredient {
  name: string;
  quantity?: string;
  expiryDate?: string;
  status?: 'fresh' | 'warning' | 'expired';
  itemType?: string;
}

// Sanitize recipes against actual inventory to prevent any ghost ingredients (e.g. 콩나물)
function sanitizeRecipesAgainstInventory(
  recipes: any,
  inventory: FallbackIngredient[] | null | undefined
) {
  if (!recipes || !inventory || inventory.length === 0) return recipes;

  const validNames = inventory.map((i) => i.name.trim());
  const validNamesLower = validNames.map((n) => n.toLowerCase());

  const isPresentInInventory = (cand: string) => {
    if (!cand) return false;
    const clean = cand
      .replace(/\(.*?\)/g, '')
      .replace(/[\d\.]+\s*(개|알|봉|모|단|g|kg|캔|통|팩|줄|마리|포기)/g, '')
      .trim()
      .toLowerCase();
    return validNamesLower.some((v) => v.includes(clean) || clean.includes(v));
  };

  const actualUrgent =
    inventory.find((i) => i.status === 'expired' || i.status === 'warning') || inventory[0];
  const heroName = actualUrgent.name;

  if (recipes.urgentRecipe) {
    const rawUsed = Array.isArray(recipes.urgentRecipe.usedExpiringIngredients)
      ? recipes.urgentRecipe.usedExpiringIngredients.map(String)
      : [];

    const filtered = rawUsed.filter(isPresentInInventory);
    recipes.urgentRecipe.usedExpiringIngredients = filtered.length > 0 ? filtered : [heroName];

    // If title has ghost ingredients like '콩나물' while user doesn't have 콩나물, sanitize title
    const titleStr = String(recipes.urgentRecipe.title || '');
    if (titleStr.includes('콩나물') && !validNamesLower.some((v) => v.includes('콩나물'))) {
      recipes.urgentRecipe.title = `기한 임박 [${heroName}] 구출! 셰프 특제 요리`;
    }
  }

  return recipes;
}

// Smart fallback generator that strictly respects actual inventory ingredients without hallucination
function generateSmartChefFallback(
  textPrompt?: string,
  extraContext?: string,
  mainIngredients?: string[],
  currentIngredients?: FallbackIngredient[]
) {
  const combined = [textPrompt, extraContext].filter(Boolean).join(' ');

  // 1. Gather concrete inventory items
  let inventory: FallbackIngredient[] = [];

  if (Array.isArray(currentIngredients) && currentIngredients.length > 0) {
    inventory = currentIngredients
      .filter((i) => i && i.name && i.name.trim())
      .map((i) => ({
        name: i.name.trim(),
        quantity: i.quantity || '1개',
        expiryDate: i.expiryDate || '2026-10-31',
        status: (i.status as any) || 'fresh',
        itemType: i.itemType || 'ingredient',
      }));
  }

  // If no currentIngredients provided, parse from prompt text
  if (inventory.length === 0 && combined.trim()) {
    const tokens = combined
      .split(/[,;\n]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && !t.includes('http') && !t.includes('{') && !t.includes('}'));

    inventory = tokens.slice(0, 10).map((t, idx) => {
      // Clean up bracket notes like "(식재료, 1단, 유통기한: 2026-10-25)"
      const cleanName = t.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
      const isUrgent = /임박|만료|어제|지남|경과/i.test(t);
      const isSideDish = /김치|볶음|조림|무침|장아찌|젓갈|나물/i.test(cleanName);
      return {
        name: cleanName || `식재료 ${idx + 1}`,
        quantity: '1개',
        expiryDate: isUrgent ? '2026-10-29' : '2026-11-05',
        status: isUrgent ? 'warning' : 'fresh',
        itemType: isSideDish ? 'side_dish' : 'ingredient',
      };
    });
  }

  // 2. Identify Hero Item (Strictly from actual inventory)
  let hero: FallbackIngredient;
  if (Array.isArray(mainIngredients) && mainIngredients.length > 0) {
    const requested = mainIngredients[0].trim();
    const matched = inventory.find((i) => i.name.toLowerCase().includes(requested.toLowerCase()));
    hero = matched || {
      name: requested,
      quantity: '1인분',
      expiryDate: '2026-10-31',
      status: 'fresh',
      itemType: 'ingredient',
    };
    if (!matched) {
      inventory.unshift(hero);
    }
  } else if (inventory.length > 0) {
    const urgentCandidate = inventory.find((i) => i.status === 'expired' || i.status === 'warning');
    hero = urgentCandidate || inventory[0];
  } else {
    // True empty fallback (only when no input at all)
    hero = { name: '달걀', quantity: '2알', expiryDate: '2026-10-31', status: 'fresh' };
    inventory = [
      hero,
      { name: '대파', quantity: '1/2대', expiryDate: '2026-11-02', status: 'fresh' },
    ];
  }

  const secondaryItems = inventory.filter((i) => i.name !== hero.name);
  const sec1 = secondaryItems[0] || { name: '대파', quantity: '송송 썬 것' };

  // 3. Construct tailor-made recipe titles according to food characteristics
  const heroName = hero.name;
  const isMeatOrProtein = /삼겹살|목살|소고기|돼지고기|스팸|햄|닭고기|베이컨|차돌박이|고기/i.test(heroName);
  const isTofu = /두부|순두부|연두부/i.test(heroName);
  const isKimchiOrSide = /김치|묵은지|깍두기|장조림|멸치볶음|진미채/i.test(heroName);
  const isEgg = /계란|달걀/i.test(heroName);
  const isMushroom = /버섯|팽이|표고|새송이/i.test(heroName);

  let urgentTitle = `기한 임박 [${heroName}] 구출! 셰프 특제 감칠맛 볶음`;
  let urgentSteps = [
    `달군 팬에 식용유 1스푼을 두르고 ${sec1.name}을(를) 중약불에서 1분간 볶아 향긋한 기름을 냅니다.`,
    `손질한 ${heroName}을(를) 넣고 센 불에서 2~3분간 노릇하게 볶아 본연의 풍미를 끌어올립니다.`,
    `진간장 1.5스푼, 올리고당 1스푼, 다진 마늘 0.5스푼을 넣고 양념이 골고루 배도록 2분간 볶아냅니다.`,
    `불을 끄고 참기름과 통깨를 둘러 밥반찬이나 일품 요리로 맛있게 담아냅니다.`,
  ];

  if (isMeatOrProtein) {
    urgentTitle = `골든타임 [${heroName}] 구출! 고소한 [${heroName}] 파기름 볶음 & 구이`;
    urgentSteps = [
      `팬을 달군 후 손질한 ${heroName}을(를) 중불에 올려 노릇하게 기름이 배어 나올 때까지 3분간 굽습니다.`,
      `${sec1.name}과(와) 다진 마늘 1스푼을 넣고 고기 기름에 달달 볶아 감칠맛을 배가시킵니다.`,
      `진간장 1스푼과 후춧가루를 살짝 둘러 불맛을 입혀줍니다.`,
      `노릇하고 바삭하게 구워진 ${heroName}에 참기름을 살짝 둘러 따뜻하게 완성합니다.`,
    ];
  } else if (isTofu) {
    urgentTitle = `기한 임박 [${heroName}] 구출! 칼칼 밥도둑 [${heroName}] 조림 & 짜글이`;
    urgentSteps = [
      `냄비에 ${heroName}을(를) 도톰하게 썰어 바닥에 정갈하게 깔아줍니다.`,
      `위에 ${sec1.name}을(를) 얹고 고춧가루 1.5스푼, 간장 2스푼, 다진마늘 1스푼, 물 200ml를 부어줍니다.`,
      `센 불로 끓어오르면 중약불로 줄이고 양념이 자작하게 쏙 배어들도록 5분간 졸여냅니다.`,
      `마지막에 참기름과 통깨를 얹어 밥 위에 쓱쓱 비벼 먹기 좋은 짜글이로 완성합니다.`,
    ];
  } else if (isKimchiOrSide) {
    urgentTitle = `남은 [${heroName}]의 화려한 변신! 매콤 고소한 셰프풍 볶음밥`;
    urgentSteps = [
      `팬에 식용유 2스푼을 두르고 송송 썬 ${sec1.name}을(를) 볶아 향긋한 파기름을 만듭니다.`,
      `먹기 좋게 자른 ${heroName}을(를) 넣고 센 불에서 2~3분간 달달 볶아 깊은 감칠맛을 냅니다.`,
      `따뜻한 밥 1공기를 넣고 주걱을 세워 밥알을 고슬고슬하게 풀며 볶아줍니다.`,
      `진간장 0.5스푼으로 팬 가장자리 불맛을 낸 뒤 참기름과 김가루를 둘러 완성합니다.`,
    ];
  } else if (isEgg) {
    urgentTitle = `기한 임박 [${heroName}] 구출! 포슬포슬 부드러운 영양 달걀 요리`;
    urgentSteps = [
      `볼에 ${heroName}을(를) 깨뜨려 넣고 소금 한 꼬집, 참기름 0.5스푼을 넣어 부드럽게 풀어줍니다.`,
      `송송 썬 ${sec1.name}을(를) 계란물에 섞어 알록달록한 식감을 더합니다.`,
      `약불로 달군 팬에 기름을 얇게 두르고 계란물을 부어 포슬포슬하게 저어가며 익힙니다.`,
      `촉촉하고 부드럽게 익었을 때 불을 끄고 잔열로 완성하여 그릇에 담아냅니다.`,
    ];
  } else if (isMushroom) {
    urgentTitle = `기한 임박 [${heroName}] 구출! 쫄깃 버터 갈릭 [${heroName}] 볶음`;
    urgentSteps = [
      `손질한 ${heroName}의 밑동을 정리하고 먹기 좋은 크기로 가볍게 찢어 준비합니다.`,
      `팬에 버터 1조각(또는 식용유)과 다진 마늘 1스푼을 중약불에서 볶아 풍미를 냅니다.`,
      `${heroName}과(와) ${sec1.name}을(를) 넣고 센 불에서 수분이 날아가도록 2분간 빠르게 볶습니다.`,
      `진간장 1스푼과 통깨, 후춧가루를 둘러 쫄깃한 식감을 살려 완성합니다.`,
    ];
  }

  const formatIngLabel = (name: string, qty?: string) => {
    if (!qty || name.includes(qty)) return name;
    return `${name} ${qty}`;
  };

  // 4. Assemble recipes data
  const urgentRecipe = {
    title: urgentTitle,
    usedExpiringIngredients: [heroName],
    ingredients: [
      formatIngLabel(heroName, hero.quantity || '1~2인분'),
      formatIngLabel(sec1.name, sec1.quantity || '약간'),
      '진간장 1.5스푼, 다진 마늘 1스푼, 참기름 1스푼, 식용유 1스푼, 통깨 약간',
    ],
    steps: urgentSteps,
    estimatedTimeMinutes: 15,
    difficulty: '쉬움' as const,
  };

  const altHero = secondaryItems.length > 0 ? secondaryItems[0].name : heroName;
  const alternativeRecipe = {
    title: `[초간단 한그릇] 든든한 [${altHero}] 덮밥 & 한 끼 요리`,
    ingredients: [
      `${altHero} 1인분`,
      '따뜻한 밥 1공기',
      '굴소스 0.5스푼, 진간장 1스푼, 참기름, 김가루',
    ],
    steps: [
      `팬에 ${altHero}을(를) 먹기 좋은 크기로 손질하여 노릇하게 볶아냅니다.`,
      `간장과 굴소스를 살짝 둘러 양념이 코팅되도록 센 불로 1분간 마무리합니다.`,
      `넓은 그릇에 따뜻한 밥을 담고 볶아낸 ${altHero}을(를) 푸짐하게 얹습니다.`,
      `참기름과 김가루를 솔솔 뿌려 간편하고 든든하게 비벼 드세요.`,
    ],
    estimatedTimeMinutes: 15,
    difficulty: '쉬움' as const,
  };

  const expansionRecipes = [
    {
      title: `바삭 고소한 [${heroName}] 부침전`,
      currentIngredientsUsed: [heroName, sec1.name],
      missingIngredientsToBuy: ['부침가루 500g', '홍고추 1팩'],
      briefSteps: `${heroName}을(를) 잘게 썰어 부침가루 반죽에 섞은 뒤 앞뒤로 노릇노릇 바삭하게 부쳐냅니다.`,
      estimatedTimeMinutes: 20,
    },
    {
      title: `얼큰 시원한 [${heroName}] 뚝배기 전골`,
      currentIngredientsUsed: [heroName],
      missingIngredientsToBuy: ['느타리버섯 1팩', '알배기배추 1통'],
      briefSteps: `칼칼한 육수에 ${heroName}과(와) 신선한 채소를 넣어 7분간 보글보글 끓여냅니다.`,
      estimatedTimeMinutes: 20,
    },
  ];

  const shoppingList = [
    {
      item: `신선한 ${heroName} 추가 보충팩`,
      reason: `유통기한 임박 식재료 구출 후 냉장고 신선 재고 보충용`,
    },
    {
      item: '바삭한 부침가루 500g',
      reason: `확장 레시피: 바삭 [${heroName}] 전 필수 재료`,
    },
  ];

  return {
    parsedIngredients: inventory.map((item) => ({
      name: item.name,
      expiryDate: item.expiryDate || '2026-10-31',
      status: item.status || 'fresh',
      quantity: item.quantity || '1개',
      itemType: item.itemType || 'ingredient',
    })),
    recipes: {
      urgentRecipe,
      alternativeRecipe,
      expansionRecipes,
    },
    shoppingList,
  };
}

// Helper to parse image input safely avoiding Gemini 400 base64 errors on SVGs
function parseImagePayload(imageBase64?: string, mimeType?: string): {
  inlineData?: { mimeType: string; data: string };
  extractedText?: string;
} {
  if (!imageBase64) return {};

  // Check if it's an SVG data URI or raw SVG XML
  if (imageBase64.includes('image/svg+xml') || imageBase64.includes('<svg')) {
    try {
      const decoded = decodeURIComponent(imageBase64);
      const matches = decoded.match(/<text[^>]*>(.*?)<\/text>/gi);
      const labels = matches
        ? matches.map((m) => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean)
        : [];
      return {
        extractedText: labels.length > 0
          ? `[제출된 이미지(영수증/선반) 텍스트 라벨 추출]:\n${labels.join(', ')}`
          : undefined,
      };
    } catch (_) {
      return {};
    }
  }

  // Handle standard raster base64 data URLs: data:image/png;base64,...
  const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    const detectedMime = match[1].toLowerCase();
    const rawData = match[2].trim();
    // Only accept valid raster image MIME types supported by Gemini
    if (
      detectedMime.includes('jpeg') ||
      detectedMime.includes('jpg') ||
      detectedMime.includes('png') ||
      detectedMime.includes('webp') ||
      detectedMime.includes('heic') ||
      detectedMime.includes('heif')
    ) {
      return {
        inlineData: {
          mimeType: detectedMime,
          data: rawData,
        },
      };
    }
  }

  // If raw base64 string provided without prefix
  if (!imageBase64.startsWith('data:') && !imageBase64.includes('<')) {
    return {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: imageBase64.trim(),
      },
    };
  }

  return {};
}

// API: Analyze Fridge (Text or Image)
app.post('/api/analyze-fridge', async (req: Request, res: Response) => {
  try {
    const { text, imageBase64, mimeType, mainIngredients, currentIngredients } = req.body;

    const inventoryList: FallbackIngredient[] | null =
      Array.isArray(currentIngredients) && currentIngredients.length > 0
        ? currentIngredients
        : null;

    const parsedImage = parseImagePayload(imageBase64, mimeType);
    const combinedContext = [text, parsedImage.extractedText].filter(Boolean).join('\n');
    const mainDirective =
      Array.isArray(mainIngredients) && mainIngredients.length > 0
        ? `\n[★ 중요: 사용자가 지정한 메인 식재료: ${mainIngredients.join(', ')}]\n반드시 지정된 메인 식재료(${mainIngredients.join(', ')})를 주인공으로 삼아 맛있는 요리 레시피를 제안하세요.`
        : '';

    // If current registered ingredients exist, construct a strict inventory list directive
    let inventoryDirective = '';
    if (inventoryList && inventoryList.length > 0) {
      const itemsFormatted = inventoryList
        .map(
          (i) =>
            `- ${i.name} (수량: ${i.quantity || '1개'}, 유통기한/보관일: ${i.expiryDate || '정보 없음'}, 상태: ${i.status || '확인 필요'}, 구분: ${i.itemType === 'side_dish' ? '반찬' : '식재료'})`
        )
        .join('\n');

      inventoryDirective = `\n\n[★ 사용자의 실제 냉장고 보유 식재료 목록 (총 ${inventoryList.length}개) ★]\n${itemsFormatted}\n
[★ 엄격 준수 규칙 - 식재료 임의 날조 절대 금지 ★]
1. 위 보유 식재료 목록에 존재하지 않는 재료(예: 콩나물이 없는데 콩나물 요리를 추천하거나, 콩나물을 usedExpiringIngredients에 넣는 행위)를 절대로 '유통기한 임박 레시피(urgentRecipe)'의 구출 재료(usedExpiringIngredients)나 주재료로 날조하지 마세요!
2. '유통기한 임박 레시피(urgentRecipe)'는 반드시 사용자의 실제 재고 중 유통기한이 가장 임박하거나 지난 재료(또는 사용자가 지정한 메인 재료)만을 최우선 구출 재료(usedExpiringIngredients)로 지정해야 합니다.
3. 기본 양념(소금, 간장, 참기름, 식용유, 설탕, 고춧가루, 다진 마늘 등)을 제외한 모든 새로운 재료는 오직 '확장 레시피(expansionRecipes)'의 '추가 구매 필요 재료(missingIngredientsToBuy)'나 '쇼핑 리스트(shoppingList)'에만 위치해야 합니다.
4. 사용자의 실제 재고(${inventoryList.map((i) => i.name).join(', ')})만을 바탕으로 최고의 레시피를 제안하세요.`;
    }

    const ai = getAIClient();
    if (!ai) {
      console.warn('GEMINI_API_KEY not found. Using intelligent chef fallback.');
      const fallback = generateSmartChefFallback(
        text,
        parsedImage.extractedText,
        mainIngredients,
        inventoryList || undefined
      );
      return res.json({ success: true, data: fallback });
    }

    const contents: any[] = [];

    if (parsedImage.inlineData) {
      contents.push({
        inlineData: parsedImage.inlineData,
      });
      contents.push({
        text: `다음 냉장고 내부 또는 영수증 사진을 정밀 분석해주세요. 
식재료 이름과 추정 유통기한/상태를 파악하고, 유통기한 임박 레시피, 남은 재료 대체 레시피, 확장 레시피 및 쇼핑 리스트를 도출하세요.${mainDirective}${inventoryDirective}
사용자 추가 메모: ${combinedContext || '없음'}`,
      });
    } else {
      contents.push({
        text: `다음 냉장고 보관 식재료 텍스트 및 보유 재고 목록을 정밀 분석해주세요:
"${combinedContext || '냉장고 재료'}"${mainDirective}${inventoryDirective}

식재료 이름과 유통기한 상태를 파악하고, 3가지 핵심 레시피와 쇼핑 리스트를 도출하세요.`,
      });
    }

    // Wrap in Promise.race with a generous 18-second timeout to allow complete recipe generation
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API timeout - using smart chef engine')), 18000)
    );

    const geminiCall = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts: contents },
      config: {
        systemInstruction: CHEF_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    const response = await Promise.race([geminiCall, timeoutPromise]);
    const outputText = response.text || '';
    let parsed: any;

    try {
      // Clean up markdown fences if present
      const cleaned = outputText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      parsed = JSON.parse(cleaned);
      if (parsed?.recipes) {
        parsed.recipes = sanitizeRecipesAgainstInventory(parsed.recipes, inventoryList);
      }
    } catch (parseErr) {
      console.error('Failed to parse model JSON:', parseErr, outputText);
      parsed = generateSmartChefFallback(
        text,
        parsedImage.extractedText,
        mainIngredients,
        inventoryList || undefined
      );
    }

    return res.json({ success: true, data: parsed });
  } catch (err: any) {
    console.warn('Handling request with smart chef engine fallback:', err?.message || err);
    const parsedImage = parseImagePayload(req.body?.imageBase64, req.body?.mimeType);
    const fallback = generateSmartChefFallback(
      req.body?.text,
      parsedImage.extractedText,
      req.body?.mainIngredients,
      req.body?.currentIngredients
    );
    return res.json({
      success: true,
      data: fallback,
      note: '스마트 셰프 레시피 엔진이 즉시 가동되었습니다.',
    });
  }
});

// API: Generate illustrative stylized food image using Imagen / Gemini
app.post('/api/generate-ingredient-image', async (req: Request, res: Response) => {
  try {
    const { ingredientName } = req.body;
    if (!ingredientName) {
      return res.status(400).json({ error: 'ingredientName is required' });
    }

    const ai = getAIClient();
    if (!ai) {
      return res.json({ success: true, imageUrl: null });
    }

    const prompt = `A charming, stylized, illustrative culinary illustration of food ingredient "${ingredientName}". Cute storybook vector and watercolor art style, cozy kitchen aesthetic, isolated on a clean soft cream background, studio lighting, appetizing and whimsical food sticker, vibrant colors, high quality.`;

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Image generation timeout')), 4500)
    );

    const callPromise = ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: '1:1',
        },
      },
    });

    const response = await Promise.race([callPromise, timeoutPromise]);
    let base64Data: string | null = null;

    if (response?.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          base64Data = `data:${mime};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    return res.json({ success: true, imageUrl: base64Data });
  } catch (err: any) {
    console.warn('Image generation fallback used:', err?.message || err);
    return res.json({ success: true, imageUrl: null });
  }
});

// API: Audio Voice Guidance (TTS)
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text, voiceName = 'Kore' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    const ai = getAIClient();
    if (!ai) {
      return res.status(503).json({ error: 'AI Client unavailable' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `친절하고 명쾌한 한국인 셰프 어조로 말해주세요: ${text}`,
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName as any },
          },
        },
      },
    });

    const base64Audio =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      return res.status(500).json({ error: 'Audio generation failed' });
    }

    return res.json({ success: true, audioBase64: base64Audio });
  } catch (err: any) {
    console.error('TTS error:', err);
    return res.status(500).json({ error: err.message || 'TTS failed' });
  }
});

// Setup Vite middleware in dev or static files in prod
async function startServer() {
  const server = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
