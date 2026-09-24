import React, { useState, useRef, useEffect } from 'react';
import { Anchor, Search, X, Check, ChevronDown, Globe } from 'lucide-react';
import {
  PortDefinition,
  WORLD_PORTS,
  PORT_REGIONS_ORDER,
  getPortsGroupedByRegion,
  searchPorts,
  getPortByCode,
} from '../../data/worldPorts';
import { api } from '../../services/api';

/** Ports added by the user in Masters (from /masters/ports), merged into the picker */
let livePortsCache: PortDefinition[] | null = null;
let livePortsPromise: Promise<PortDefinition[]> | null = null;

async function fetchLivePorts(): Promise<PortDefinition[]> {
  if (livePortsCache) return livePortsCache;
  if (!livePortsPromise) {
    livePortsPromise = api
      .get('/masters/ports')
      .then((res: any) => {
        const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        const staticCodes = new Set(Object.keys(WORLD_PORTS));
        // Map DB rows to the PortDefinition shape used by the picker; skip duplicates of the static dataset
        livePortsCache = list
          .filter((p: any) => p?.code && !staticCodes.has(String(p.code).toUpperCase()))
          .map((p: any) => ({
            unlocode: String(p.code).toUpperCase(),
            name: p.nameEn || p.code,
            nameAr: p.nameAr || '',
            country: p.nameAr || p.nameEn || '',
            countryCode: p.countryCode || '',
            flagEmoji: '🏴',
            coordinates: { lat: 0, lng: 0 },
            portType: p.portType === 'dry' ? 'dry' : 'sea',
            region: p.countryCode === 'EG' ? 'Egypt' : undefined,
            terminals: [],
          })) as PortDefinition[];
        return livePortsCache;
      })
      .catch(() => {
        livePortsPromise = null;
        return [];
      });
  }
  return livePortsPromise;
}

/**
 * PortOptions: Renders grouped <optgroup> and <option> tags for native HTML <select> elements.
 * Ideal for quick drop-in replacement into existing native selects across the app.
 */

/**
 * PortOptions: Renders grouped <optgroup> and <option> tags for native HTML <select> elements.
 * Ideal for quick drop-in replacement into existing native selects across the app.
 */
interface PortOptionsProps {
  includeAllOption?: boolean;
  allOptionLabel?: string;
  allOptionValue?: string;
  filterRegion?: string;
  preferredPortType?: 'sea' | 'dry' | 'land_crossing';
}

export const PortOptions: React.FC<PortOptionsProps> = ({
  includeAllOption = false,
  allOptionLabel = 'جميع الموانئ',
  allOptionValue = 'ALL',
  filterRegion,
  preferredPortType,
}) => {
  const groups = getPortsGroupedByRegion();

  return (
    <>
      {includeAllOption && (
        <option value={allOptionValue}>{allOptionLabel}</option>
      )}
      {groups
        .filter((g) => !filterRegion || g.regionKey === filterRegion)
        .map((group) => {
          const ports = preferredPortType
            ? group.ports.filter((p) => (p.portType || (p.isDryPort ? 'dry' : 'sea')) === preferredPortType)
            : group.ports;

          if (ports.length === 0) return null;

          return (
            <optgroup key={group.regionKey} label={`${group.flag} ${group.regionNameAr} (${group.regionNameEn})`}>
              {ports.map((port) => (
                <option key={port.unlocode} value={port.unlocode}>
                  {port.unlocode} — {port.name} ({port.nameAr})
                </option>
              ))}
            </optgroup>
          );
        })}
    </>
  );
};

/**
 * PortSelect: A rich, searchable interactive Combobox for selecting any port in the world.
 */
export interface PortSelectProps {
  value?: string; // UN/LOCODE or port identifier
  onChange: (portCode: string, port?: PortDefinition) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  direction?: 'pol' | 'pod' | 'general';
  preferredPortType?: 'sea' | 'dry' | 'land_crossing';
}

export const PortSelect: React.FC<PortSelectProps> = ({
  value,
  onChange,
  placeholder = 'ابحث عن ميناء بالاسم، الكود، أو الدولة...',
  label,
  required = false,
  disabled = false,
  className = '',
  direction = 'general',
  preferredPortType,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRegionFilter, setActiveRegionFilter] = useState<string>('all');
  const [livePorts, setLivePorts] = useState<PortDefinition[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Merge ports added from Masters (module-level cache avoids refetching per instance)
  useEffect(() => {
    let mounted = true;
    fetchLivePorts().then((ports) => {
      if (mounted) setLivePorts(ports);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const selectedPort = getPortByCode(value) || livePorts.find((p) => p.unlocode === value);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered ports: static world dataset + live master ports (deduped by UN/LOCODE)
  const staticFiltered = searchPorts(searchQuery, {
    region: activeRegionFilter === 'all' ? undefined : activeRegionFilter,
    portType: preferredPortType,
  });
  const staticFilteredCodes = new Set(staticFiltered.map((p) => p.unlocode));
  const liveFiltered = livePorts.filter((p) => {
    if (activeRegionFilter !== 'all' && p.region !== activeRegionFilter) return false;
    if (preferredPortType && (p.portType || 'sea') !== preferredPortType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.unlocode.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.nameAr || '').includes(searchQuery) ||
        p.countryCode.toLowerCase().includes(q)
      );
    }
    return true;
  });
  const filteredPorts = [...staticFiltered, ...liveFiltered.filter((lp) => !staticFilteredCodes.has(lp.unlocode))];
  const totalPortsCount = Object.keys(WORLD_PORTS).length + livePorts.length;

  const handleSelect = (port: PortDefinition) => {
    onChange(port.unlocode, port);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Anchor className={`w-3.5 h-3.5 ${direction === 'pol' ? 'text-blue-500' : direction === 'pod' ? 'text-emerald-500' : 'text-red-500'}`} />
            <span>{label}</span>
            {required && <span className="text-red-500">*</span>}
          </span>
          {selectedPort && (
            <span className="text-[10px] font-mono text-slate-400 font-normal">
              {selectedPort.country} ({selectedPort.countryCode})
            </span>
          )}
        </label>
      )}

      {/* Input Trigger */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        className={`w-full bg-slate-50 dark:bg-slate-950 border rounded-xl py-2 px-3 text-sm flex items-center justify-between cursor-pointer transition-all ${
          isOpen
            ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-sm'
            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900' : ''}`}
      >
        <div className="flex items-center gap-2.5 truncate flex-1 pe-2">
          {selectedPort ? (
            <>
              <span className="text-base flex-shrink-0">{selectedPort.flagEmoji}</span>
              <span className="font-mono font-bold text-xs bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded flex-shrink-0">
                {selectedPort.unlocode}
              </span>
              <span className="truncate font-semibold text-slate-900 dark:text-white text-xs">
                {selectedPort.name}
              </span>
              <span className="text-slate-400 text-xs truncate hidden sm:inline">
                ({selectedPort.nameAr})
              </span>
            </>
          ) : (
            <span className="text-slate-400 text-xs flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {selectedPort && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Popover / Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full min-w-[340px] max-w-[480px] right-0 bg-white dark:bg-[#0E121A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Header */}
          <div className="p-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بكود الميناء (مثال: CNSHA، EGALY) أو اسم المدينة..."
                className="w-full bg-white dark:bg-[#141A24] border border-slate-200 dark:border-slate-700/80 rounded-xl py-2 ps-9 pe-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Region Filter Badges */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              <button
                type="button"
                onClick={() => setActiveRegionFilter('all')}
                className={`px-2 py-0.5 rounded-lg whitespace-nowrap transition font-medium ${
                  activeRegionFilter === 'all'
                    ? 'bg-brand-500 text-white font-bold'
                    : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300'
                }`}
              >
                الكل ({totalPortsCount})
              </button>
              {PORT_REGIONS_ORDER.map((reg) => (
                <button
                  key={reg.key}
                  type="button"
                  onClick={() => setActiveRegionFilter(reg.key)}
                  className={`px-2 py-0.5 rounded-lg whitespace-nowrap transition font-medium flex items-center gap-1 ${
                    activeRegionFilter === reg.key
                      ? 'bg-brand-500 text-white font-bold'
                      : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300'
                  }`}
                >
                  <span>{reg.flag}</span>
                  <span>{reg.key === 'Egypt' ? 'مصر' : reg.key === 'Middle East' ? 'الخليج' : reg.key === 'East Asia' ? 'الصين وآسيا' : reg.key === 'Europe' ? 'أوروبا' : reg.key === 'North America' ? 'أمريكا' : reg.nameAr.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Results List */}
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-1 divide-y divide-slate-100 dark:divide-slate-800/40">
            {filteredPorts.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                لا توجد موانئ مطابقة للبحث "{searchQuery}"
              </div>
            ) : (
              filteredPorts.map((port) => {
                const isSelected = selectedPort?.unlocode === port.unlocode;
                const isDry = port.portType === 'dry' || port.isDryPort;
                const isLand = port.portType === 'land_crossing';

                return (
                  <div
                    key={port.unlocode}
                    onClick={() => handleSelect(port)}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition text-xs ${
                      isSelected
                        ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-semibold'
                        : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate flex-1 pe-2">
                      <span className="text-base">{port.flagEmoji}</span>
                      <span className="font-mono font-bold text-[11px] bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700/60">
                        {port.unlocode}
                      </span>
                      <div className="truncate">
                        <div className="font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                          <span>{port.name}</span>
                          {isDry && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                              ميناء جاف
                            </span>
                          )}
                          {isLand && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                              منفذ بري
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {port.nameAr} • {port.country}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isSelected && <Check className="w-4 h-4 text-brand-600 dark:text-brand-400" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Info */}
          <div className="p-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/30 flex items-center justify-between text-[10px] text-slate-400">
            <span>إجمالي الموانئ العالمية: {totalPortsCount} ميناء</span>
            <span className="font-mono">RED SHIPPING UN/LOCODE</span>
          </div>
        </div>
      )}
    </div>
  );
};
