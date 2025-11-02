// FIX: Add missing React import to resolve JSX namespace error.
import React from 'react';
import type { FoodData, Flag } from '../types';
import { Icons } from './Icons';
import type { Translation } from '../i18n';

interface OverallResultCardProps {
    foodData: FoodData;
    t: Translation;
}

export const OverallResultCard: React.FC<OverallResultCardProps> = ({ foodData, t }) => {
    const flagInfo: { [key in Flag]: { text: string; bgColor: string; textColor: string; icon: JSX.Element, message: string } } = {
        OK: { text: t.flagOk, bgColor: 'bg-green-100', textColor: 'text-green-800', icon: <Icons.Ok className="w-16 h-16 text-green-600" />, message: t.messageOk },
        CAUTION: { text: t.flagCaution, bgColor: 'bg-yellow-100', textColor: 'text-yellow-800', icon: <Icons.Caution className="w-16 h-16 text-yellow-600" />, message: t.messageCaution },
        LIMIT: { text: t.flagLimit, bgColor: 'bg-red-100', textColor: 'text-red-800', icon: <Icons.Limit className="w-16 h-16 text-red-600" />, message: t.messageLimit }
    };

    const info = flagInfo[foodData.overallFlag];

    return (
        <div className={`rounded-xl shadow-lg overflow-hidden ${info.bgColor} ${info.textColor}`}>
            <div className="p-6 text-center">
                <h2 className="text-2xl font-bold text-slate-800">
                    {t.overallResultTitle}: <span className="text-sky-700">{foodData.foodName}</span>
                </h2>
                <p className="text-sm text-slate-500 mb-4">(Based on {foodData.servingSize} serving from {foodData.dataSource})</p>

                <div className="flex flex-col items-center justify-center my-4">
                    {info.icon}
                    <p className="text-4xl font-bold mt-2">{info.text}</p>
                </div>
                <p className="text-lg">{info.message}</p>
            </div>
            
            {foodData.source_confidence === 'low' && foodData.notes && (
                 <div className="bg-yellow-200/50 border-t border-yellow-300/50 p-4">
                    <p className="text-center font-semibold text-yellow-800">{foodData.notes}</p>
                 </div>
            )}
        </div>
    );
}