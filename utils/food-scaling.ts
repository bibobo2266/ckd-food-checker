import { FoodData, Flag, Metric } from '../types';

// Simplified thresholds for re-calculating flags based on portion size.
// These are illustrative; a real app would need clinically validated thresholds.
const THRESHOLDS = {
    'Phosphorus (mg)': { caution: 150, limit: 250 },
    'Potassium (mg)': { caution: 250, limit: 400 },
    'Sodium (mg)': { caution: 200, limit: 400 },
    // P/P ratio is independent of portion size so it's not needed here
};

const recalculateFlag = (label: string, value: number): Flag => {
    const limits = THRESHOLDS[label as keyof typeof THRESHOLDS];
    if (!limits) return Flag.OK; // Default for metrics without defined thresholds

    if (value >= limits.limit) return Flag.LIMIT;
    if (value >= limits.caution) return Flag.CAUTION;
    return Flag.OK;
};

const getWorstFlag = (metrics: Metric[]): Flag => {
    const flags = metrics.map(m => m.flag);
    if (flags.includes(Flag.LIMIT)) return Flag.LIMIT;
    if (flags.includes(Flag.CAUTION)) return Flag.CAUTION;
    return Flag.OK;
};

export const scaleFoodData = (baseData: FoodData, newPortion: number): FoodData => {
    const scalingFactor = newPortion / 100;

    const scaledMetrics = baseData.metrics.map(metric => {
        const originalValue = parseFloat(metric.value);

        if (isNaN(originalValue) || metric.label === 'Phosphorus-to-protein ratio (mg/g)') {
            // Return metric as is if value is "N/A" or it's a ratio
            return { ...metric };
        }

        const scaledValue = originalValue * scalingFactor;
        
        let newFlag = metric.flag;
        if (Object.keys(THRESHOLDS).includes(metric.label)) {
            newFlag = recalculateFlag(metric.label, scaledValue);
        }

        return {
            ...metric,
            value: scaledValue.toFixed(0), // Show scaled value as a whole number
            flag: newFlag,
        };
    });

    const newOverallFlag = getWorstFlag(scaledMetrics);

    return {
        ...baseData,
        servingSize: `${newPortion}g`,
        metrics: scaledMetrics,
        overallFlag: newOverallFlag,
    };
};