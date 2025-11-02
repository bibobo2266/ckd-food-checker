import React from 'react';
import type { Language } from '../i18n';

interface LanguageSelectorProps {
    currentLang: Language;
    onChange: (lang: Language) => void;
}

const languages: { key: Language; name: string; flag: string }[] = [
    { key: 'en', name: 'English', flag: '🇬🇧' },
    { key: 'zh-TW', name: '繁體中文', flag: '🇹🇼' },
    { key: 'ja', name: '日本語', flag: '🇯🇵' },
    { key: 'ko', name: '한국어', flag: '🇰🇷' },
    { key: 'fr', name: 'Français', flag: '🇫🇷' },
    { key: 'th', name: 'ไทย', flag: '🇹🇭' },
    { key: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ currentLang, onChange }) => {
    return (
        <div className="relative">
            <select
                value={currentLang}
                onChange={(e) => onChange(e.target.value as Language)}
                className="appearance-none bg-white border border-slate-300 text-slate-700 font-semibold py-2 pl-3 pr-8 rounded-lg leading-tight focus:outline-none focus:ring-2 focus:ring-sky-500 text-md"
                aria-label="Select language"
            >
                {languages.map(lang => (
                    <option key={lang.key} value={lang.key}>
                        {lang.flag} {lang.name}
                    </option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
        </div>
    );
};
