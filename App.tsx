import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { SearchBar } from './components/SearchBar';
import { ResultCard } from './components/ResultCard';
import { MetricDisplay } from './components/MetricDisplay';
import { WelcomeScreen } from './components/WelcomeScreen';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorDisplay } from './components/ErrorDisplay';
import { OverallResultCard } from './components/OverallResultCard';
import { LanguageSelector } from './components/LanguageSelector';
import { PortionSelector } from './components/PortionSelector';
import { SaferWaysCard } from './components/SaferWaysCard';
import { Disclaimer } from './components/Disclaimer';
import { locales, supportedLanguages, Language } from './i18n';
import type { FoodData } from './types';
import { Flag } from './types';
import { fetchFoodData } from './services/geminiService';
import { scaleFoodData } from './utils/food-scaling';


const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [baseFoodData, setBaseFoodData] = useState<FoodData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<Language>('en');
  const [portion, setPortion] = useState<number>(100);

  useEffect(() => {
    const storedLang = localStorage.getItem('ckd-lang') as Language;
    if (storedLang && supportedLanguages.includes(storedLang)) {
      setLang(storedLang);
    } else {
      const browserLang = navigator.language.split('-')[0];
      if (browserLang === 'zh') {
        setLang('zh-TW');
      } else if (supportedLanguages.includes(browserLang as Language)) {
        setLang(browserLang as Language);
      } else {
        setLang('en');
      }
    }
  }, []);
  
  const handleLangChange = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('ckd-lang', newLang);
  };
  
  const t = locales[lang];

  const handleSearch = useCallback(async (query: string) => {
    if (!query) return;

    setIsLoading(true);
    setBaseFoodData(null);
    setError(null);
    setPortion(100);

    try {
      const data = await fetchFoodData(query, lang);
      setBaseFoodData(data);
    } catch (err) {
      console.error(err);
      setError(t.errorFetching);
    } finally {
      setIsLoading(false);
    }
  }, [lang, t.errorFetching]);

  const displayFoodData = useMemo(() => {
    if (!baseFoodData) return null;
    return scaleFoodData(baseFoodData, portion);
  }, [baseFoodData, portion]);
  
  const getMetricsByLabels = (labels: string[]): FoodData['metrics'] => {
    if (!displayFoodData) return [];
    return displayFoodData.metrics.filter(m => labels.includes(m.label));
  };

  const minerals = getMetricsByLabels(['Phosphorus (mg)', 'Phosphorus-to-protein ratio (mg/g)', 'Potassium (mg)', 'Sodium (mg)']);
  const risks = getMetricsByLabels(['Purine content', 'PRAL score', 'Oxalate content']);
  const handling = getMetricsByLabels(['Digestibility / NPU', 'Nitrogen burden / renal load', 'Fluid / volume load', 'Processing level', 'Kidney handling']);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-white shadow-md sticky top-0 z-10 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-sky-700">CKD Food Checker</h1>
            <LanguageSelector currentLang={lang} onChange={handleLangChange} />
          </div>
          <SearchBar onSearch={handleSearch} isLoading={isLoading} placeholder={t.searchPlaceholder} />
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 pb-28">
        {isLoading && <LoadingSpinner t={t}/>}
        {error && <ErrorDisplay message={error} t={t} />}
        {!isLoading && !baseFoodData && !error && <WelcomeScreen t={t} />}

        {displayFoodData && baseFoodData && (
          <div className="space-y-6">
            <OverallResultCard foodData={displayFoodData} t={t} />

            <PortionSelector 
              currentPortion={portion}
              onPortionChange={setPortion}
              typicalServingSize={baseFoodData.typicalServingSize}
              t={t}
            />

            {baseFoodData.saferWays && baseFoodData.saferWays.length > 0 && (
                <SaferWaysCard tips={baseFoodData.saferWays} t={t} />
            )}

            <ResultCard title={t.mineralsTitle}>
              {minerals.map(metric => <MetricDisplay key={metric.label} metric={metric} t={t} />)}
            </ResultCard>
            <ResultCard title={t.risksTitle}>
              {risks.map(metric => <MetricDisplay key={metric.label} metric={metric} t={t} />)}
            </ResultCard>
            <ResultCard title={t.handlingTitle}>
              {handling.map(metric => <MetricDisplay key={metric.label} metric={metric} t={t} />)}
            </ResultCard>

            <Disclaimer t={t}/>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-slate-200 p-4">
        <div className="max-w-3xl mx-auto">
          <button
            disabled
            className="w-full bg-slate-300 text-slate-500 font-bold py-4 px-4 rounded-lg cursor-not-allowed text-lg"
            title={t.comingSoon}
          >
            {t.ocrButtonLabel}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;