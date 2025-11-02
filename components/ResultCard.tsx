
import React from 'react';

interface ResultCardProps {
  title: string;
  children: React.ReactNode;
}

export const ResultCard: React.FC<ResultCardProps> = ({ title, children }) => {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <h2 className="text-xl font-bold text-slate-100 bg-slate-600 px-6 py-4">{title}</h2>
      <div className="p-6 space-y-5 divide-y divide-slate-200">
        {children}
      </div>
    </div>
  );
};
