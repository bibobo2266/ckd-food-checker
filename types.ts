export enum Flag {
  OK = 'OK',
  CAUTION = 'CAUTION',
  LIMIT = 'LIMIT',
}

export interface Metric {
  label: string;
  value: string;
  flag: Flag;
  explanation: string;
}

export interface FoodData {
  foodName: string;
  servingSize: string; // This is the base serving size, e.g., "100g"
  dataSource: string;
  overallFlag: Flag;
  metrics: Metric[];
  source_confidence: 'high' | 'low';
  notes?: string;
  typicalServingSize?: number; // e.g., 250 for "250g"
  saferWays?: string[];
}