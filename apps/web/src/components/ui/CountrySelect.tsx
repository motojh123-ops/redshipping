import React, { useState, useEffect, useRef } from 'react';
import { CountryFlag } from './CountryFlag';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { api } from '../../services/api';

export interface CountryItem {
  cca2: string;
  cca3: string;
  nameEn: string;
  nameAr: string;
  capital?: string;
  currencies?: string[];
  callingCode?: string;
}

interface CountrySelectProps {
  value?: string; // e.g. 'EG', 'CN'
  onChange: (country: CountryItem) => void;
  placeholder?: string;
  className?: string;
}

export const CountrySelect: React.FC<CountrySelectProps> = ({
  value,
  onChange,
  placeholder = 'اختر الدولة...',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setLoading(true);
        const res: any = await api.get('/maritime/countries');
        if (res?.data) {
          setCountries(res.data);
        }
      } catch (err) {
        console.error('Failed to load countries list', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCountries();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCountry = countries.find(
    (c) => c.cca2.toUpperCase() === (value || '').toUpperCase()
  );

  const filtered = countries.filter((c) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      c.nameAr.toLowerCase().includes(q) ||
      c.nameEn.toLowerCase().includes(q) ||
      c.cca2.toLowerCase().includes(q) ||
      c.cca3.toLowerCase().includes(q)
    );
  });

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] hover:border-slate-300 dark:hover:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 transition shadow-sm"
      >
        <div className="flex items-center gap-2 truncate">
          {selectedCountry ? (
            <>
              <CountryFlag countryCode={selectedCountry.cca2} className="w-5 h-3.5 rounded shadow-sm" />
              <span className="font-bold text-slate-900 dark:text-white truncate">
                {selectedCountry.nameAr || selectedCountry.nameEn}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">({selectedCountry.cca2})</span>
            </>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full min-w-[280px] bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Header */}
          <div className="p-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0B0E14]/40 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم العربي، الإنجليزي، أو كود الدولة..."
              className="w-full bg-transparent text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
            {loading ? (
              <div className="p-4 text-center text-xs text-slate-400">جاري تحميل الدول...</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">لا توجد دولة مطابقة للبحث</div>
            ) : (
              filtered.map((country) => {
                const isSelected = selectedCountry?.cca2 === country.cca2;
                return (
                  <button
                    key={country.cca2}
                    type="button"
                    onClick={() => {
                      onChange(country);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-start text-xs transition ${
                      isSelected
                        ? 'bg-orange-50 dark:bg-orange-500/10 text-[#FF5E1E] font-bold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <CountryFlag countryCode={country.cca2} className="w-5 h-3.5 rounded shadow-sm" />
                      <span className="truncate">{country.nameAr}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({country.nameEn})</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 shrink-0">
                      {country.callingCode && <span>{country.callingCode}</span>}
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#FF5E1E]" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
