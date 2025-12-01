import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

  const emitChange = useCallback(
    (nextLanguage: string, nextRegion: string) => {
      onChange?.({ language: nextLanguage, region: nextRegion });
      try {
        localStorage.setItem('sdl.langRegion', JSON.stringify({ language: nextLanguage, region: nextRegion }));
      } catch {
        // ignore persistence errors
      }
    },
    [onChange],
  );

  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (hasSyncedRef.current) return;
    hasSyncedRef.current = true;
    emitChange(language, region);
  }, [emitChange, language, region]);

  return (
    <div className="flex items-center gap-3 rounded-[12px] border border-border/60 bg-background/80 px-3 py-2 text-sm shadow-soft">
      <label className="flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-[0.3em] text-muted">Language</span>
        <select
          aria-label="Language"
          className="rounded-[10px] border border-border/40 bg-background/80 px-2 py-1 text-sm text-foreground shadow-inner focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring/40"
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
      <span className="hidden h-6 w-px bg-border/60 sm:block" aria-hidden />
      <label className="flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-[0.3em] text-muted">Region</span>
        <select
          aria-label="Region"
          className="rounded-[10px] border border-border/40 bg-background/80 px-2 py-1 text-sm text-foreground shadow-inner focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring/40"
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

