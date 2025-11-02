// services/geminiService.ts
// v3 – try USDA first → then fallback to local CKD templates
// this is for Vite/React, so we read env via import.meta.env

import { Flag } from '../types';
import type { FoodData } from '../types';

// ---------- 0. small local templates (last resort) ----------
const LOCAL_TEMPLATES = {
  fruit_generic: { name: 'Generic fruit', protein: 0.8, phosphorus: 20, potassium: 150, sodium: 2 },
  milk_whole: { name: 'Cow milk, whole', protein: 3.3, phosphorus: 95, potassium: 150, sodium: 44 },
  soy_milk: { name: 'Soy milk, unsweetened', protein: 3.1, phosphorus: 50, potassium: 130, sodium: 40 },
  onion: { name: 'Onion, red / purple', protein: 1.0, phosphorus: 29, potassium: 146, sodium: 4 },
  rice: { name: 'White rice, cooked', protein: 2.4, phosphorus: 43, potassium: 26, sodium: 1 },
  veg: { name: 'Low-K vegetable, boiled', protein: 1.5, phosphorus: 30, potassium: 120, sodium: 15 },
};

const SAFETY: Record<string, string[]> = {
  'en': [
    'Based on 100 g. Adjust to your usual portion.',
    'If you are on K/P restriction, confirm with your renal dietitian.',
    'This is not medical advice.',
  ],
  'zh-TW': [
    '以 100g 份量推估，實際請依個人攝取量調整。',
    '若有鉀/磷限制，請先與腎臟科醫師或營養師確認。',
    '非醫療建議。',
  ],
  'ja': [
    '100g を基準にしています。実際の量に合わせてください。',
    'カリウムやリンの制限がある場合は主治医・栄養士に相談してください。',
    'これは医療的助言ではありません。',
  ],
  'ko': [
    '100g 기준입니다. 실제 섭취량에 맞춰 조절하세요.',
    '칼륨/인 제한이 있으면 먼저 전문가와 상의하세요.',
    '의료 조언이 아닙니다.',
  ],
  'fr': [
    'Basé sur 100 g. Adaptez à votre portion.',
    'En cas de restriction K/P, voir votre diététicien(ne) rénal(e).',
    'Ceci n’est pas un avis médical.',
  ],
  'th': [
    'อ้างอิง 100 กรัม ปรับตามที่ทานจริง',
    'ถ้ามีการจำกัดโพแทสเซียมหรือฟอสฟอรัส ให้ปรึกษาผู้เชี่ยวชาญ',
    'ไม่ใช่คำแนะนำทางการแพทย์',
  ],
  'id': [
    'Berdasarkan 100 g. Sesuaikan dengan porsi Anda.',
    'Kalau ada batas K/P, konsultasi dulu.',
    'Bukan nasihat medis.',
  ],
};

function getSafety(lang: string) {
  return SAFETY[lang] ?? SAFETY['en'];
}

// ---------- 1. USDA helpers ----------

const USDA_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const USDA_FOOD_URL = 'https://api.nal.usda.gov/fdc/v1/food/';

async function fetchFromUSDA(name: string): Promise<null | {
  name: string;
  protein: number;
  phosphorus: number;
  potassium: number;
  sodium: number;
}> {
  const key = import.meta.env.VITE_USDA_API_KEY;
  if (!key) {
    console.warn('[ckd] USDA key missing, skipping USDA fetch');
    return null;
  }

  try {
    // 1) search
    const searchResp = await fetch(
      `${USDA_SEARCH_URL}?api_key=${key}&query=${encodeURIComponent(name)}&pageSize=1`
    );
    if (!searchResp.ok) {
      console.warn('[ckd] USDA search failed:', searchResp.status, await searchResp.text());
      return null;
    }
    const searchJson = await searchResp.json();
    if (!searchJson.foods || !searchJson.foods.length) {
      console.warn('[ckd] USDA no foods found for:', name);
      return null;
    }
    const fdcId = searchJson.foods[0].fdcId;

    // 2) detail
    const foodResp = await fetch(`${USDA_FOOD_URL}${fdcId}?api_key=${key}`);
    if (!foodResp.ok) {
      console.warn('[ckd] USDA detail failed:', foodResp.status, await foodResp.text());
      return null;
    }
    const foodJson = await foodResp.json();
    // nutrients array
    const nutrients = foodJson.foodNutrients || [];

    const get = (n: string) => {
      const found = nutrients.find((x: any) => x.nutrientName?.toLowerCase().includes(n));
      return found ? Number(found.value) : 0;
    };

    const protein = get('protein');
    const phosphorus = get('phosphorus');
    const potassium = get('potassium');
    const sodium = get('sodium');

    console.log('[ckd] USDA hit:', name, { protein, phosphorus, potassium, sodium });

    return {
      name: foodJson.description || name,
      protein,
      phosphorus,
      potassium,
      sodium,
    };
  } catch (err) {
    console.warn('[ckd] USDA fetch error:', err);
    return null;
  }
}

// ---------- 2. local CKD panel builder ----------

function buildCkdPanel(
  base: { name: string; protein: number; phosphorus: number; potassium: number; sodium: number },
  lang: string,
  source: string,
): FoodData {
  const pPerG = base.protein > 0 ? +(base.phosphorus / base.protein).toFixed(1) : 'N/A';

  const metrics = [
    {
      label: 'Phosphorus (mg)',
      value: `${base.phosphorus}`,
      flag: base.phosphorus > 250 ? Flag.LIMIT : base.phosphorus > 150 ? Flag.CAUTION : Flag.OK,
      explanation:
        lang === 'zh-TW'
          ? '磷高會增加腎臟負擔，若有洗腎或晚期 CKD 請控制在醫師建議範圍。'
          : 'Higher phosphorus can stress kidneys. Keep within your prescribed range.',
    },
    {
      label: 'Phosphorus-to-protein ratio (mg/g)',
      value: `${pPerG}`,
      flag: typeof pPerG === 'number' && pPerG > 15 ? Flag.CAUTION : Flag.OK,
      explanation: 'Lower phosphorus per gram of protein is generally better in CKD.',
    },
    {
      label: 'Potassium (mg)',
      value: `${base.potassium}`,
      flag: base.potassium > 400 ? Flag.CAUTION : Flag.OK,
      explanation:
        lang === 'ja'
          ? '高カリウム血症がある場合は量を控えめにしてください。'
          : 'If you have high potassium, watch the portion.',
    },
    {
      label: 'Sodium (mg)',
      value: `${base.sodium}`,
      flag: base.sodium > 300 ? Flag.CAUTION : Flag.OK,
      explanation: 'Sodium affects blood pressure and fluid retention.',
    },
    {
      label: 'Purine content',
      value: 'N/A',
      flag: Flag.CAUTION,
      explanation: 'No purine data here. If you have high uric acid, keep the portion small.',
    },
    {
      label: 'PRAL score',
      value: 'N/A',
      flag: Flag.OK,
      explanation: 'Acid load is not estimated here for this item.',
    },
    {
      label: 'Digestibility / NPU',
      value: 'N/A',
      flag: Flag.OK,
      explanation: 'No specific digestibility issues identified.',
    },
    {
      label: 'Nitrogen burden / renal load',
      value: `${base.protein}`,
      flag: base.protein > 20 ? Flag.CAUTION : Flag.OK,
      explanation: 'More protein → more nitrogen → more renal processing.',
    },
    {
      label: 'Oxalate content',
      value: 'N/A',
      flag: Flag.OK,
      explanation: 'No oxalate concern reported for this item.',
    },
    {
      label: 'Fluid / volume load',
      value: 'depends on portion',
      flag: Flag.OK,
      explanation: 'Count this fluid if you are on a fluid-restricted plan.',
    },
    {
      label: 'Processing level',
      value: 'fresh / simple',
      flag: Flag.OK,
      explanation: 'Fresh foods usually have no phosphate additives.',
    },
    {
      label: 'Kidney handling',
      value: 'generally acceptable in controlled portions',
      flag: Flag.OK,
      explanation: 'Adjust to your CKD stage, labs, and diet plan.',
    },
  ];

  const worst = metrics.some((m) => m.flag === Flag.LIMIT)
    ? Flag.LIMIT
    : metrics.some((m) => m.flag === Flag.CAUTION)
      ? Flag.CAUTION
      : Flag.OK;

  return {
    foodName: base.name,
    servingSize: '(Based on 100g)',
    dataSource: source,
    overallFlag: worst,
    metrics,
    source_confidence: source === 'usda' ? 'high' : 'medium',
    saferWays: getSafety(lang),
  };
}

// ---------- 3. public function (the one App.tsx calls) ----------

export const fetchFoodData = async (foodQuery: string, uiLang: string): Promise<FoodData> => {
  const q = foodQuery.trim();
  if (!q) {
    return buildCkdPanel(LOCAL_TEMPLATES.veg, uiLang, 'local-empty');
  }

  // 1) try USDA
  const usda = await fetchFromUSDA(q);
  if (usda) {
    return buildCkdPanel(
      {
        name: usda.name,
        protein: usda.protein,
        phosphorus: usda.phosphorus,
        potassium: usda.potassium,
        sodium: usda.sodium,
      },
      uiLang,
      'usda',
    );
  }

  // 2) fallback: guess template by keyword
  const lower = q.toLowerCase();
  let tpl = LOCAL_TEMPLATES.veg;
  if (lower.includes('milk') || lower.includes('奶')) tpl = LOCAL_TEMPLATES.milk_whole;
  else if (lower.includes('soy') || lower.includes('豆漿')) tpl = LOCAL_TEMPLATES.soy_milk;
  else if (lower.includes('onion') || lower.includes('洋蔥')) tpl = LOCAL_TEMPLATES.onion;
  else if (lower.includes('rice') || lower.includes('飯')) tpl = LOCAL_TEMPLATES.rice;
  else if (lower.includes('kiwi') || lower.includes('奇異果')) tpl = LOCAL_TEMPLATES.fruit_generic;

  console.warn('[ckd] using fallback template for:', q);
  return buildCkdPanel(
    {
      name: tpl.name,
      protein: tpl.protein,
      phosphorus: tpl.phosphorus,
      potassium: tpl.potassium,
      sodium: tpl.sodium,
    },
    uiLang,
    'local-fallback',
  );
};
