import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDDay,
  generateCoupangSearchUrl,
  formatTimer,
  extractMinutesFromStep,
  normalizeFridgeResponse,
  extractQuantityFromName,
  calculateRemainingQuantity,
} from './recipeLogic';

test('calculateDDay correctly classifies expired dates and textual status', () => {
  const base = new Date('2026-10-23T12:00:00Z');

  // Textual hints
  const exp1 = calculateDDay('유통기한 지남', base);
  assert.equal(exp1.status, 'expired');

  const exp2 = calculateDDay('D-day', base);
  assert.equal(exp2.status, 'warning');

  // Date parsing
  const pastDate = calculateDDay('2026-10-20', base);
  assert.equal(pastDate.status, 'expired');
  assert.ok(pastDate.daysRemaining !== null && pastDate.daysRemaining < 0);

  const todayDate = calculateDDay('2026-10-23', base);
  assert.equal(todayDate.status, 'warning');
  assert.equal(todayDate.daysRemaining, 0);

  const nearFutureDate = calculateDDay('2026-10-25', base);
  assert.equal(nearFutureDate.status, 'warning');
  assert.equal(nearFutureDate.daysRemaining, 2);

  const farFutureDate = calculateDDay('2026-11-10', base);
  assert.equal(farFutureDate.status, 'fresh');
  assert.ok(farFutureDate.daysRemaining !== null && farFutureDate.daysRemaining > 3);
});

test('generateCoupangSearchUrl encodes queries cleanly without parentheses clutter', () => {
  const url1 = generateCoupangSearchUrl('친환경 양파 1kg');
  assert.equal(
    url1,
    'https://www.coupang.com/np/search?component=&q=%EC%B9%9C%ED%99%98%EA%B2%BD%20%EC%96%91%ED%8C%8C%201kg'
  );

  const url2 = generateCoupangSearchUrl('생생 대파 (1단)');
  assert.ok(url2.includes('q=%EC%83%9D%EC%83%9D%20%EB%8C%80%ED%8C%8C'));
});

test('formatTimer formats seconds into mm:ss string', () => {
  assert.equal(formatTimer(0), '00:00');
  assert.equal(formatTimer(65), '01:05');
  assert.equal(formatTimer(300), '05:00');
  assert.equal(formatTimer(632), '10:32');
});

test('extractMinutesFromStep finds minute notations accurately', () => {
  assert.equal(extractMinutesFromStep('달궈진 팬에 기름을 두르고 5분간 볶아줍니다.'), 5);
  assert.equal(extractMinutesFromStep('중불에서 12분 정도 푹 끓여 깊은 맛을 냅니다.'), 12);
  assert.equal(extractMinutesFromStep('모든 재료를 그릇에 담아 완성합니다.'), null);
});

test('normalizeFridgeResponse safely fills missing properties and produces valid structure', () => {
  const base = new Date('2026-10-23T12:00:00Z');
  const rawInput = {
    parsedIngredients: [
      { name: '두부', expiryDate: '2026-10-24', status: 'warning' },
      { name: '대파', expiryDate: '2026-11-01', status: 'fresh' },
    ],
    recipes: {
      urgentRecipe: {
        title: '두부 조림',
        usedExpiringIngredients: ['두부'],
        ingredients: ['두부 1모', '간장 2스푼'],
        steps: ['두부를 썬다', '조린다'],
      },
      alternativeRecipe: {
        title: '대파 볶음밥',
        ingredients: ['대파 1단', '밥 1공기'],
        steps: ['대파 기름을 낸다', '밥을 볶는다'],
      },
      expansionRecipes: [
        {
          title: '마파두부 덮밥',
          currentIngredientsUsed: ['두부', '대파'],
          missingIngredientsToBuy: ['돼지고기 다짐육 200g', '두반장'],
          briefSteps: '고기를 볶고 두반장과 두부를 넣어 끓인다.',
        },
      ],
    },
    shoppingList: [
      {
        item: '친환경 돼지고기 다짐육 300g',
        reason: '마파두부용 재료 추가 구매',
      },
    ],
  };

  const normalized = normalizeFridgeResponse(rawInput, base);

  assert.equal(normalized.parsedIngredients.length, 2);
  assert.equal(normalized.parsedIngredients[0].name, '두부');
  assert.ok(normalized.parsedIngredients[0].id.startsWith('ing-'));

  assert.equal(normalized.recipes.urgentRecipe.title, '두부 조림');
  assert.equal(normalized.recipes.alternativeRecipe.title, '대파 볶음밥');
  assert.equal(normalized.recipes.expansionRecipes.length, 1);
  assert.equal(normalized.shoppingList.length, 1);
  assert.ok(normalized.shoppingList[0].coupangUrl?.includes('coupang.com'));
});

test('getRecognizableIcon distinguishes standard vs unknown ingredients for Imagen illustration', async () => {
  const { getRecognizableIcon, generateStylizedFoodSvg } = await import('./ingredientIcons');

  // Recognizable standard ingredients
  const egg = getRecognizableIcon('신선란 4알');
  assert.equal(egg.recognized, true);
  assert.equal(egg.icon, '🥚');

  const pork = getRecognizableIcon('한돈 삼겹살 300g');
  assert.equal(pork.recognized, true);
  assert.equal(pork.icon, '🥩');

  const tofu = getRecognizableIcon('찌개용 두부 반모');
  assert.equal(tofu.recognized, true);
  assert.equal(tofu.icon, '🧊');

  // Unindexed / rare ingredients that lack standard icon -> trigger Imagen illustration
  const rareGrape = getRecognizableIcon('샤인머스캣 1송이');
  assert.equal(rareGrape.recognized, false);
  assert.equal(rareGrape.icon, null);

  const truffle = getRecognizableIcon('화이트 트러플 오일 50ml');
  assert.equal(truffle.recognized, false);
  assert.equal(truffle.icon, null);

  // Stylized SVG illustration generation
  const svgDataUrl = generateStylizedFoodSvg('샤인머스캣');
  assert.ok(svgDataUrl.startsWith('data:image/svg+xml;utf8,'));
  assert.ok(svgDataUrl.includes('%3Csvg'));
});

test('extractQuantityFromName extracts quantities with free units accurately', () => {
  const item1 = extractQuantityFromName('계란 5알');
  assert.equal(item1.cleanName, '계란');
  assert.equal(item1.quantity, '5알');

  const item2 = extractQuantityFromName('한돈 삼겹살 300g');
  assert.equal(item2.cleanName, '한돈 삼겹살');
  assert.equal(item2.quantity, '300g');

  const item3 = extractQuantityFromName('찌개두부 1모');
  assert.equal(item3.cleanName, '찌개두부');
  assert.equal(item3.quantity, '1모');

  const item4 = extractQuantityFromName('대파 1단');
  assert.equal(item4.cleanName, '대파');
  assert.equal(item4.quantity, '1단');
});

test('calculateRemainingQuantity correctly deducts stock (e.g. 5개 from 2 used -> 3개)', () => {
  // Case from user prompt: 계란 5개에서 2개 사용 -> 3개 재고
  const res1 = calculateRemainingQuantity('5개', 2);
  assert.equal(res1.remaining, '3개');
  assert.equal(res1.isDepleted, false);
  assert.equal(res1.remainingNumber, 3);

  // Partial usage with grams
  const res2 = calculateRemainingQuantity('500g', 200);
  assert.equal(res2.remaining, '300g');
  assert.equal(res2.isDepleted, false);

  // Full depletion
  const res3 = calculateRemainingQuantity('2봉', 2);
  assert.equal(res3.remaining, '0봉');
  assert.equal(res3.isDepleted, true);
  assert.equal(res3.remainingNumber, 0);

  // Over-usage
  const res4 = calculateRemainingQuantity('1모', 3);
  assert.equal(res4.remaining, '0모');
  assert.equal(res4.isDepleted, true);
});


