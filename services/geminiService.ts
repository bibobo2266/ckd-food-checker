import { GoogleGenAI, Type } from '@google/genai';
import { Flag } from '../types';
import type { FoodData } from '../types';

const METRIC_LABELS = [
    "Phosphorus (mg)",
    "Phosphorus-to-protein ratio (mg/g)",
    "Potassium (mg)",
    "Sodium (mg)",
    "Purine content",
    "PRAL score",
    "Digestibility / NPU",
    "Nitrogen burden / renal load",
    "Oxalate content",
    "Fluid / volume load",
    "Processing level",
    "Kidney handling"
];

const EXPLANATION_KEYS = [
    "EXPLANATION_PHOSPHORUS",
    "EXPLANATION_PHOSPHORUS_PROTEIN_RATIO",
    "EXPLANATION_POTASSIUM",
    "EXPLANATION_SODIUM",
    "EXPLANATION_PURINE",
    "EXPLANATION_PRAL",
    "EXPLANATION_DIGESTIBILITY",
    "EXPLANATION_NITROGEN",
    "EXPLANATION_OXALATE",
    "EXPLANATION_FLUID",
    "EXPLANATION_PROCESSING",
    "EXPLANATION_HANDLING",
    "EXPLANATION_DEFAULT"
];

const SAFER_WAYS_KEYS = [
    "TIP_BOIL_WATER",
    "TIP_LOW_SODIUM",
    "TIP_SMALLEST_AMOUNT",
    "TIP_AVOID_HIGH_POTASSIUM_COMBO",
    "TIP_PORTION_CONTROL",
    "TIP_DISCARD_LIQUID",
    "TIP_RINSE_CANNED_GOODS",
    "TIP_CHOOSE_FRESH"
];

const responseSchema: any = {
    type: Type.OBJECT,
    properties: {
        foodName: { type: Type.STRING, description: "The common name of the food that was analyzed." },
        servingSize: { type: Type.STRING, description: "The base serving size, which must always be '100g'." },
        dataSource: { type: Type.STRING, description: "The single, primary database used for nutritional information. If it's a supplement, mark as 'Label-based estimate'." },
        overallFlag: {
            type: Type.STRING,
            enum: ['OK', 'CAUTION', 'LIMIT'],
            description: "The most severe flag among all metrics, with the hierarchy LIMIT > CAUTION > OK."
        },
        source_confidence: {
            type: Type.STRING,
            enum: ['high', 'low'],
            description: "Set to 'low' if the match is approximate (e.g., street food), otherwise 'high'."
        },
        notes: {
            type: Type.STRING,
            description: "An optional note, especially for low-confidence results, e.g., 'Values are approximate due to regional/vendor variations. Portion control is key.'"
        },
        typicalServingSize: {
            type: Type.NUMBER,
            description: "The typical serving size in GRAMS for this food. Examples: onigiri 120, 滷肉飯 250, bibimbap 350, nasi goreng 300. If not applicable (like 'salt'), omit this field."
        },
        saferWays: {
            type: Type.ARRAY,
            description: `An array of 2-4 relevant safety tip KEYS from this list: ${SAFER_WAYS_KEYS.join(', ')}.`,
            items: { type: Type.STRING }
        },
        metrics: {
            type: Type.ARRAY,
            description: `An array of 12 metric objects, based on a 100g serving, in the exact order: ${METRIC_LABELS.join(', ')}`,
            items: {
                type: Type.OBJECT,
                properties: {
                    label: { type: Type.STRING, description: "The name of the metric." },
                    value: { type: Type.STRING, description: "The numerical value with units for a 100g serving, or 'N/A'." },
                    flag: { type: Type.STRING, enum: ['OK', 'CAUTION', 'LIMIT'], description: "A flag based on CKD dietary guidelines for a 100g serving." },
                    explanation: { type: Type.STRING, description: `A translation key for the explanation, chosen from this list: ${EXPLANATION_KEYS.join(', ')}.` }
                },
                required: ["label", "value", "flag", "explanation"]
            }
        }
    },
    required: ["foodName", "servingSize", "dataSource", "overallFlag", "source_confidence", "metrics"]
};


export const fetchFoodData = async (foodQuery: string, uiLang: string): Promise<FoodData> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set. Please add VITE_API_KEY to your Vercel project settings.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
    Analyze the food or supplement item "${foodQuery}" for a Chronic Kidney Disease (CKD) patient. The user's UI language is "${uiLang}". Your task is to act as an expert multilingual nutritional API. Return all nutrient data based on a **100g serving**.

    CRITICAL: For 'explanation' and 'saferWays' fields, you MUST return the corresponding KEY from the lists provided in the schema description, NOT a full sentence.

    Resolution & Analysis Rules:
    1.  **Identify Type:** Is this a food or a supplement (e.g., capsule, powder, drink mix, herbal extract)?
    2.  **Resolve Food Query:** Identify the item using aliases as a guide:
        *   **TW:** 滷肉飯 (250g), 飯糰 (120g), 乾麵 (300g)
        *   **HK:** 叉燒飯 (350g), 艇仔粥 (300g)
        *   **JP:** 秋刀魚 (150g), うどん (300g), おにぎり (120g)
        *   **KR:** 김치 (50g), 떡볶이 (200g), 비빔밥 (350g)
        *   **TH:** pad kra pao (300g), pad thai (300g)
        *   **ID:** nasi goreng (300g), mie goreng (300g), rendang (150g)
    3.  **Database Priority:** Search for nutritional data in this exact order: 1. Taiwan TFDA -> 2. HK CFS -> 3. Korea RDA -> 4. Japan Food Tables -> 5. Thai/ID public tables -> 6. Fallback: USDA FoodData Central / NIH ODS.
    4.  **Confidence & Notes:** If the match is an approximation (e.g., street food), set 'source_confidence' to 'low' and add a 'notes' field. Otherwise, 'high'.
    5.  **Typical Serving Size:** Provide a 'typicalServingSize' in grams if applicable, using the examples above as a guide.
    
    Evaluation Rules (for 100g serving):
    1.  Evaluate against these 12 metrics in this exact order: ${METRIC_LABELS.join(', ')}.
    2.  If it's a **supplement**:
        *   Apply **stricter flags**. Any added phosphorus (e.g., phosphate additives) or potassium salts (e.g., potassium chloride) should be flagged 'LIMIT'.
        *   Mark 'dataSource' as "Label-based estimate".
        *   Be extra cautious with herbal ingredients known to affect kidneys.
    3.  If a value is missing, return 'N/A' and continue.
    4.  Determine an 'overallFlag' which must be the most severe flag (LIMIT > CAUTION > OK).
    5.  **Generate Safety Tip KEYS:** Provide 2-4 relevant KEYs for the 'saferWays' array from the allowed list in the schema. For a high potassium food, return 'TIP_BOIL_WATER'. For high sodium, return 'TIP_LOW_SODIUM'.
    6.  **Generate Explanation KEYS:** For each metric, provide the corresponding KEY for the 'explanation' field from the allowed list.

    Return your entire response as a single, valid JSON object that adheres to the provided schema. Do not include any text or markdown outside the JSON object.
  `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        },
    });
    
    const jsonText = response.text.trim();
    try {
        const data: FoodData = JSON.parse(jsonText);
        // Ensure metrics are in the correct order, as Gemini might sometimes reorder them.
        data.metrics.sort((a, b) => METRIC_LABELS.indexOf(a.label) - METRIC_LABELS.indexOf(b.label));
        return data;
    } catch (e) {
        console.error("Failed to parse Gemini JSON response:", jsonText);
        throw new Error("The response from the AI was not in the expected format.");
    }
};

// ... (analyzeImage function remains the same)
export const analyzeImage = async (imageFile: File): Promise<FoodData> => {
    console.log("Uploaded file:", imageFile.name, imageFile.type);
    if (!imageFile.type.startsWith('image/')) {
        throw new Error("Invalid file type. Please upload an image.");
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
    return {
        foodName: "Scanned Item (Dummy)",
        servingSize: "100g",
        dataSource: "OCR Placeholder",
        overallFlag: Flag.CAUTION,
        source_confidence: 'high',
        notes: "This is a placeholder response for the OCR feature.",
        metrics: METRIC_LABELS.map(label => ({
            label,
            value: "N/A",
            flag: Flag.CAUTION,
            explanation: "EXPLANATION_DEFAULT"
        }))
    };
};