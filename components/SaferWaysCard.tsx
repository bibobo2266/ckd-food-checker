import React from 'react';
import { locales, Translation } from '../i18n';

interface SaferWaysCardProps {
  tips: string[];
  t: Translation;
}

export const SaferWaysCard: React.FC<SaferWaysCardProps> = ({ tips, t }) => {
  return (
    <div className="bg-sky-50 rounded-xl shadow-md overflow-hidden border border-sky-200">
      <h2 className="text-xl font-bold text-sky-800 bg-sky-100 px-6 py-4">{t.saferWaysTitle}</h2>
      <div className="p-6">
        <ul className="space-y-3">
          {tips.map((tipKey, index) => {
             // FIX: The cast to `keyof typeof t.safetyTips` was causing a "Type 'symbol' cannot be used as an index type" error.
             // The value is already a string and can be used as a key directly.
             const key = tipKey as keyof typeof t.safetyTips;
             // Look up the translation, fall back to English if not found, then to the key itself.
             const tipText = t.safetyTips[key] || locales.en.safetyTips[key] || tipKey;
             return (
                <li key={index} className="flex items-start">
                  <span className="text-green-500 mr-3 mt-1">✓</span>
                  <span className="text-slate-700 text-base">{tipText}</span>
                </li>
             )
          })}
        </ul>
      </div>
    </div>
  );
};
