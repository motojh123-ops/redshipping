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
import { Loader2, Plus, Edit2, Trash2, MapPinned, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '../../components/ui/Modal';
import { exportToCsv } from '../../utils/exportUtils';
import { PortDefinition, TradeCorridor, CountryDefinition } from '@banna/shared-types';

/** Managed city row from /masters/cities (Country Atlas drill-down) */
interface AtlasCity {
  id: string;
  countryCode: string;
  nameEn: string;
  nameAr: string | null;
  state: string | null;
  cityCode: string | null;
  timezone: string | null;
  latitude: number | null;
  longitude: number | null;
  isLogisticsHub: boolean;
  notes: string | null;
  isActive: boolean;
}

/** Suggested timezones for the city form datalist */
const COMMON_TIMEZONES = [
  'Africa/Cairo',
  'Africa/Casablanca',
  'Africa/Nairobi',
  'Africa/Lagos',
  'Africa/Johannesburg',
  'Asia/Riyadh',
  'Asia/Dubai',
  'Asia/Doha',
  'Asia/Kuwait',
  'Asia/Amman',
  'Asia/Beirut',
  'Asia/Istanbul',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Singapore',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rotterdam',
  'Europe/Antwerp',
  'Europe/Hamburg',
  'Europe/Madrid',
  'Europe/Genoa',
  'America/New_York',
  'America/Los_Angeles',
  'Australia/Sydney',
  'UTC',
];

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
  const [customPorts, setCustomPorts] = useState<any[]>([]);
  const [cityFormOpen, setCityFormOpen] = useState(false);
  const [editingCityId, setEditingCityId] = useState<string | null>(null);
  const [citySaving, setCitySaving] = useState(false);
  const [cityForm, setCityForm] = useState({
    nameEn: '',
    nameAr: '',
    state: '',
    cityCode: '',
    timezone: '',
    latitude: '',
    longitude: '',
    isLogisticsHub: false,
    isActive: true,
    notes: '',
  });

  // Country drill-down modal UI state
  const [modalTab, setModalTab] = useState<'overview' | 'cities' | 'ports'>('cities');
  const [citySearch, setCitySearch] = useState('');
  const [cityStatusFilter, setCityStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');

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

  /** Custom ports added by the user in the ports registry (companyId set) —
   *  they are linked to the atlas country and shown inside its drill-down. */
  const refreshCustomPorts = async () => {
    try {
      const data: any = await api.get('/masters/ports');
      const arr = Array.isArray(data) ? data : data?.data || [];
      setCustomPorts(arr.filter((p: any) => p.companyId));
    } catch {
      setCustomPorts([]);
    }
  };

  useEffect(() => {
    refreshCustomPorts();
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

  /** drill into a country: open the manager modal on its cities tab */
  const openCountry = (country: CountryDefinition) => {
    setSelectedCountry(country);
    setModalTab('cities');
    setCitySearch('');
    setCityStatusFilter('all');
    setCityFormOpen(false);
    setEditingCityId(null);
  };

  /** timezone suggestion taken from the country's first known port */
  const suggestedTimezone = (country: CountryDefinition) =>
    ports.find((p) => p.countryCode === country.cca2)?.timeZone || '';

  const openAddCity = () => {
    if (!selectedCountry) return;
    setEditingCityId(null);
    setCityForm({
      nameEn: '',
      nameAr: '',
      state: '',
      cityCode: '',
      timezone: suggestedTimezone(selectedCountry),
      latitude: '',
      longitude: '',
      isLogisticsHub: false,
      isActive: true,
      notes: '',
    });
    setCityFormOpen(true);
  };

  const openEditCity = (city: AtlasCity) => {
    setEditingCityId(city.id);
    setCityForm({
      nameEn: city.nameEn,
      nameAr: city.nameAr || '',
      state: city.state || '',
      cityCode: city.cityCode || '',
      timezone: city.timezone || '',
      latitude: city.latitude !== null && city.latitude !== undefined ? String(city.latitude) : '',
      longitude: city.longitude !== null && city.longitude !== undefined ? String(city.longitude) : '',
      isLogisticsHub: Boolean(city.isLogisticsHub),
      isActive: Boolean(city.isActive),
      notes: city.notes || '',
    });
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

    const latRaw = cityForm.latitude.trim();
    const lngRaw = cityForm.longitude.trim();
    if ((latRaw && !lngRaw) || (!latRaw && lngRaw)) {
      toast.error('أدخل خطي العرض والطول معاً أو اتركهما فارغين');
      return;
    }
    let latitude: number | null = null;
    let longitude: number | null = null;
    if (latRaw && lngRaw) {
      latitude = Number(latRaw);
      longitude = Number(lngRaw);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
        toast.error('خط العرض يجب أن يكون بين -90 و 90');
        return;
      }
      if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        toast.error('خط الطول يجب أن يكون بين -180 و 180');
        return;
      }
    }

    const payload: Record<string, unknown> = {
      nameEn,
      nameAr: cityForm.nameAr.trim() || null,
      state: cityForm.state.trim() || null,
      cityCode: cityForm.cityCode.trim() || null,
      timezone: cityForm.timezone.trim() || null,
      latitude,
      longitude,
      isLogisticsHub: cityForm.isLogisticsHub,
      isActive: cityForm.isActive,
      notes: cityForm.notes.trim() || null,
    };

    setCitySaving(true);
    try {
      if (editingCityId) {
        await api.patch(`/masters/cities/${editingCityId}`, payload);
        toast.success('تم تحديث المدينة بنجاح');
      } else {
        await api.post('/masters/cities', { ...payload, countryCode: selectedCountry.cca2.toUpperCase() });
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

  /** ports of the drilled-in country — customs (tenant) + static maritime registry */
  const selectedCountryPorts = useMemo(() => {
    if (!selectedCountry) return [];
    const cc = selectedCountry.cca2.toUpperCase();
    const custom: any[] = customPorts
      .filter((p) => (p.countryCode || '').toUpperCase() === cc)
      .map((p: any) => ({
        unlocode: p.code,
        name: p.nameEn,
        nameAr: p.nameAr || p.nameEn,
        country: selectedCountry.nameEn,
        countryCode: cc,
        flagEmoji: '🏴',
        coordinates: null,
        portType: p.portType,
        isDryPort: p.portType === 'dry',
        city: '',
        terminals: [],
        isCustom: true,
        portTypeLabel: p.portTypeRef?.nameAr || p.portTypeRef?.nameEn || null,
      }));
    const statik = ports.filter((p) => p.countryCode === selectedCountry.cca2);
    return [...custom, ...statik];
  }, [ports, customPorts, selectedCountry]);

  /** city stats for the drilled-in country */
  const selectedCountryStats = useMemo(() => {
    const total = selectedCountryCities.length;
    const active = selectedCountryCities.filter((c) => c.isActive).length;
    const hubs = selectedCountryCities.filter((c) => c.isLogisticsHub).length;
    return { total, active, disabled: total - active, hubs };
  }, [selectedCountryCities]);

  /** cities shown in the modal after search + status filter */
  const filteredModalCities = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    return selectedCountryCities.filter((c) => {
      if (cityStatusFilter === 'active' && !c.isActive) return false;
      if (cityStatusFilter === 'disabled' && c.isActive) return false;
      if (!q) return true;
      return (
        c.nameEn.toLowerCase().includes(q) ||
        (c.nameAr || '').toLowerCase().includes(q) ||
        (c.state || '').toLowerCase().includes(q) ||
        (c.cityCode || '').toLowerCase().includes(q) ||
        (c.timezone || '').toLowerCase().includes(q)
      );
    });
  }, [selectedCountryCities, citySearch, cityStatusFilter]);

  /** CSV export of the visible city list */
  const handleExportCities = () => {
    if (!selectedCountry) return;
    exportToCsv(`cities-${selectedCountry.cca2}`, filteredModalCities, [
      { header: 'الكود', accessor: (c: AtlasCity) => c.cityCode || '' },
      { header: 'المدينة (عربي)', accessor: (c: AtlasCity) => c.nameAr || '' },
      { header: 'City', accessor: (c: AtlasCity) => c.nameEn },
      { header: 'المحافظة / المنطقة', accessor: (c: AtlasCity) => c.state || '' },
      { header: 'المنطقة الزمنية', accessor: (c: AtlasCity) => c.timezone || '' },
      { header: 'خط العرض', accessor: (c: AtlasCity) => c.latitude ?? '' },
      { header: 'خط الطول', accessor: (c: AtlasCity) => c.longitude ?? '' },
      { header: 'مركز لوجستي', accessor: (c: AtlasCity) => (c.isLogisticsHub ? 'نعم' : 'لا') },
      { header: 'الحالة', accessor: (c: AtlasCity) => (c.isActive ? 'فعّالة' : 'معطّلة') },
      { header: 'ملاحظات', accessor: (c: AtlasCity) => c.notes || '' },
    ]);
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
                onClick={() => openCountry(country)}
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
          title={`${selectedCountry.nameAr} — عمق الدولة`}
          subtitle={`${selectedCountry.nameEn} • ISO ${selectedCountry.cca2}/${selectedCountry.cca3}`}
          maxWidth="4xl"
        >
          <div className="space-y-4">
            {/* Country banner */}
            <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0E121A] border border-slate-100 dark:border-[#1E2638]">
              <CountryFlag
                countryCode={selectedCountry.cca2}
                className="w-16 h-11 rounded shadow-sm object-cover"
                title={selectedCountry.nameEn}
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{selectedCountry.nameAr}</h3>
                <p className="text-[11px] text-slate-400 font-mono truncate" dir="ltr">
                  {selectedCountry.nameEn}
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold">
                <span className="px-2.5 py-1 rounded-lg bg-orange-500/10 text-[#FF5E1E] border border-orange-500/20 flex items-center gap-1">
                  <MapPinned className="w-3 h-3" />
                  {selectedCountryCities.length} مدينة
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-500 border border-sky-500/20 flex items-center gap-1">
                  <Anchor className="w-3 h-3" />
                  {selectedCountryPorts.length} ميناء
                </span>
              </div>
            </div>

            {/* Modal tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#0B0E14] border border-slate-200 dark:border-[#1E2638] w-fit">
              {([
                { key: 'overview', label: 'نظرة عامة', icon: Info },
                { key: 'cities', label: `المدن (${selectedCountryCities.length})`, icon: MapPinned },
                { key: 'ports', label: `الموانئ (${selectedCountryPorts.length})`, icon: Anchor },
              ] as const).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setModalTab(t.key)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    modalTab === t.key
                      ? 'bg-[#FF5E1E] text-white shadow-md shadow-orange-500/20'
                      : 'text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Tab: overview ── */}
            {modalTab === 'overview' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[
                  { label: 'العاصمة', value: selectedCountry.capital || '—', icon: Building2 },
                  { label: 'المنطقة', value: selectedCountry.region || '—', icon: Compass },
                  { label: 'المنطقة الفرعية', value: selectedCountry.subregion || '—', icon: Globe2 },
                  { label: 'العملة', value: selectedCountry.currencies?.join('، ') || '—', icon: Coins },
                  { label: 'رمز الاتصال', value: selectedCountry.callingCode || '—', icon: Phone },
                  { label: 'ISO (Alpha-2/3)', value: `${selectedCountry.cca2} / ${selectedCountry.cca3}`, icon: ShieldCheck },
                  { label: 'الإحداثيات', value: selectedCountry.latlng?.join('، ') || '—', icon: Navigation },
                  { label: 'المدن المسجلة', value: String(selectedCountryCities.length), icon: MapPinned },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638]">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold">
                      <item.icon className="w-3.5 h-3.5 text-[#FF5E1E]" />
                      {item.label}
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-white mt-1 truncate" dir="auto">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* ── Tab: cities ── */}
            {modalTab === 'cities' && (
            <div className="space-y-3">
              {/* Stats chips */}
              <div className="flex items-center gap-2 flex-wrap text-[10px] font-bold">
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  الإجمالي: {selectedCountryStats.total}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  فعّالة: {selectedCountryStats.active}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-500/10 text-slate-400 border border-slate-500/20">
                  معطّلة: {selectedCountryStats.disabled}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  مراكز لوجستية: {selectedCountryStats.hubs}
                </span>
              </div>

              {/* Toolbar: search + status filter + export + add */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    placeholder="ابحث بالمدينة أو المحافظة أو الكود أو المنطقة الزمنية..."
                    className="w-full ps-9 pe-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-[#1E2638] text-xs"
                  />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {([
                    { key: 'all', label: 'الكل' },
                    { key: 'active', label: 'فعّالة' },
                    { key: 'disabled', label: 'معطّلة' },
                  ] as const).map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setCityStatusFilter(f.key)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        cityStatusFilter === f.key
                          ? 'bg-[#FF5E1E] text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    title="تصدير المدن الظاهرة (CSV/Excel)"
                    disabled={filteredModalCities.length === 0}
                    onClick={handleExportCities}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#FF5E1E] transition flex items-center gap-1 text-[11px] font-bold disabled:opacity-40 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    تصدير
                  </button>
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
              </div>

              {/* Inline add / edit form */}
              {cityFormOpen && (
                <form
                  onSubmit={handleSaveCity}
                  className="p-3.5 rounded-2xl bg-orange-50/60 dark:bg-[#0E121A] border border-orange-200/70 dark:border-[#1E2638] space-y-3"
                >
                  <p className="text-xs font-bold text-[#FF5E1E] flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    {editingCityId ? 'تعديل بيانات المدينة' : 'إضافة مدينة جديدة'}
                  </p>

                  {/* Row 1: names + state */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-300 font-bold mb-1">المحافظة / المنطقة</label>
                      <input
                        type="text"
                        dir="rtl"
                        placeholder="مثال: مطروح"
                        value={cityForm.state}
                        onChange={(e) => setCityForm({ ...cityForm, state: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                  </div>
                  {/* Row 2: code + timezone + coordinates */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-300 font-bold mb-1">كود المدينة (اختياري)</label>
                      <input
                        type="text"
                        dir="ltr"
                        maxLength={20}
                        placeholder="EG-ALX"
                        value={cityForm.cityCode}
                        onChange={(e) => setCityForm({ ...cityForm, cityCode: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-300 font-bold mb-1">المنطقة الزمنية</label>
                      <input
                        type="text"
                        dir="ltr"
                        list="city-tz-options"
                        placeholder="Africa/Cairo"
                        value={cityForm.timezone}
                        onChange={(e) => setCityForm({ ...cityForm, timezone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                      />
                      <datalist id="city-tz-options">
                        {Array.from(
                          new Set([
                            ...COMMON_TIMEZONES,
                            ...(selectedCountry
                              ? selectedCountryPorts.map((p) => p.timeZone).filter(Boolean)
                              : []),
                          ]),
                        ).map((tz) => (
                          <option key={tz} value={tz} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-300 font-bold mb-1">خط العرض</label>
                      <input
                        type="number"
                        step="any"
                        min="-90"
                        max="90"
                        dir="ltr"
                        placeholder="31.2001"
                        value={cityForm.latitude}
                        onChange={(e) => setCityForm({ ...cityForm, latitude: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-300 font-bold mb-1">خط الطول</label>
                      <input
                        type="number"
                        step="any"
                        min="-180"
                        max="180"
                        dir="ltr"
                        placeholder="29.9187"
                        value={cityForm.longitude}
                        onChange={(e) => setCityForm({ ...cityForm, longitude: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                      />
                    </div>
                  </div>
                  {/* Row 3: flags */}
                  <div className="flex items-center gap-5 flex-wrap">
                    <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cityForm.isLogisticsHub}
                        onChange={(e) => setCityForm({ ...cityForm, isLogisticsHub: e.target.checked })}
                        className="w-4 h-4 accent-[#FF5E1E] cursor-pointer"
                      />
                      <Building2 className="w-3.5 h-3.5 text-amber-500" />
                      مركز لوجستي رئيسي
                    </label>
                    <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cityForm.isActive}
                        onChange={(e) => setCityForm({ ...cityForm, isActive: e.target.checked })}
                        className="w-4 h-4 accent-[#FF5E1E] cursor-pointer"
                      />
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      مدينة فعّالة (تظهر في نماذج النظام)
                    </label>
                  </div>

                  {/* Row 4: notes */}
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-300 font-bold mb-1">ملاحظات</label>
                    <textarea
                      rows={2}
                      dir="rtl"
                      placeholder="أي تفاصيل إضافية (مناطق الخدمة، مكاتب، تعليمات تشغيل...)"
                      value={cityForm.notes}
                      onChange={(e) => setCityForm({ ...cityForm, notes: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs resize-y"
                    />
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

              {/* Cities list (search + filter applied) */}
              {filteredModalCities.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-[#1E2638]">
                  <MapPinned className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  {selectedCountryCities.length === 0 ? (
                    <>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">لا توجد مدن مسجلة لهذه الدولة بعد</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        اضغط «إضافة مدينة» لتسجيل أول مدينة — تصبح متاحة فوراً في نماذج النظام
                      </p>
                    </>
                  ) : (
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">لا توجد نتائج مطابقة للبحث أو التصفية الحالية</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredModalCities.map((city) => (
                    <div
                      key={city.id}
                      className="group p-3 rounded-xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] hover:border-[#FF5E1E]/40 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p
                            className={`text-xs font-bold truncate flex items-center gap-1 ${
                              city.isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 line-through'
                            }`}
                          >
                            {city.nameAr || city.nameEn}
                            {city.isLogisticsHub && <Building2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
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

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px] text-slate-400">
                        {city.state && <span>المحافظة: <span className="text-slate-600 dark:text-slate-300">{city.state}</span></span>}
                        {city.cityCode && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono" dir="ltr">
                            {city.cityCode}
                          </span>
                        )}
                        {city.timezone && (
                          <span className="flex items-center gap-1 font-mono" dir="ltr">
                            <Clock className="w-3 h-3" />
                            {city.timezone}
                          </span>
                        )}
                        {city.latitude !== null && city.longitude !== null && (
                          <span className="flex items-center gap-1 font-mono" dir="ltr">
                            <Navigation className="w-3 h-3 text-[#FF5E1E]" />
                            {city.latitude.toFixed(4)}، {city.longitude.toFixed(4)}
                          </span>
                        )}
                      </div>

                      {city.notes && (
                        <p className="mt-1.5 text-[10px] text-slate-400 truncate" title={city.notes}>
                          📝 {city.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}

            {/* ── Tab: ports (static maritime registry for this country) ── */}
            {modalTab === 'ports' && (
              <div className="space-y-3">
                {selectedCountryPorts.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-[#1E2638]">
                    <Anchor className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">لا توجد موانئ مسجلة لهذه الدولة في السجل البحري العالمي</p>
                    <p className="text-[11px] text-slate-400 mt-1">يمكن إضافة موانئ مخصصة من شاشة «سجل الموانئ» في موديول المرجعيات</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {selectedCountryPorts.map((port) => (
                      <div key={port.unlocode} className="p-3 rounded-xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638]">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-orange-50 dark:bg-orange-500/10 text-[#FF5E1E] border border-orange-200 dark:border-orange-500/20">
                              {port.unlocode}
                            </span>
                            {port.isCustom && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-500/10 text-[#FF5E1E] border border-orange-500/20">
                                مخصص
                              </span>
                            )}
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              port.portType === 'land_crossing'
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                : port.isDryPort || port.portType === 'dry'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : 'bg-sky-500/10 text-sky-500 border border-sky-500/20'
                            }`}
                          >
                            {(port as any).portTypeLabel ||
                              (port.portType === 'land_crossing'
                                ? 'منفذ بري'
                                : port.isDryPort || port.portType === 'dry'
                                ? 'ميناء جاف'
                                : port.portType === 'air'
                                ? 'مطار'
                                : 'ميناء بحري')}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white mt-1.5 truncate">{port.nameAr}</p>
                        <p className="text-[10px] text-slate-400 truncate" dir="ltr">
                          {port.name}
                          {port.city ? ` • ${port.city}` : ''}
                        </p>
                        {port.coordinates && (
                          <p className="text-[10px] text-slate-400 font-mono mt-1" dir="ltr">
                            {port.coordinates.lat}, {port.coordinates.lng}
                          </p>
                        )}
                        {port.customsAuthorityCode && (
                          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-[#FF5E1E]" />
                            رمز الجمارك: <span className="font-mono">{port.customsAuthorityCode}</span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
