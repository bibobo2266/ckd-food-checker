import React from 'react';
import type { Translation } from '../i18n';

interface PortionSelectorProps {
    currentPortion: number;
    onPortionChange: (portion: number) => void;
    typicalServingSize?: number;
    t: Translation;
}

export const PortionSelector: React.FC<PortionSelectorProps> = ({ currentPortion, onPortionChange, typicalServingSize, t }) => {
    const options = [50, 100];
    if (typicalServingSize && !options.includes(typicalServingSize)) {
        options.push(typicalServingSize);
        options.sort((a,b) => a - b);
    }

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onPortionChange(Number(e.target.value));
    };

    return (
        <div className="bg-white rounded-xl shadow-md p-4 flex items-center justify-center gap-4">
            <label htmlFor="portion-select" className="text-lg font-semibold text-slate-700">
                {t.portionSelectorLabel}
            </label>
            <select
                id="portion-select"
                value={currentPortion}
                onChange={handleChange}
                className="appearance-none bg-slate-100 border border-slate-300 text-slate-800 font-bold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-lg"
            >
                {options.map(size => (
                    <option key={size} value={size}>
                        {size === typicalServingSize ? `${size}g (${t.portionTypical})` : `${size}g`}
                    </option>
                ))}
            </select>
        </div>
    );
};