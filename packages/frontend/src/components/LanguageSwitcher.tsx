import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSwitcher = (): JSX.Element => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const changeLanguage = (lng: string): void => {
    void i18n.changeLanguage(lng);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted transition hover:bg-accent hover:text-primary"
        aria-label="Change language"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{i18n.language === 'nl' ? 'NL' : 'EN'}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-32 rounded-lg border border-border bg-white shadow-lg">
          <div className="p-1">
            <button
              type="button"
              onClick={() => changeLanguage('nl')}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                i18n.language === 'nl'
                  ? 'bg-accent text-primary'
                  : 'text-black hover:bg-accent'
              }`}
            >
              <span className="text-lg">🇳🇱</span>
              Nederlands
            </button>
            <button
              type="button"
              onClick={() => changeLanguage('en')}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                i18n.language === 'en'
                  ? 'bg-accent text-primary'
                  : 'text-black hover:bg-accent'
              }`}
            >
              <span className="text-lg">🇬🇧</span>
              English
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;

