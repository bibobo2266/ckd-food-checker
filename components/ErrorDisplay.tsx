import React from 'react';
import type { Translation } from '../i18n';

interface ErrorDisplayProps {
  message: string;
  t: Translation;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, t }) => {
  return (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-lg shadow-md" role="alert">
      <p className="font-bold text-xl">{t.errorTitle}</p>
      <p className="text-lg mt-2">{message}</p>
    </div>
  );
};
