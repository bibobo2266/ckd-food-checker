import { findLocalFood } from './localFoodDb';

// services/geminiService.ts
// v5 – USDA supports labelNutrients (for branded / flavored items)
import { Flag } from '../types';
import type { FoodData } from '../types';


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
    'If you are on potassium or phosphorus restriction, confirm with your renal dietitian.',
    'This is not medical advice.',
  ],
  'zh-TW': [
    '以 100g 份量推估，實際請依個人攝取量調整。',
    '若有鉀/磷限制，請先與腎臟科醫師或營養師確認。',
    '本結果不取代醫療建議。',
  ],
  'ja': [
    '100g を基準にしています。実際の量に合わせてください。',
    'カリウムやリンの制限がある場合は主治医・栄養士に相談してください。',
    'これは医療的助言ではありません。',
  ],
  'ko': [
    '100g 기준입니다. 실제 섭취량에 맞춰 조절하세요.',
    '칼륨/인 제한이 있으면 먼저 전문가와 상담하세요.',
    '의료 조언이 아닙니다.',
  ],
  'fr': [
    'Basé sur 100 g. Adaptez à votre portion.',
    'En cas de restriction K/P, consultez votre diététicien(ne).',
    "Ceci n'est pas un avis médical.",
  ],
  'th': [
    'อ้างอิง 100 กรัม กรุณาปรับตามปริมาณที่ทานจริง',
    'ถ้าต้องจำกัดโพแทสเซียมหรือฟอสฟอรัส ให้ปรึกษาผู้เชี่ยวชาญ',
    'ไม่ใช่คำแนะนำทางการแพทย์',
  ],
  'id': [
    'Berdasarkan 100 g. Sesuaikan dengan porsi Anda.',
    'Kalau ada batas K/P, konsultasikan dulu.',
    'Ini bukan nasihat medis.',
  ],
};

function getSafety(lang: string) {
  return SAFETY[lang] ?? SAFETY['en'];
}

const USDA_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const USDA_FOOD_URL = 'https://api.nal.usda.gov/fdc/v1/food/';

// helper: read labelNutrients if present
function readFromLabelNutrients(labelNutrients: any) {
  if (!labelNutrients) return {};
  return {
    protein: labelNutrients.protein ? Number(labelNutrients.protein.value || 0) : 0,
    phosphorus: labelNutrients.phosphorus ? Number(labelNutrients.phosphorus.value || 0) : 0,
    potassium: labelNutrients.potassium ? Number(labelNutrients.potassium.value || 0) : 0,
    sodium: labelNutrients.sodium ? Number(labelNutrients.sodium.value || 0) : 0,
  };
}

// ---- nutrient numbers (USDA) ----
// 203 = Protein
// 305 = Phosphorus
// 306 = Potassium
// 307 = Sodium
function pickNutrientByName(n: any, wantedLower: string) {
  if (n.nutrientName && typeof n.nutrientName === 'string') {
    if (n.nutrientName.toLowerCase().includes(wantedLower)) {
      return Number(n.value ?? n.amount ?? 0);
    }
  }
  if (n.nutrient && typeof n.nutrient.name === 'string') {
    if (n.nutrient.name.toLowerCase().includes(wantedLower)) {
      return Number(n.amount ?? n.value ?? 0);
    }
  }
  return null;
}

function pickNutrientByNumber(n: any, wantedNumber: string) {
  if (n.nutrient && n.nutrient.number === wantedNumber) {
    return Number(n.amount ?? n.value ?? 0);
  }
  return null;
}

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

  // 1) search
  const searchResp = await fetch(
    `${USDA_SEARCH_URL}?api_key=${key}&query=${encodeURIComponent(name)}&pageSize=1`,
  );
  if (!searchResp.ok) {
    console.warn('[ckd] USDA search failed:', searchResp.status);
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
    console.warn('[ckd] USDA detail failed:', foodResp.status);
    return null;
  }
  const foodJson = await foodResp.json();

  // --- A. try labelNutrients first (branded / flavored)
  const ln = readFromLabelNutrients(foodJson.labelNutrients);
  let protein = ln.protein || 0;
  let phosphorus = ln.phosphorus || 0;
  let potassium = ln.potassium || 0;
  let sodium = ln.sodium || 0;

  // --- B. then try foodNutrients (generic)
  const nutrients: any[] = foodJson.foodNutrients || [];
  for (const n of nutrients) {
    const p1 = pickNutrientByName(n, 'protein');
    if (p1 !== null && protein === 0) protein = p1;

    const p2 = pickNutrientByName(n, 'phosphorus');
    if (p2 !== null && phosphorus === 0) phosphorus = p2;

    const p3 = pickNutrientByName(n, 'potassium');
    if (p3 !== null && potassium === 0) potassium = p3;

    const p4 = pickNutrientByName(n, 'sodium');
    if (p4 !== null && sodium === 0) sodium = p4;

    const pn = pickNutrientByNumber(n, '203');
    if (pn !== null && protein === 0) protein = pn;
    const phn = pickNutrientByNumber(n, '305');
    if (phn !== null && phosphorus === 0) phosphorus = phn;
    const kkn = pickNutrientByNumber(n, '306');
    if (kkn !== null && potassium === 0) potassium = kkn;
    const sn = pickNutrientByNumber(n, '307');
    if (sn !== null && sodium === 0) sodium = sn;
  }

  console.log('[ckd] USDA parsed:', {
    name: foodJson.description || name,
    protein,
    phosphorus,
    potassium,
    sodium,
  });

  if (protein === 0 && phosphorus === 0 && potassium === 0 && sodium === 0) {
    console.warn('[ckd] USDA returned but all 0 → will fallback');
    return null;
  }

  return {
    name: foodJson.description || name,
    protein,
    phosphorus,
    potassium,
    sodium,
  };
}

// ---- build CKD panel ----
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
          ? '磷會隨腎功能下降而堆積，請控制份量。'
          : 'Phosphorus can build up in CKD, control the portion.',
    },
    {
      label: 'Phosphorus-to-protein ratio (mg/g)',
      value: `${pPerG}`,
      flag: typeof pPerG === 'number' && pPerG > 15 ? Flag.CAUTION : Flag.OK,
      explanation: 'Lower phosphorus per gram of protein is better for CKD.',
    },
    {
      label: 'Potassium (mg)',
      value: `${base.potassium}`,
      flag: base.potassium > 400 ? Flag.CAUTION : Flag.OK,
      explanation: 'If you have high potassium, keep the portion small.',
    },
    {
      label: 'Sodium (mg)',
      value: `${base.sodium}`,
      flag: base.sodium > 300 ? Flag.CAUTION : Flag.OK,
      explanation: 'Sodium affects blood pressure and fluid.',
    },
    {
      label: 'Purine content',
      value: 'N/A',
      flag: Flag.CAUTION,
      explanation: 'Purine not specified. If uric acid is high, limit.',
    },
    {
      label: 'PRAL score',
      value: 'N/A',
      flag: Flag.OK,
      explanation: 'Acid load not estimated here.',
    },
    {
      label: 'Digestibility / NPU',
      value: 'N/A',
      flag: Flag.OK,
      explanation: 'No specific digestibility concern identified.',
    },
    {
      label: 'Nitrogen burden / renal load',
      value: `${base.protein}`,
      flag: base.protein > 20 ? Flag.CAUTION : Flag.OK,
      explanation: 'More protein = more kidney work.',
    },
    {
      label: 'Oxalate content',
      value: 'N/A',
      flag: Flag.OK,
      explanation: 'No oxalate concern reported.',
    },
    {
      label: 'Fluid / volume load',
      value: 'depends on portion',
      flag: Flag.OK,
      explanation: 'Count liquid foods in daily fluid if restricted.',
    },
    {
      label: 'Processing level',
      value: source === 'usda' ? 'processed / check additives' : 'fresh / simple',
      flag: Flag.OK,
      explanation: 'For packaged foods, check for phosphate/potassium additives.',
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
    servingSize: '(Based on 100g serving from ' + source + ')',
    dataSource: source,
    overallFlag: worst,
    metrics,
    source_confidence: source === 'usda' ? 'high' : 'medium',
    saferWays: getSafety(lang),
  };
}

// ---- public entry ----
export const fetchFoodData = async (foodQuery: string, uiLang: string): Promise<FoodData> => {
  const q = foodQuery.trim();
  if (!q) {
    return buildCkdPanel(LOCAL_TEMPLATES.veg, uiLang, 'local-empty');
  }

  // 0) try local Asia CSV first
  try {
    const localHit = await findLocalFood(q);
    if (localHit) {
      return buildCkdPanel(
        {
          name: localHit.name,
          protein: localHit.protein,
          phosphorus: localHit.phosphorus,
          potassium: localHit.potassium,
          sodium: localHit.sodium,
        },
        uiLang,
        localHit.source || 'local-asia',
      );
    }
  } catch (e) {
    console.warn('[ckd] local CSV lookup failed:', e);
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

  // 2) fallback template
  const lower = q.toLowerCase();
  let tpl = LOCAL_TEMPLATES.veg;
  if (lower.includes('milk') || lower.includes('奶')) tpl = LOCAL_TEMPLATES.milk_whole;
  else if (lower.includes('soy') || lower.includes('豆漿')) tpl = LOCAL_TEMPLATES.soy_milk;
  else if (lower.includes('onion') || lower.includes('洋蔥')) tpl = LOCAL_TEMPLATES.onion;
  else if (lower.includes('rice') || lower.includes('飯')) tpl = LOCAL_TEMPLATES.rice;
  else if (lower.includes('kiwi') || lower.includes('奇異果')) tpl = LOCAL_TEMPLATES.fruit_generic;

  console.warn('[ckd] using fallback template for:', q);
  return buildCkdPanel(tpl, uiLang, 'local-fallback');
};
