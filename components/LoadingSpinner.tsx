import React from 'react';
import type { Translation } from '../i18n';

interface LoadingSpinnerProps {
  t: Translation;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ t }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 border-4 border-sky-500 border-dashed rounded-full animate-spin"></div>
      <p className="text-xl font-semibold text-slate-600 mt-6">{t.loadingTitle}</p>
      <p className="text-md text-slate-500 mt-2">{t.loadingMessage}</p>
    </div>
  );
};
