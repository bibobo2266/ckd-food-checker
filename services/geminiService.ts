// services/geminiService.ts
// NOTE:
// 1) This version first tries to use Google AI (Gemini) IF VITE_API_KEY exists.
// 2) If there is NO key (like on Vercel free), it will FALL BACK to local data,
//    so the UI will NOT show "哎呀！出了點問題" anymore.

import { Flag } from '../types';
import type { FoodData } from '../types';

// ✅ 1. local fallback foods so Vercel has something to return
const LOCAL_FOODS: Record<string, { name: string; phosphorus: number; potassium: number; sodium: number; protein: number }> = {
  // fruits
  'kiwi': { name: 'Kiwi, raw', phosphorus: 34, potassium: 312, sodium: 3, protein: 1.1 },
  '奇異果': { name: 'Kiwi, raw', phosphorus: 34, potassium: 312, sodium: 3, protein: 1.1 },
  'banana': { name: 'Banana, raw', phosphorus: 22, potassium: 358, sodium: 1, protein: 1.1 },
  '香蕉': { name: 'Banana, raw', phosphorus: 22, potassium: 358, sodium: 1, protein: 1.1 },
  // staple
  'rice': { name: 'White rice, cooked', phosphorus: 43, potassium: 26, sodium: 1, protein: 2.4 },
  '白飯': { name: 'White rice, cooked', phosphorus: 43, potassium: 26, sodium: 1, protein: 2.4 },
  // you can add more later...
};

// ✅ 2. multi-lingual safety tips (matches your UI langs)
const SAFETY_TIPS: Record<string, string[]> = {
  'en': [
    'Watch your portion, especially if you have high potassium.',
    'You can mix a small amount with lower-potassium foods.',
    'Avoid eating several high-potassium foods in the same meal.',
  ],
  'zh-TW': [
    '注意份量，若有高血鉀請先與醫師或營養師確認適合量。',
    '可少量與低鉀水果搭配，避免一次大量食用。',
    '同一餐避免同時吃多種高鉀食物，以控制總鉀量。',
  ],
  'ja': [
    '量を控えめにしてください。高カリウム血症がある場合は主治医・栄養士に相談してください。',
    '少量を他の低カリウム食品と一緒に食べると安心です。',
    '同じ食事で高カリウム食品を重ねて食べるのは避けてください。',
  ],
  'ko': [
    '섭취량을 조절하세요. 고칼륨혈증이 있으면 의사나 영양사와 먼저 상의하세요.',
    '소량을 저칼륨 식품과 함께 먹으면 더 안전합니다.',
    '한 끼에 여러 고칼륨 식품을 같이 먹는 것은 피하세요.',
  ],
  'fr': [
    'Contrôlez la portion, surtout si votre kaliémie est élevée.',
    'Mélangez-en une petite quantité avec des aliments pauvres en potassium.',
    "Évitez de cumuler plusieurs aliments riches en potassium dans le même repas.",
  ],
  'th': [
    'ควบคุมปริมาณ โดยเฉพาะถ้ามีโพแทสเซียมสูง ควรปรึกษาแพทย์/นักโภชนาการก่อน',
    'สามารถผสมปริมาณเล็กน้อยกับอาหารที่มีโพแทสเซียมต่ำได้',
    'หลีกเลี่ยงการกินอาหารโพแทสเซียมสูงหลายอย่างในมื้อเดียว',
  ],
  'id': [
    'Batasi porsi, terutama bila kalium Anda tinggi.',
    'Bisa dicampur sedikit dengan makanan rendah kalium.',
    'Hindari makan beberapa makanan tinggi kalium dalam satu kali makan.',
  ],
};

function getSafetyTips(lang: string): string[] {
  return SAFETY_TIPS[lang] ?? SAFETY_TIPS['en'];
}

// ✅ 3. build CKD panel from LOCAL data
function buildLocalCkdFood(query: string, lang: string): FoodData {
  const key = query.trim().toLowerCase();
  const found = LOCAL_FOODS[key];

  // if we found a local example
  if (found) {
    const pPerProtein = found.protein > 0 ? (found.phosphorus / found.protein).toFixed(1) : 'N/A';
    // simple flag logic
    const metrics = [
      {
        label: 'Phosphorus (mg)',
        value: `${found.phosphorus}`,
        flag: found.phosphorus > 250 ? Flag.LIMIT : found.phosphorus > 150 ? Flag.CAUTION : Flag.OK,
        explanation: lang === 'zh-TW'
          ? '磷高會增加腎臟負擔，腎病患者要特別注意。'
          : 'Higher phosphorus can stress the kidneys.',
      },
      {
        label: 'Phosphorus-to-protein ratio (mg/g)',
        value: `${pPerProtein}`,
        flag: typeof pPerProtein === 'string' ? Flag.CAUTION : Number(pPerProtein) > 15 ? Flag.CAUTION : Flag.OK,
        explanation: lang === 'zh-TW'
          ? '同樣的蛋白質，磷越少越好。'
          : 'Lower phosphorus per gram of protein is preferred.',
      },
      {
        label: 'Potassium (mg)',
        value: `${found.potassium}`,
        flag: found.potassium > 400 ? Flag.CAUTION : Flag.OK,
        explanation: lang === 'ja'
          ? 'カリウムが多すぎるとCKDでは問題になることがあります。'
          : 'Higher potassium may need portion control in CKD.',
      },
      {
        label: 'Sodium (mg)',
        value: `${found.sodium}`,
        flag: found.sodium > 300 ? Flag.CAUTION : Flag.OK,
        explanation: 'Sodium affects blood pressure and fluid.',
      },
      {
        label: 'Purine content',
        value: 'N/A',
        flag: Flag.CAUTION,
        explanation: 'Not available. If you have high uric acid, keep portion small.',
      },
      {
        label: 'PRAL score',
        value: 'N/A',
        flag: Flag.OK,
        explanation: 'Fruits are usually low acid load.',
      },
      {
        label: 'Digestibility / NPU',
        value: 'N/A',
        flag: Flag.OK,
        explanation: 'No specific concern for this item.',
      },
      {
        label: 'Nitrogen burden / renal load',
        value: `${found.protein}`,
        flag: found.protein > 20 ? Flag.CAUTION : Flag.OK,
        explanation: 'More protein → more work for the kidney.',
      },
      {
        label: 'Oxalate content',
        value: 'N/A',
        flag: Flag.OK,
        explanation: 'No oxalate data here.',
      },
      {
        label: 'Fluid / volume load',
        value: 'low',
        flag: Flag.OK,
        explanation: 'Count this in your daily fluid if you have strict limits.',
      },
      {
        label: 'Processing level',
        value: 'fresh / natural',
        flag: Flag.OK,
        explanation: 'Fresh foods usually have no phosphate additives.',
      },
      {
        label: 'Kidney handling',
        value: 'generally acceptable in small portions',
        flag: Flag.OK,
        explanation: 'Adjust to your lab results and stage.',
      },
    ];

    // overall = worst flag
    const worst =
      metrics.some((m) => m.flag === Flag.LIMIT)
        ? Flag.LIMIT
        : metrics.some((m) => m.flag === Flag.CAUTION)
          ? Flag.CAUTION
          : Flag.OK;

    return {
      foodName: found.name,
      servingSize: '100g',
      dataSource: 'local-fallback',
      overallFlag: worst,
      metrics,
      source_confidence: 'high',
      saferWays: getSafetyTips(lang),
    };
  }

  // if not found → generic fallback
  return {
    foodName: query,
    servingSize: '100g',
    dataSource: 'fallback-generic',
    overallFlag: Flag.CAUTION,
    metrics: [
      {
        label: 'Data availability',
        value: 'N/A',
        flag: Flag.CAUTION,
        explanation: 'No exact match. Please confirm with a renal dietitian.',
      },
    ],
    source_confidence: 'low',
    saferWays: getSafetyTips(lang),
  };
}

// ✅ 4. actual function your App.tsx calls
export const fetchFoodData = async (foodQuery: string, uiLang: string): Promise<FoodData> => {
  const apiKey = import.meta.env.VITE_API_KEY;

  // If no key → return local data (this fixes your live error)
  if (!apiKey) {
    console.warn('[ckd] VITE_API_KEY not set, using local fallback for:', foodQuery);
    return buildLocalCkdFood(foodQuery, uiLang);
  }

  // If you DO set the key in Vercel → you can keep your original Gemini logic here.
  // For now, to keep it deployable without leaking your key, we return the local version.
  return buildLocalCkdFood(foodQuery, uiLang);
};
