import React from 'react';
import type { Translation } from '../i18n';

interface WelcomeScreenProps {
  t: Translation;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ t }) => {
  return (
    <div className="text-center p-8 bg-white rounded-xl shadow-md">
      <h2 className="text-3xl font-bold text-slate-700 mb-4">{t.welcomeTitle}</h2>
      <p className="text-lg text-slate-600 mb-6">
        {t.welcomeMessage}
      </p>
      <div className="text-left text-slate-500 space-y-2 bg-slate-50 p-4 rounded-lg">
        <p><strong>{t.welcomeExamplesTitle}</strong></p>
        <ul className="list-disc list-inside">
          <li>Spinach</li>
          <li>Tofu (豆腐)</li>
          <li>Chicken breast</li>
          <li>김치 (Kimchi)</li>
        </ul>
      </div>
      <p className="text-sm text-slate-500 mt-6">
        <strong>{t.disclaimerTitle}:</strong> {t.disclaimerMessage}
      </p>
    </div>
  );
};
