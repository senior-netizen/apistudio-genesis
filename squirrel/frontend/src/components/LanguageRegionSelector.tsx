import { useEffect, useMemo, useState } from 'react';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'sw', label: 'Kiswahili' },
  { code: 'pt', label: 'Português' },
];

const REGIONS = ['Johannesburg', 'Nairobi', 'Lagos', 'Cape Town', 'Harare'];

export interface LanguageRegionSelectorProps {
  onChange?: (selection: { language: string; region: string }) => void;
}

export function LanguageRegionSelector({ onChange }: LanguageRegionSelectorProps) {
  const saved = useMemo(() => {
    try {
      const raw = localStorage.getItem('sdl.langRegion');
      return raw ? (JSON.parse(raw) as { language?: string; region?: string }) : {};
    } catch {
      return {} as { language?: string; region?: string };
    }
  }, []);

  const defaultLang = useMemo(() => {
    const browser = navigator.language?.slice(0, 2).toLowerCase();
    const supported = LANGUAGES.map((l) => l.code);
    if (saved.language && supported.includes(saved.language)) return saved.language;
    if (browser && supported.includes(browser)) return browser;
    return 'en';
  }, [saved.language]);

  const [language, setLanguage] = useState<string>(defaultLang);
  const [region, setRegion] = useState<string>(saved.region ?? 'Johannesburg');

  const emitChange = (nextLanguage: string, nextRegion: string) => {
    onChange?.({ language: nextLanguage, region: nextRegion });
    try {
      localStorage.setItem('sdl.langRegion', JSON.stringify({ language: nextLanguage, region: nextRegion }));
    } catch {
      // ignore persistence errors
    }
  };

  useEffect(() => {
    // emit initial selection
    emitChange(language, region);
  }, []);

  return (
    <div className="flex items-center gap-3 text-sm">
      <label className="flex items-center gap-2">
        <span className="text-muted">Language</span>
        <select
          aria-label="Language"
          className="rounded-md border border-border/60 bg-background px-2 py-1"
          value={language}
          onChange={(event) => {
            const next = event.target.value;
            setLanguage(next);
            emitChange(next, region);
          }}
        >
          {LANGUAGES.map((item) => (
            <option key={item.code} value={item.code}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2">
        <span className="text-muted">Region</span>
        <select
          aria-label="Region"
          className="rounded-md border border-border/60 bg-background px-2 py-1"
          value={region}
          onChange={(event) => {
            const next = event.target.value;
            setRegion(next);
            emitChange(language, next);
          }}
        >
          {REGIONS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export default LanguageRegionSelector;
