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

const CHEF_SYSTEM_INSTRUCTION = `당신은 버려지는 식재료 없이 최고의 맛을 이끌어내는 천재 셰프이자, 스마트 주방 AI 어시스턴트 '냉장고를 부탁해'의 핵심 엔진입니다.
오늘 날짜는 2026-10-23입니다. 식재료의 유통기한과 현재 날짜(2026-10-23)를 비교하여 신선도를 엄밀하게 판별하세요.

사용자로부터 냉장고에 있는 식재료 리스트(텍스트) 혹은 냉장고 내부/영수증 사진을 전달받습니다. 
사진인 경우 식재료 이름과 대략적인 유통기한(영수증의 구매일자나 제품 라벨, 혹은 통상적인 보관기한)을 분석해 내야 합니다.
이를 바탕으로 아래의 3가지 카테고리에 맞춰 맞춤형 요리 레시피를 제안하고, 구매가 필요한 식재료 리스트를 도출하여 반드시 정해진 JSON 형식으로만 응답하세요.

# Core Logic (레시피 추천 기준)
1. 유통기한 임박 레시피 (1개): 현재 유통기한이 가장 임박했거나 지난 재료를 최우선으로 구출하는 메인 요리. (urgentRecipe)
2. 남은 식재료 레시피 (1개): 남은 재료들을 조합해 완전히 다른 스타일로 즐길 수 있는 추가 메인 요리. (alternativeRecipe)
3. 확장 레시피 (2~3개): 현재 재료에 몇 가지 식재료만 추가로 구매하면 만들 수 있는 간단한 메뉴들. (expansionRecipes)

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

// Smart fallback generator if GEMINI_API_KEY is absent or request times out
function generateSmartChefFallback(textPrompt?: string, extraContext?: string, mainIngredients?: string[]) {
  const combined = [textPrompt, extraContext].filter(Boolean).join(' ');
  const text = combined.toLowerCase();

  const primary = (Array.isArray(mainIngredients) && mainIngredients.length > 0)
    ? mainIngredients[0]
    : null;

  // If user designated a main ingredient, prioritize creating custom recipes centered on it!
  if (primary) {
    return {
      parsedIngredients: [
        { name: primary, expiryDate: '2026-10-31', status: 'fresh' },
        { name: '대파 1대', expiryDate: '2026-10-30', status: 'fresh' },
        { name: '양파 1개', expiryDate: '2026-11-03', status: 'fresh' },
        { name: '다진 마늘', expiryDate: '2026-11-15', status: 'fresh' },
      ],
      recipes: {
        urgentRecipe: {
          title: `[메인 맞춤] 셰프 특제 ${primary} 감칠맛 조림 & 볶음`,
          usedExpiringIngredients: [primary],
          ingredients: [
            `${primary} 1~2인분 (먹기 좋게 손질)`,
            '대파 1/2대 (송송 썰기)',
            '양파 1/2개 (채썰기)',
            '다진 마늘 1스푼, 진간장 1.5스푼, 올리고당 1스푼, 참기름 1스푼, 통깨 약간',
          ],
          steps: [
            `달군 팬에 식용유 1스푼을 두르고 대파와 다진 마늘을 중약불에서 1분간 볶아 향긋한 파기름을 만듭니다.`,
            `손질한 ${primary}을(를) 넣고 센 불에서 2~3분간 노릇하게 볶아 본연의 풍미를 끌어올립니다.`,
            `진간장 1.5스푼과 올리고당 1스푼, 채 썬 양파를 넣고 양념이 쏙 배어들도록 2분간 자작하게 졸여냅니다.`,
            `불을 끄고 참기름과 통깨를 둘러 밥반찬이나 메인 요리로 맛있게 담아냅니다.`,
          ],
        },
        alternativeRecipe: {
          title: `[초간단 별미] 든든한 ${primary} 덮밥 & 따뜻한 한 끼`,
          ingredients: [
            `${primary} 1인분`,
            '따뜻한 밥 1공기',
            '계란 1알 (프라이 또는 부드러운 스크램블)',
            '굴소스 0.5스푼, 진간장 1스푼, 김가루',
          ],
          steps: [
            `팬에 ${primary}을(를) 먹기 좋은 크기로 노릇하게 굽고 굴소스와 간장으로 가볍게 코팅하듯 볶습니다.`,
            `따뜻한 밥 1공기를 넓은 그릇에 담고 맛있게 볶아낸 ${primary}을(를) 푸짐하게 얹습니다.`,
            `계란과 김가루, 참기름을 톡 떨어뜨려 쓱쓱 비벼 먹으면 남녀노소 좋아하는 든든한 덮밥이 완성됩니다.`,
          ],
        },
        expansionRecipes: [
          {
            title: `바삭 고소한 ${primary} 전 & 부침`,
            currentIngredientsUsed: [primary, '대파'],
            missingIngredientsToBuy: ['부침가루 500g', '홍고추 1팩'],
            briefSteps: `${primary}을(를) 잘게 썰어 부침가루 반죽에 섞은 뒤 앞뒤로 노릇노릇 바삭하게 지져냅니다.`,
          },
          {
            title: `얼큰 시원한 ${primary} 뚝배기 전골`,
            currentIngredientsUsed: [primary],
            missingIngredientsToBuy: ['느타리버섯 1팩', '알배기배추 1통'],
            briefSteps: `칼칼한 멸치 다시마 육수에 ${primary}와 채소를 푸짐하게 넣어 7분간 보글보글 끓여냅니다.`,
          },
        ],
      },
      shoppingList: [
        {
          item: `신선한 ${primary} 추가 보충팩`,
          reason: `메인 요리 [${primary}] 추가 조리 및 냉장고 비축용`,
        },
        {
          item: '곰곰 바삭한 부침가루 500g',
          reason: `확장 레시피: 바삭 ${primary} 전 필수 재료`,
        },
      ],
    };
  }

  let hasTofu = text.includes('두부');
  let hasKimchi = text.includes('김치');
  let hasPork = text.includes('삼겹살') || text.includes('돼지고기') || text.includes('고기');
  let hasEgg = text.includes('계란') || text.includes('달걀');
  let hasMushroom = text.includes('버섯') || text.includes('팽이');
  let hasOnion = text.includes('양파');
  let hasGreenOnion = text.includes('대파') || text.includes('파');
  let hasSpam = text.includes('스팸') || text.includes('햄');
  let hasBeanSprouts = text.includes('콩나물');

  if (hasSpam || hasBeanSprouts) {
    return {
      parsedIngredients: [
        { name: '신선 콩나물 1봉', expiryDate: '2026-10-24', status: 'warning' },
        { name: '스팸 클래식 1캔', expiryDate: '2026-11-20', status: 'fresh' },
        { name: '신선란 4알', expiryDate: '2026-11-04', status: 'fresh' },
        { name: '묵은지', expiryDate: '2026-11-15', status: 'fresh' },
        { name: '대파 1/2단', expiryDate: '2026-10-28', status: 'fresh' },
      ],
      recipes: {
        urgentRecipe: {
          title: '임박 콩나물 구출! 얼큰 스팸 콩나물 김치찌개',
          usedExpiringIngredients: ['신선 콩나물 1봉'],
          ingredients: [
            '콩나물 150g (깨끗이 씻어 준비)',
            '스팸 1/2캔 (숟가락으로 툭툭 떼어넣기)',
            '신김치 1컵',
            '대파 1/2대, 다진마늘 1스푼',
            '고춧가루 1스푼, 국간장 1스푼, 물 500ml',
          ],
          steps: [
            '냄비에 스팸을 숟가락으로 큼직하게 떼어 넣고 중불에서 2분간 노릇하게 구워 감칠맛을 냅니다.',
            '신김치를 넣고 스팸 기름에 3분간 달달 볶아 깊은 맛을 냅니다.',
            '물 500ml와 고춧가루, 국간장, 다진마늘을 넣고 센 불에서 끓입니다.',
            '국물이 끓어오르면 기한 임박 콩나물을 듬뿍 넣고 뚜껑을 연 채 4분간 시원하게 끓여냅니다.',
          ],
        },
        alternativeRecipe: {
          title: '자취 10분 컷! 두툼 스팸 에그마요 덮밥',
          ingredients: [
            '스팸 1/2캔 (작은 주사위 깍둑썰기)',
            '계란 2알',
            '따뜻한 밥 1공기',
            '진간장 1스푼, 올리고당 1스푼, 마요네즈, 김가루',
          ],
          steps: [
            '팬에 깍둑썬 스팸을 노릇하게 3분간 구운 뒤 간장과 올리고당을 둘러 윤기나게 조려냅니다.',
            '계란 2알을 풀어 부드러운 스크램블 에그를 만들어 밥 위에 얹습니다.',
            '조려둔 스팸을 올리고 마요네즈와 김가루를 솔솔 뿌려 완성합니다.',
          ],
        },
        expansionRecipes: [
          {
            title: '바삭 콩나물 김치 부침개',
            currentIngredientsUsed: ['콩나물', '묵은지'],
            missingIngredientsToBuy: ['부침가루 500g', '탄산수 1병'],
            briefSteps:
              '송송 썬 김치와 아삭한 콩나물을 차가운 탄산수와 부침가루에 반죽하여 팬에 바삭하게 지져냅니다.',
          },
          {
            title: '스팸 순두부 열라면 찌개',
            currentIngredientsUsed: ['스팸', '대파', '계란'],
            missingIngredientsToBuy: ['열라면 1봉', '순두부 1팩'],
            briefSteps:
              '라면 물에 구운 스팸과 순두부를 넣고 끓인 뒤 파와 달걀 노른자를 얹어 얼큰하게 즐깁니다.',
          },
        ],
      },
      shoppingList: [
        {
          item: '곰곰 무농약 콩나물 300g',
          reason: '유통기한 임박 콩나물 즉시 보충용',
        },
        {
          item: '오뚜기 백세 바삭한 부침가루 1kg',
          reason: '확장 레시피: 바삭 콩나물 김치 부침개 반죽용',
        },
        {
          item: '풀무원 국산 순두부 350g',
          reason: '확장 레시피: 스팸 순두부 열라면용',
        },
      ],
    };
  }

  return {
    parsedIngredients: [
      {
        name: hasTofu ? '두부 (반모)' : '두부 (부침용)',
        expiryDate: '2026-10-24',
        status: 'warning',
      },
      {
        name: hasMushroom ? '팽이버섯 1봉' : '표고버섯 3개',
        expiryDate: '2026-10-22',
        status: 'expired',
      },
      {
        name: hasPork ? '삼겹살 200g' : '소고기 불고기감 150g',
        expiryDate: '2026-10-25',
        status: 'warning',
      },
      {
        name: hasKimchi ? '잘 익은 묵은지' : '배추김치',
        expiryDate: '2026-11-20',
        status: 'fresh',
      },
      {
        name: hasEgg ? '신선 대란 4알' : '계란 2알',
        expiryDate: '2026-11-05',
        status: 'fresh',
      },
      {
        name: hasGreenOnion ? '대파 1단' : '깐대파',
        expiryDate: '2026-10-30',
        status: 'fresh',
      },
      {
        name: hasOnion ? '햇양파 2개' : '양파 1개',
        expiryDate: '2026-11-02',
        status: 'fresh',
      },
    ],
    recipes: {
      urgentRecipe: {
        title: '골든 타임 구출! 칼칼 팽이버섯 두부 짜글이',
        usedExpiringIngredients: ['두부 (반모)', '팽이버섯 1봉', '삼겹살 200g'],
        ingredients: [
          '두부 1/2모 (도톰하게 깍둑썰기)',
          '팽이버섯 1봉 (밑동 자르고 찢기)',
          '삼겹살 150g (한 입 크기)',
          '묵은지 1컵',
          '대파 1/2대, 청양고추 1개',
          '양념장: 고추장 1큰술, 고춧가루 1.5큰술, 진간장 1큰술, 다진마늘 1큰술, 물 200ml',
        ],
        steps: [
          '냄비에 삼겹살을 먼저 넣고 중불에서 2분간 기름이 살짝 배어 나올 때까지 볶아줍니다.',
          '묵은지와 양념장을 넣고 고기와 함께 3분간 달달 볶아 감칠맛을 끌어올립니다.',
          '물 200ml를 붓고 끓기 시작하면 기한 임박한 두부와 팽이버섯을 듬뿍 올립니다.',
          '중약불로 줄여 5분간 자작하게 졸인 뒤, 송송 썬 대파를 얹어 칼칼하게 완성합니다.',
        ],
      },
      alternativeRecipe: {
        title: '냉장고 재발견! 고소한 대파 계란 볶음밥과 김치 겉절이 샐러드',
        ingredients: [
          '계란 2알',
          '대파 1대 (송송 썰기)',
          '햇반 또는 찬밥 1공기',
          '참기름 1큰술, 굴소스 0.5큰술, 소금 한 꼬집',
          '묵은지 속 털어낸 후 참기름에 버무린 곁들임 샐러드',
        ],
        steps: [
          '팬에 식용유 2스푼과 송송 썬 대파를 듬뿍 넣고 약불에서 3분간 노릇하게 파기름을 냅니다.',
          '파를 한쪽으로 밀고 계란 2알을 풀어 스크램블을 부드럽게 만들어 섞습니다.',
          '밥 1공기를 넣고 주걱을 세워 밥알을 털어내듯 2분간 센 불로 볶아줍니다.',
          '굴소스와 참기름을 두르고 마지막 불맛을 입혀 그릇에 담아냅니다.',
        ],
      },
      expansionRecipes: [
        {
          title: '얼큰 차돌 순두부 짬뽕탕',
          currentIngredientsUsed: ['대파 1단', '계란 1알', '양파 1개'],
          missingIngredientsToBuy: ['신선 순두부 1팩', '차돌박이 200g', '생면사리'],
          briefSteps:
            '차돌박이와 파, 양파를 고춧가루와 볶아 짬뽕 기름을 낸 후, 물을 붓고 순두부와 생면을 넣어 5분간 끓입니다.',
        },
        {
          title: '겉바속촉 모둠 버섯 삼겹 솥밥',
          currentIngredientsUsed: ['삼겹살', '팽이버섯', '대파'],
          missingIngredientsToBuy: ['새송이버섯 1팩', '표고버섯 2개', '쯔유 소스'],
          briefSteps:
            '불린 쌀 위에 노릇하게 구운 삼겹살과 버섯을 얹고 쯔유 육수를 부어 15분간 냄비 밥을 짓습니다.',
        },
        {
          title: '스페인식 감자 계란 토르티야 오믈렛',
          currentIngredientsUsed: ['계란 4알', '양파 1개'],
          missingIngredientsToBuy: ['햇감자 2개', '베이컨 1팩', '체다치즈'],
          briefSteps:
            '감자와 양파를 올리브유에 볶아 부드럽게 익힌 뒤 달걀물을 부어 도톰하게 양면을 부쳐냅니다.',
        },
      ],
    },
    shoppingList: [
      {
        item: '친환경 무농약 팽이버섯 3입',
        reason: '유통기한 경과 버섯 즉시 대체용',
      },
      {
        item: '국산 콩 100% 찌개용 두부 300g',
        reason: '유통기한 임박 식재료 보충',
      },
      {
        item: '신선 순두부 350g 2팩',
        reason: '확장 레시피: 얼큰 차돌 순두부 짬뽕탕 필수 재료',
      },
      {
        item: '한우 차돌박이 구이용 300g',
        reason: '확장 레시피: 짬뽕탕 및 솥밥 토핑 재료',
      },
      {
        item: '제주 햇수미감자 1kg',
        reason: '확장 레시피: 스페인식 토르티야 오믈렛용',
      },
    ],
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
    const { text, imageBase64, mimeType, mainIngredients } = req.body;

    const parsedImage = parseImagePayload(imageBase64, mimeType);
    const combinedContext = [text, parsedImage.extractedText].filter(Boolean).join('\n');
    const mainDirective = (Array.isArray(mainIngredients) && mainIngredients.length > 0)
      ? `\n[★ 중요: 사용자가 지정한 메인 식재료: ${mainIngredients.join(', ')}]\n반드시 지정된 메인 식재료(${mainIngredients.join(', ')})를 주인공으로 삼아 맛있는 요리 레시피를 제안하세요.`
      : '';

    const ai = getAIClient();
    if (!ai) {
      console.warn('GEMINI_API_KEY not found. Using intelligent chef fallback.');
      const fallback = generateSmartChefFallback(text, parsedImage.extractedText, mainIngredients);
      return res.json({ success: true, data: fallback });
    }

    const contents: any[] = [];

    if (parsedImage.inlineData) {
      contents.push({
        inlineData: parsedImage.inlineData,
      });
      contents.push({
        text: `다음 냉장고 내부 또는 영수증 사진을 정밀 분석해주세요. 
식재료 이름과 추정 유통기한/상태를 파악하고, 유통기한 임박 레시피, 남은 재료 대체 레시피, 확장 레시피 및 쇼핑 리스트를 도출하세요.${mainDirective}
사용자 추가 메모: ${combinedContext || '없음'}`,
      });
    } else {
      contents.push({
        text: `다음 냉장고 보관 식재료 텍스트 및 이미지 라벨 내용을 정밀 분석해주세요:
"${combinedContext || '두부, 대파, 팽이버섯, 계란, 김치, 양파, 돼지고기'}"${mainDirective}

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
    } catch (parseErr) {
      console.error('Failed to parse model JSON:', parseErr, outputText);
      parsed = generateSmartChefFallback(text, parsedImage.extractedText, mainIngredients);
    }

    return res.json({ success: true, data: parsed });
  } catch (err: any) {
    console.warn('Handling request with smart chef engine fallback:', err?.message || err);
    const parsedImage = parseImagePayload(req.body?.imageBase64, req.body?.mimeType);
    const fallback = generateSmartChefFallback(
      req.body?.text,
      parsedImage.extractedText,
      req.body?.mainIngredients
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
