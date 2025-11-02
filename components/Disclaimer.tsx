import React from 'react';
import type { Translation } from '../i18n';

interface DisclaimerProps {
  t: Translation;
}

export const Disclaimer: React.FC<DisclaimerProps> = ({ t }) => {
  return (
    <div className="mt-8 p-4 bg-amber-50 border-l-4 border-amber-400 text-amber-800 rounded-r-lg">
      <h3 className="font-bold text-lg">{t.medicalDisclaimerTitle}</h3>
      <p className="mt-1 text-base">{t.medicalDisclaimerMessage}</p>
    </div>
  );
};