import React, { useState, useEffect, useMemo } from 'react';
import {
  Globe2,
  Anchor,
  Truck,
  Search,
  Filter,
  MapPin,
  Compass,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Building2,
  Phone,
  Coins,
  Navigation,
  Sparkles,
  Info,
  Clock,
  Layers,
} from 'lucide-react';
import { CountryFlag } from '../../components/ui/CountryFlag';
import { api } from '../../services/api';
import { Loader2, Plus, Edit2, Trash2, MapPinned } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '../../components/ui/Modal';
import { PortDefinition, TradeCorridor, CountryDefinition } from '@banna/shared-types';

/** Managed city row from /masters/cities (Country Atlas drill-down) */
interface AtlasCity {
  id: string;
  countryCode: string;
  nameEn: string;
  nameAr: string | null;
  isActive: boolean;
}

export const WorldDirectoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'countries' | 'ports' | 'corridors'>('countries');

  // Search & Filter State
  const [countrySearch, setCountrySearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');

  const [portSearch, setPortSearch] = useState('');
  const [portTypeFilter, setPortTypeFilter] = useState<string>('all');
  const [portCountryFilter, setPortCountryFilter] = useState<string>('all');

  const [corridorTypeFilter, setCorridorTypeFilter] = useState<string>('all');

  // Data State
  const [countries, setCountries] = useState<CountryDefinition[]>([]);
  const [ports, setPorts] = useState<PortDefinition[]>([]);
  const [corridors, setCorridors] = useState<TradeCorridor[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Detail Modal / Drawer
  const [selectedCountry, setSelectedCountry] = useState<CountryDefinition | null>(null);
  const [selectedPort, setSelectedPort] = useState<PortDefinition | null>(null);
  const [selectedCorridor, setSelectedCorridor] = useState<TradeCorridor | null>(null);

  // Country Atlas — user-managed cities (per approved spec: cities live INSIDE the country)
  const [cities, setCities] = useState<AtlasCity[]>([]);
  const [cityFormOpen, setCityFormOpen] = useState(false);
  const [editingCityId, setEditingCityId] = useState<string | null>(null);
  const [citySaving, setCitySaving] = useState(false);
  const [cityForm, setCityForm] = useState({ nameEn: '', nameAr: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [countriesRes, portsRes, corridorsRes]: any = await Promise.all([
          api.get('/maritime/countries'),
          api.get('/maritime/ports'),
          api.get('/maritime/land-corridors'),
        ]);

        // api interceptor already unwraps { success, count, data } to the array
        const arr = (r: any) => (Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : []);
        setCountries(arr(countriesRes));
        setPorts(arr(portsRes));
        setCorridors(arr(corridorsRes));
      } catch (err) {
        console.error('Failed to load world directory data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  /** Load user-managed cities (Country Atlas) — must never break the atlas itself */
  const refreshCities = async () => {
    try {
      const data: any = await api.get('/masters/cities');
      setCities(Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []);
    } catch {
      /* cities stay empty — atlas still renders the static country data */
    }
  };

  useEffect(() => {
    refreshCities();
  }, []);

  /** city count per country (ISO alpha-2) */
  const cityCountByCountry = useMemo(() => {
    const m = new Map<string, number>();
    cities.forEach((c) => m.set(c.countryCode, (m.get(c.countryCode) || 0) + 1));
    return m;
  }, [cities]);

  /** cities of the currently drilled-in country */
  const selectedCountryCities = useMemo(
    () =>
      selectedCountry
        ? cities.filter((c) => c.countryCode === selectedCountry.cca2.toUpperCase())
        : [],
    [cities, selectedCountry],
  );

  const openAddCity = () => {
    setEditingCityId(null);
    setCityForm({ nameEn: '', nameAr: '' });
    setCityFormOpen(true);
  };

  const openEditCity = (city: AtlasCity) => {
    setEditingCityId(city.id);
    setCityForm({ nameEn: city.nameEn, nameAr: city.nameAr || '' });
    setCityFormOpen(true);
  };

  const closeCountryModal = () => {
    setSelectedCountry(null);
    setCityFormOpen(false);
    setEditingCityId(null);
  };

  const handleSaveCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCountry) return;
    const nameEn = cityForm.nameEn.trim();
    if (!nameEn) {
      toast.error('اسم المدينة بالإنجليزية مطلوب');
      return;
    }
    setCitySaving(true);
    try {
      if (editingCityId) {
        await api.patch(`/masters/cities/${editingCityId}`, {
          nameEn,
          nameAr: cityForm.nameAr.trim() || null,
        });
        toast.success('تم تحديث المدينة بنجاح');
      } else {
        await api.post('/masters/cities', {
          countryCode: selectedCountry.cca2.toUpperCase(),
          nameEn,
          nameAr: cityForm.nameAr.trim() || undefined,
        });
        toast.success('تمت إضافة المدينة بنجاح');
      }
      setCityFormOpen(false);
      setEditingCityId(null);
      await refreshCities();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'تعذر حفظ المدينة');
    } finally {
      setCitySaving(false);
    }
  };

  const handleDeleteCity = async (city: AtlasCity) => {
    if (!window.confirm(`حذف المدينة «${city.nameAr || city.nameEn}» نهائياً؟`)) return;
    try {
      await api.delete(`/masters/cities/${city.id}`);
      toast.success('تم حذف المدينة');
      await refreshCities();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'تعذر حذف المدينة');
    }
  };

  const handleToggleCityActive = async (city: AtlasCity) => {
    try {
      await api.patch(`/masters/cities/${city.id}`, { isActive: !city.isActive });
      await refreshCities();
    } catch {
      toast.error('تعذر تحديث حالة المدينة');
    }
  };

  // Filtered Countries
  const filteredCountries = useMemo(() => {
    return countries.filter((c) => {
      const matchesSearch =
        !countrySearch.trim() ||
        c.nameAr.toLowerCase().includes(countrySearch.toLowerCase()) ||
        c.nameEn.toLowerCase().includes(countrySearch.toLowerCase()) ||
        c.cca2.toLowerCase().includes(countrySearch.toLowerCase()) ||
        c.capital.toLowerCase().includes(countrySearch.toLowerCase());

      const matchesRegion = selectedRegion === 'all' || c.region === selectedRegion;

      return matchesSearch && matchesRegion;
    });
  }, [countries, countrySearch, selectedRegion]);

  // Unique regions
  const regions = useMemo(() => {
    const set = new Set<string>();
    countries.forEach((c) => {
      if (c.region) set.add(c.region);
    });
    return Array.from(set);
  }, [countries]);

  // Filtered Ports
  const filteredPorts = useMemo(() => {
    return ports.filter((p) => {
      const matchesSearch =
        !portSearch.trim() ||
        p.unlocode.toLowerCase().includes(portSearch.toLowerCase()) ||
        p.name.toLowerCase().includes(portSearch.toLowerCase()) ||
        p.nameAr.toLowerCase().includes(portSearch.toLowerCase()) ||
        p.country.toLowerCase().includes(portSearch.toLowerCase()) ||
        (p.city && p.city.toLowerCase().includes(portSearch.toLowerCase()));

      const matchesType =
        portTypeFilter === 'all' ||
        (p.portType || (p.isDryPort ? 'dry' : 'sea')) === portTypeFilter;

      const matchesCountry =
        portCountryFilter === 'all' || p.countryCode === portCountryFilter;

      return matchesSearch && matchesType && matchesCountry;
    });
  }, [ports, portSearch, portTypeFilter, portCountryFilter]);

  // Filtered Corridors
  const filteredCorridors = useMemo(() => {
    return corridors.filter((c) => {
      if (corridorTypeFilter === 'all') return true;
      return c.type === corridorTypeFilter;
    });
  }, [corridors, corridorTypeFilter]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              أطلس الدول والموانئ والممرات البرية العالمية
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-[#FF5E1E] border border-orange-500/20 flex items-center gap-1">
              <Globe2 className="w-3.5 h-3.5" />
              UN/LOCODE & ISO 3166
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            دليل جغرافي شامل يضم أكثر من 250 دولة بأعلامها فائقة الدقة (SVG)، موانئ العالم والموانئ الجافة، وشبكات الممرات البرية للشحن
          </p>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>الدول المعتمدة:</span>
            <span className="font-bold font-mono text-slate-900 dark:text-white">{countries.length}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm flex items-center gap-2">
            <Anchor className="w-3.5 h-3.5 text-[#FF5E1E]" />
            <span>الموانئ والمنافذ:</span>
            <span className="font-bold font-mono text-slate-900 dark:text-white">{ports.length}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm flex items-center gap-2">
            <Truck className="w-3.5 h-3.5 text-sky-500" />
            <span>الممرات البرية:</span>
            <span className="font-bold font-mono text-slate-900 dark:text-white">{corridors.length}</span>
          </div>
        </div>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] shadow-sm">
          <Loader2 className="w-5 h-5 text-[#FF5E1E] animate-spin" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            جارٍ تحميل بيانات الأطلس الجغرافي...
          </span>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#1E2638] pb-3">
        <button
          onClick={() => setActiveTab('countries')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'countries'
              ? 'bg-[#FF5E1E] text-white shadow-md shadow-orange-500/20'
              : 'bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Globe2 className="w-4 h-4" />
          دليل الدول والأعلام العالمية ({countries.length})
        </button>
        <button
          onClick={() => setActiveTab('ports')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'ports'
              ? 'bg-[#FF5E1E] text-white shadow-md shadow-orange-500/20'
              : 'bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Anchor className="w-4 h-4" />
          موانئ العالم والموانئ الجافة ({ports.length})
        </button>
        <button
          onClick={() => setActiveTab('corridors')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'corridors'
              ? 'bg-[#FF5E1E] text-white shadow-md shadow-orange-500/20'
              : 'bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          الممرات البرية ومنافذ الترانزيت ({corridors.length})
        </button>
      </div>

      {/* =======================================================
          TAB 1: COUNTRIES & HIGH QUALITY SVG FLAGS
          ======================================================= */}
      {activeTab === 'countries' && (
        <div className="space-y-4">
          {/* Search & Region Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] shadow-sm">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                placeholder="ابحث بالاسم العربي، الإنجليزي، كود ISO، أو العاصمة..."
                className="w-full ps-10 pe-4 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-[#1E2638] text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                <Filter className="w-3.5 h-3.5 text-[#FF5E1E]" />
                المنطقة:
              </span>
              <button
                onClick={() => setSelectedRegion('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedRegion === 'all'
                    ? 'bg-[#FF5E1E] text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                الكل
              </button>
              {regions.map((reg) => (
                <button
                  key={reg}
                  onClick={() => setSelectedRegion(reg)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    selectedRegion === reg
                      ? 'bg-[#FF5E1E] text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {reg === 'Africa' ? 'إفريقيا' : reg === 'Asia' ? 'آسيا' : reg === 'Europe' ? 'أوروبا' : reg === 'Americas' ? 'الأمريكتين' : reg}
                </button>
              ))}
            </div>
          </div>

          {/* Countries Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredCountries.map((country) => (
              <div
                key={country.cca2}
                onClick={() => setSelectedCountry(country)}
                className="group p-4 rounded-2xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] hover:border-[#FF5E1E]/50 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    {/* High Resolution SVG Flag */}
                    <div className="relative shadow-sm rounded overflow-hidden border border-slate-200/80 dark:border-slate-700">
                      <CountryFlag
                        countryCode={country.cca2}
                        className="w-10 h-7 object-cover"
                        title={country.nameEn}
                      />
                    </div>
                    <div className="text-end">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {country.cca2} / {country.cca3}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-[#FF5E1E] transition">
                    {country.nameAr}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{country.nameEn}</p>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <MapPinned className="w-3 h-3 text-[#FF5E1E]" />
                      المدن المسجلة:
                    </span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                      {cityCountByCountry.get(country.cca2) || 0}
                    </span>
                  </div>
                  {country.capital && (
                    <div className="flex items-center justify-between">
                      <span>العاصمة:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{country.capital}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span>العملة:</span>
                    <span className="font-mono font-semibold text-[#FF5E1E]">
                      {country.currencies?.join(', ') || 'N/A'}
                    </span>
                  </div>
                  {country.callingCode && (
                    <div className="flex items-center justify-between">
                      <span>رمز الاتصال:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">{country.callingCode}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredCountries.length === 0 && (
            <div className="p-12 text-center bg-white dark:bg-[#121620] rounded-2xl border border-slate-200 dark:border-[#1E2638]">
              <Globe2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">لا توجد دول مطابقة لنتائج البحث</p>
              <p className="text-xs text-slate-400 mt-1">يرجى تعديل كلمة البحث أو تصفية المنطقة</p>
            </div>
          )}
        </div>
      )}

      {/* =======================================================
          TAB 2: GLOBAL SEAPORTS, DRY PORTS & CROSSINGS
          ======================================================= */}
      {activeTab === 'ports' && (
        <div className="space-y-4">
          {/* Search & Type Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] shadow-sm">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={portSearch}
                onChange={(e) => setPortSearch(e.target.value)}
                placeholder="ابحث بكود UN/LOCODE (مثل EGALY، CNSGH)، اسم الميناء، أو المدينة..."
                className="w-full ps-10 pe-4 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-[#1E2638] text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                <Filter className="w-3.5 h-3.5 text-[#FF5E1E]" />
                التصنيف:
              </span>
              {[
                { key: 'all', label: 'الكل' },
                { key: 'sea', label: 'موانئ بحرية 🚢' },
                { key: 'dry', label: 'موانئ جافة 🏗️' },
                { key: 'land_crossing', label: 'منافذ برية 🚛' },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setPortTypeFilter(t.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    portTypeFilter === t.key
                      ? 'bg-[#FF5E1E] text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ports Table / Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPorts.map((port) => (
              <div
                key={port.unlocode}
                onClick={() => setSelectedPort(port)}
                className="group p-5 rounded-2xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] hover:border-[#FF5E1E]/50 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2">
                      <CountryFlag
                        countryCode={port.countryCode}
                        className="w-7 h-5 rounded shadow-sm"
                        title={port.country}
                      />
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-black bg-orange-50 dark:bg-orange-500/10 text-[#FF5E1E] border border-orange-200 dark:border-orange-500/20">
                        {port.unlocode}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        port.portType === 'land_crossing'
                          ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          : port.isDryPort || port.portType === 'dry'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                      }`}
                    >
                      {port.portType === 'land_crossing'
                        ? 'منفذ بري'
                        : port.isDryPort || port.portType === 'dry'
                        ? 'ميناء جاف'
                        : 'ميناء بحري'}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-[#FF5E1E] transition">
                    {port.nameAr}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{port.name}</p>
                </div>

                <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>الدولة والمدينة:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {port.country} {port.city ? `• ${port.city}` : ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-500">
                    <span>الإحداثيات:</span>
                    <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {port.coordinates
                        ? `${port.coordinates.lat.toFixed(3)}°N, ${port.coordinates.lng.toFixed(3)}°E`
                        : '—'}
                    </span>
                  </div>

                  {port.terminals && port.terminals.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[10px] text-slate-400 block mb-1">المحطات التشغيلية:</span>
                      <div className="flex flex-wrap gap-1">
                        {port.terminals.slice(0, 2).map((term, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#0B0E14] text-[10px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
                          >
                            {term}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =======================================================
          TAB 3: INTERNATIONAL OVERLAND FREIGHT CORRIDORS (الممرات البرية)
          ======================================================= */}
      {activeTab === 'corridors' && (
        <div className="space-y-4">
          {/* Corridor Type Filter */}
          <div className="flex items-center gap-2 flex-wrap p-3.5 rounded-2xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] shadow-sm">
            <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
              <Layers className="w-3.5 h-3.5 text-[#FF5E1E]" />
              نوع الممر:
            </span>
            {[
              { key: 'all', label: 'كل الممرات الدولية' },
              { key: 'land', label: 'طرق برية دولية (TIR)' },
              { key: 'multimodal', label: 'متعدد الوسائط (بري / بحري / سككي)' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setCorridorTypeFilter(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  corridorTypeFilter === t.key
                    ? 'bg-[#FF5E1E] text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Corridors List */}
          <div className="space-y-4">
            {filteredCorridors.map((corridor) => (
              <div
                key={corridor.id}
                className="p-6 rounded-2xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] shadow-sm hover:border-[#FF5E1E]/40 transition space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-[#FF5E1E] flex items-center justify-center font-bold text-sm">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          {corridor.nameAr}
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {corridor.code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{corridor.nameEn}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 text-center">
                      <span className="text-[10px] text-slate-400 block">المسافة المقدرة</span>
                      <span className="font-bold font-mono text-slate-900 dark:text-white">
                        {corridor.totalDistanceKm.toLocaleString()} كم
                      </span>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 text-center">
                      <span className="text-[10px] text-slate-400 block">زمن العبور التقديري</span>
                      <span className="font-bold font-mono text-[#FF5E1E]">
                        ~ {corridor.avgTransitDays} يوم
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50/50 dark:bg-[#0E121A] p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                  {corridor.descriptionAr}
                </p>

                {/* Key Border Crossings */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#FF5E1E]" />
                    أهم المنافذ الجمركية ونقاط العبور على الممر:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {corridor.keyBorderCrossings.map((cross, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-[#0B0E14] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {cross}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Transit Countries */}
                <div className="pt-2 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                  <span className="font-semibold">الدول العابرة:</span>
                  {corridor.transitCountries.map((cName, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-[11px]">
                      {cName}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Country drill-down: manage the cities of the selected country (per approved spec) ═══ */}
      {selectedCountry && (
        <Modal
          isOpen={!!selectedCountry}
          onClose={closeCountryModal}
          title={`${selectedCountry.nameAr} — إدارة المدن`}
          subtitle={`${selectedCountry.nameEn} • ISO ${selectedCountry.cca2}/${selectedCountry.cca3} — المدن المسجلة: ${selectedCountryCities.length}`}
          maxWidth="lg"
        >
          <div className="space-y-5">
            {/* Country identity summary */}
            <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0E121A] border border-slate-100 dark:border-[#1E2638]">
              <CountryFlag
                countryCode={selectedCountry.cca2}
                className="w-14 h-10 rounded shadow-sm object-cover"
                title={selectedCountry.nameEn}
              />
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[11px]">
                <div>
                  <span className="text-slate-400 block">العاصمة</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{selectedCountry.capital || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">العملة</span>
                  <span className="font-bold font-mono text-[#FF5E1E]">{selectedCountry.currencies?.join(', ') || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">رمز الاتصال</span>
                  <span className="font-bold font-mono text-slate-800 dark:text-slate-100">{selectedCountry.callingCode || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">المنطقة</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{selectedCountry.region || '—'}</span>
                </div>
              </div>
            </div>

            {/* Cities manager */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <MapPinned className="w-4 h-4 text-[#FF5E1E]" />
                  مدن {selectedCountry.nameAr}
                </h4>
                {!cityFormOpen && (
                  <button
                    type="button"
                    onClick={openAddCity}
                    className="px-3 py-1.5 rounded-xl bg-[#FF5E1E] hover:bg-[#EA580C] text-white text-xs font-bold transition shadow-md shadow-orange-500/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    إضافة مدينة
                  </button>
                )}
              </div>

              {/* Inline add / edit form */}
              {cityFormOpen && (
                <form
                  onSubmit={handleSaveCity}
                  className="p-3.5 rounded-2xl bg-orange-50/60 dark:bg-[#0E121A] border border-orange-200/70 dark:border-[#1E2638] space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-300 font-bold mb-1">
                        المدينة بالإنجليزية <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        dir="ltr"
                        autoFocus
                        placeholder="Alexandria"
                        value={cityForm.nameEn}
                        onChange={(e) => setCityForm({ ...cityForm, nameEn: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-300 font-bold mb-1">المدينة بالعربية</label>
                      <input
                        type="text"
                        dir="rtl"
                        placeholder="الإسكندرية"
                        value={cityForm.nameAr}
                        onChange={(e) => setCityForm({ ...cityForm, nameAr: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCityFormOpen(false);
                        setEditingCityId(null);
                      }}
                      className="px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 text-xs hover:bg-slate-50 transition cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={citySaving}
                      className="px-4 py-1.5 rounded-xl bg-[#FF5E1E] hover:bg-[#EA580C] disabled:opacity-60 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {citySaving && <Loader2 className="w-3 h-3 animate-spin" />}
                      {editingCityId ? 'حفظ التعديلات' : 'إضافة المدينة'}
                    </button>
                  </div>
                </form>
              )}

              {/* Cities list */}
              {selectedCountryCities.length === 0 && !cityFormOpen ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-[#1E2638]">
                  <MapPinned className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">لا توجد مدن مسجلة لهذه الدولة بعد</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    اضغط «إضافة مدينة» لتسجيل أول مدينة — تصبح متاحة فوراً في نماذج النظام
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedCountryCities.map((city) => (
                    <div
                      key={city.id}
                      className="group flex items-center justify-between gap-2 p-3 rounded-xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] hover:border-[#FF5E1E]/40 transition"
                    >
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-bold truncate ${
                            city.isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 line-through'
                          }`}
                        >
                          {city.nameAr || city.nameEn}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono truncate" dir="ltr">
                          {city.nameEn}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          title={city.isActive ? 'تعطيل المدينة' : 'تنشيط المدينة'}
                          onClick={() => handleToggleCityActive(city)}
                          className={`w-9 h-7 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                            city.isActive
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {city.isActive ? 'فعّالة' : 'معطّلة'}
                        </button>
                        <button
                          type="button"
                          title="تعديل"
                          onClick={() => openEditCity(city)}
                          className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:text-[#FF5E1E] transition flex items-center justify-center cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          title="حذف"
                          onClick={() => handleDeleteCity(city)}
                          className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:text-red-500 transition flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
