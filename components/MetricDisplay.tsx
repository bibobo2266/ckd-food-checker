// FIX: Add missing React import to resolve JSX namespace error.
import React from 'react';
import type { Metric, Flag } from '../types';
import { Icons } from './Icons';
import { locales, Translation } from '../i18n';

interface MetricDisplayProps {
  metric: Metric;
  t: Translation;
}

const flagStyles: { [key in Flag]: { icon: JSX.Element, textClass: string, bgClass: string } } = {
  OK: {
    icon: <Icons.Ok className="w-7 h-7 text-green-600" />,
    textClass: 'text-green-700',
    bgClass: 'bg-green-100',
  },
  CAUTION: {
    icon: <Icons.Caution className="w-7 h-7 text-yellow-600" />,
    textClass: 'text-yellow-700',
    bgClass: 'bg-yellow-100',
  },
  LIMIT: {
    icon: <Icons.Limit className="w-7 h-7 text-red-600" />,
    textClass: 'text-red-700',
    bgClass: 'bg-red-100',
  },
};

export const MetricDisplay: React.FC<MetricDisplayProps> = ({ metric, t }) => {
  const styles = flagStyles[metric.flag];
  // FIX: The cast to `keyof typeof t.explanations` was causing a "Type 'symbol' cannot be used as an index type" error.
  // The value is already a string and can be used as a key directly.
  const explanationKey = metric.explanation;
  
  // Look up the translation, fall back to English if not found, then to the key itself.
  const explanationText = 
    t.explanations[explanationKey as keyof typeof t.explanations] || 
    locales.en.explanations[explanationKey as keyof typeof locales.en.explanations] || 
    metric.explanation;

  return (
    <div className="pt-5 first:pt-0">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-700">{metric.label}</h3>
          <p className={`text-2xl font-bold ${styles.textClass}`}>{metric.value}</p>
        </div>
        <div className="flex flex-col items-center">
            {styles.icon}
            <span className={`text-sm font-bold mt-1 ${styles.textClass}`}>{metric.flag}</span>
        </div>
      </div>
      <p className="mt-2 text-slate-600 text-base">{explanationText}</p>
    </div>
  );
};
