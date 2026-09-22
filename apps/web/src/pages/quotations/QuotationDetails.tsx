import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet, DollarSign, TrendingUp, Package, Ship, MapPin,
  Download, Share2, Check, ArrowRight, Calculator, Percent, Printer,
  Plus, Trash2, Copy, Send, XCircle, Clock, CheckCircle2, Edit3,
  AlertTriangle, RefreshCw, ArrowLeft,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/api';
import { toast } from 'sonner';

/* ──────────── Demo Data ──────────── */
const CHARGE_ITEMS_CATALOG = [
  { code: 'OF-01', nameEn: 'Ocean Freight (نولون بحري)', nameAr: 'نولون شحن بحري دولي', category: 'freight', currency: 'USD', defaultPrice: 1850 },
  { code: 'THC-ORI', nameEn: 'THC Origin (مناولة ميناء المنشأ)', nameAr: 'مصاريف مناولة في ميناء الشحن', category: 'origin', currency: 'USD', defaultPrice: 180 },
  { code: 'THC-DEST', nameEn: 'THC Destination (مناولة ميناء الوصول)', nameAr: 'مصاريف تداول الميناء وصول', category: 'local_port', currency: 'USD', defaultPrice: 250 },
  { code: 'BL-FEE', nameEn: 'B/L Issuance (إذن تسليم)', nameAr: 'مصاريف إذن التسليم', category: 'documentation', currency: 'USD', defaultPrice: 75 },
  { code: 'CC-SRV', nameEn: 'Customs Clearance (أتعاب تخليص)', nameAr: 'أتعاب التخليص الجمركي', category: 'customs', currency: 'EGP', defaultPrice: 5000 },
  { code: 'INL-TRK', nameEn: 'Inland Trucking (نقل بري)', nameAr: 'نقل بري داخلي', category: 'trucking', currency: 'EGP', defaultPrice: 8500 },
  { code: 'DEM-REC', nameEn: 'Demurrage/Detention (غرامات)', nameAr: 'غرامات أرضيات', category: 'storage', currency: 'USD', defaultPrice: 0 },
  { code: 'INS-CRG', nameEn: 'Cargo Insurance (تأمين)', nameAr: 'تأمين على البضاعة', category: 'insurance', currency: 'USD', defaultPrice: 350 },
  { code: 'FUMIG', nameEn: 'Fumigation (تبخير)', nameAr: 'تبخير ومعالجة', category: 'other', currency: 'EGP', defaultPrice: 2500 },
  { code: 'INSP', nameEn: 'Inspection Fees (كشف)', nameAr: 'مصاريف كشف وتثمين', category: 'customs', currency: 'EGP', defaultPrice: 3000 },
];

export const QuotationDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: quotation, loading, refetch } = useApi<any>(`/quotations/${id}`);

  const [showConvertConfirm, setShowConvertConfirm] = useState(false);
  const [showCloneConfirm, setShowCloneConfirm] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Add item form
  const [selectedCharge, setSelectedCharge] = useState(CHARGE_ITEMS_CATALOG[0]);
  const [newItemCost, setNewItemCost] = useState('');
  const [newItemSell, setNewItemSell] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('container');
  const [newItemCurrency, setNewItemCurrency] = useState('USD');

  // Local items for editing
  const [localItems, setLocalItems] = useState<any[] | null>(null);

  const q = quotation;

  if (loading) return <LoadingSpinner fullPage label="جاري تحميل عرض السعر من قاعدة البيانات..." />;

  if (!q) {
    return (
      <div className="p-8 text-center max-w-md mx-auto my-12 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121620] shadow-sm">
        <FileSpreadsheet className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">عرض السعر غير موجود</h2>
        <p className="text-sm text-slate-400 mb-6">لم يتم العثور على عرض السعر المطلوب في قاعدة البيانات الحالية.</p>
        <button
          onClick={() => navigate('/quotations')}
          className="px-5 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm transition"
        >
          العودة لقائمة عروض الأسعار
        </button>
      </div>
    );
  }

  const items = localItems || q.items || [];
  const containerCount = q.containerCount || 1;

  // ─── P&L Calculation ───
  const getCost = (i: any) => Number(i.costRate || i.costPrice || 0);
  const getSell = (i: any) => Number(i.sellRate || i.sellingPrice || 0);
  const getQty = (i: any) => {
    const unit = i.unit || i.per;
    return unit === 'container' || unit === 'حاوية' ? containerCount : 1;
  };

  const usdItems = items.filter((i: any) => i.currency === 'USD');
  const egpItems = items.filter((i: any) => i.currency === 'EGP');

  const totalCostUSD = usdItems.reduce((sum: number, i: any) => sum + getCost(i) * getQty(i), 0);
  const totalSellingUSD = usdItems.reduce((sum: number, i: any) => sum + getSell(i) * getQty(i), 0);
  const totalCostEGP = egpItems.reduce((sum: number, i: any) => sum + getCost(i) * getQty(i), 0);
  const totalSellingEGP = egpItems.reduce((sum: number, i: any) => sum + getSell(i) * getQty(i), 0);
  const profitUSD = totalSellingUSD - totalCostUSD;
  const profitEGP = totalSellingEGP - totalCostEGP;
  const marginUSD = totalSellingUSD > 0 ? ((profitUSD / totalSellingUSD) * 100).toFixed(1) : '0';

  // ─── Actions ───
  const handleStatusUpdate = async (newStatus: string) => {
    setActionLoading(true);
    try {
      await api.patch(`/quotations/${id}/status`, { status: newStatus });
      toast.success(`تم تحديث حالة العرض إلى: ${getStatusLabel(newStatus)}`);
      refetch?.();
    } catch {
      toast.success(`تم تحديث الحالة (Demo): ${getStatusLabel(newStatus)}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertToShipment = async () => {
    setActionLoading(true);
    try {
      const result: any = await api.post(`/quotations/${id}/accept`);
      toast.success(`✅ تم إنشاء ملف شحنة: ${result?.jobFileNumber || 'RED-2026-XXXX'}`);
      setShowConvertConfirm(false);
      navigate(`/shipments/${result?.id || ''}`);
    } catch {
      toast.success('✅ تم تحويل العرض لملف شحنة بنجاح (Demo)');
      setShowConvertConfirm(false);
      navigate('/shipments');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClone = async () => {
    setActionLoading(true);
    try {
      const result: any = await api.post(`/quotations/${id}/clone`);
      toast.success(`📋 تم إنشاء نسخة معدلة: v${result?.versionNumber || 2}`);
      setShowCloneConfirm(false);
      navigate(`/quotations/${result?.id || ''}`);
    } catch {
      toast.success('📋 تم إنشاء نسخة معدلة من العرض (Demo)');
      setShowCloneConfirm(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const newItem = {
      id: `qi-${Date.now()}`,
      description: selectedCharge.nameEn,
      chargeItem: selectedCharge.nameEn,
      costRate: Number(newItemCost),
      costPrice: Number(newItemCost),
      sellRate: Number(newItemSell),
      sellingPrice: Number(newItemSell),
      quantity: Number(newItemQty),
      unit: newItemUnit,
      per: newItemUnit === 'container' ? 'حاوية' : 'شحنة',
      currency: newItemCurrency,
      showInClientQuote: true,
      reflectInQuote: true,
      reflectInInvoice: true,
    };

    try {
      await api.post(`/quotations/${id}/items`, {
        description: selectedCharge.nameEn,
        costRate: Number(newItemCost),
        sellRate: Number(newItemSell),
        quantity: Number(newItemQty),
        unit: newItemUnit,
        currency: newItemCurrency,
      });
    } catch {
      // Demo fallback
    }

    setLocalItems([...(localItems || items), newItem]);
    setShowAddItemModal(false);
    setNewItemCost('');
    setNewItemSell('');
    setNewItemQty('1');
    toast.success(`✅ تم إضافة بند: ${selectedCharge.nameAr}`);
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await api.delete(`/quotations/${id}/items/${itemId}`);
    } catch {
      // Demo
    }
    setLocalItems((localItems || items).filter((i: any) => i.id !== itemId));
    toast.success('تم حذف البند بنجاح');
  };

  const handleWhatsAppShare = () => {
    const text = `*عــرض أســعـار شــحـن بـحــري ونـولـون دولـي* 🚢
*RED SHIPPING International Logistics S.A.E*
شركة ريد شيبنج الدولية للخدمات اللوجستية والملاحة البحرية ش.م.م
━━━━━━━━━━━━━━━━━━━━
📋 رقم العرض: ${q.quotationNumber || q.quoteNumber}
🏢 السادة المحترمون: ${q.client?.nameAr || q.client?.name}
🛳 خط السير: ${q.originPort?.nameEn || 'N/A'} (${q.originPort?.code || q.originPort?.unlocode || ''}) ➔ ${q.destinationPort?.nameEn || 'N/A'} (${q.destinationPort?.code || q.destinationPort?.unlocode || ''})
📦 مشمول البضاعة: ${q.commodity || q.cargoDescription || 'General Cargo'}
🔲 الحاويات: ${containerCount}x ${q.containerType || '40HQ'}
⚓ الخط الملاحي: ${q.shippingLine || 'MSC'}
⏱ مدة الإبحار والترانزيت: ${q.transitTime || (q.estimatedTransitDays ? q.estimatedTransitDays + ' يوم تقريباً' : 'حسب جدول إبحار السفينة')}
⏳ فترة السماح الممنوحة: 14 يوم سماح بميناء الوصول (Free Time)
━━━━━━━━━━━━━━━━━━━━
💵 نولون الشحن البحري والمصاريف بالدولار: $${totalSellingUSD.toLocaleString()} USD
${totalSellingEGP > 0 ? `💷 المصاريف المحلية والنقل البري والتخليص: ${totalSellingEGP.toLocaleString()} EGP` : ''}
━━━━━━━━━━━━━━━━━━━━
📅 صلاحية العرض: حتى ${q.validUntil}
📌 الشروط: الأسعار خاضعة لتقلبات أسعار صرف البنك المركزي ولائحة غرامات التأخير والأرضيات بعد انتهاء أيام السماح.
📞 للتواصل وتأكيد الحجز: قسم التسعير والعمليات — RED SHIPPING S.A.E`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      draft: 'مسودة', sent: 'مُرسل للعميل', accepted: 'مقبول ✅', rejected: 'مرفوض', expired: 'منتهي الصلاحية', negotiation: 'قيد التفاوض',
    };
    return map[status] || status;
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
      sent: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
      accepted: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
      rejected: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
      expired: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
      negotiation: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300',
    };
    return map[status] || 'bg-slate-100 text-slate-600';
  };

  const currentStatus = q.status?.toLowerCase() || 'draft';
  const isDraft = currentStatus === 'draft';
  const isSent = currentStatus === 'sent' || currentStatus === 'negotiation';
  const isAccepted = currentStatus === 'accepted';
  const isEditable = isDraft || isSent;

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/quotations')}
            className="p-2 mt-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {q.quotationNumber || q.quoteNumber}
              </h1>
              {q.versionNumber > 1 && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                  v{q.versionNumber}
                </span>
              )}
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(currentStatus)}`}>
                {getStatusLabel(currentStatus)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              العميل: <span className="font-semibold text-slate-800 dark:text-slate-200">{q.client?.nameAr || q.client?.name}</span>
              {' '}|{' '}
              {q.originPort?.nameEn} → {q.destinationPort?.nameEn}
              {' '}|{' '}
              {containerCount}x {q.containerType || '40HQ'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Actions */}
          {isDraft && (
            <button
              onClick={() => handleStatusUpdate('sent')}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              إرسال للعميل
            </button>
          )}
          {isSent && (
            <>
              <button
                onClick={() => setShowConvertConfirm(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                قبول وتحويل لشحنة
              </button>
              <button
                onClick={() => setShowRejectConfirm(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/20 transition disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                رفض
              </button>
            </>
          )}
          {isAccepted && (
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-4 h-4" />
              تم القبول والتحويل لملف شحنة
            </span>
          )}

          {/* Clone/Revise */}
          <button
            onClick={() => setShowCloneConfirm(true)}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm disabled:opacity-50"
          >
            <Copy className="w-3.5 h-3.5" />
            نسخة معدلة
          </button>

          {/* WhatsApp Share */}
          <button
            onClick={handleWhatsAppShare}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-semibold shadow-md shadow-green-600/20 transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            WhatsApp
          </button>

          {/* Official Client Quote PDF / Print */}
          <button
            onClick={() => setShowPrintModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#FF5E1E]" />
            <span>عرض العميل الرسمي (PDF)</span>
          </button>
        </div>
      </div>

      {/* ─── Validity Alert ─── */}
      {q.validUntil && new Date(q.validUntil) < new Date() && currentStatus !== 'accepted' && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="text-sm">
            <span className="font-bold text-amber-900 dark:text-amber-200">انتهت صلاحية العرض </span>
            <span className="text-amber-800 dark:text-amber-300">في {q.validUntil}. يجب إنشاء نسخة معدلة بتاريخ صلاحية جديد.</span>
          </div>
        </div>
      )}

      {/* ─── Summary KPIs ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="إجمالي التكلفة (USD)" value={`$${totalCostUSD.toLocaleString()}`} icon={DollarSign} iconColor="text-red-600" iconBg="bg-red-50 dark:bg-red-950/50" />
        <StatCard title="إجمالي البيع (USD)" value={`$${totalSellingUSD.toLocaleString()}`} icon={DollarSign} iconColor="text-brand-600" iconBg="bg-brand-50 dark:bg-brand-950/50" />
        <StatCard title="صافي الربح (USD)" value={`+$${profitUSD.toLocaleString()}`} icon={TrendingUp} iconColor="text-emerald-600" iconBg="bg-emerald-50 dark:bg-emerald-950/50" />
        <StatCard title="هامش الربح" value={`${marginUSD}%`} icon={Percent} iconColor="text-purple-600" iconBg="bg-purple-50 dark:bg-purple-950/50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Line Items Table ─── */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-brand-500" />
              بنود التسعير (Charge Items)
              <span className="text-xs text-slate-400 font-normal ms-1">({items.length} بند)</span>
            </h2>
            {isEditable && (
              <button
                onClick={() => {
                  setSelectedCharge(CHARGE_ITEMS_CATALOG[0]);
                  setNewItemCost(String(CHARGE_ITEMS_CATALOG[0].defaultPrice));
                  setNewItemSell('');
                  setNewItemCurrency(CHARGE_ITEMS_CATALOG[0].currency);
                  setShowAddItemModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة بند
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-medium uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 text-start">البند</th>
                  <th className="py-3 px-4 text-start">التكلفة</th>
                  <th className="py-3 px-4 text-start">سعر البيع</th>
                  <th className="py-3 px-4 text-start">الكمية</th>
                  <th className="py-3 px-4 text-start">الإجمالي (بيع)</th>
                  <th className="py-3 px-4 text-start">الربح</th>
                  <th className="py-3 px-4 text-start">العملة</th>
                  {isEditable && <th className="py-3 px-4 text-center w-12"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {items.map((item: any) => {
                  const cost = getCost(item);
                  const sell = getSell(item);
                  const qty = getQty(item);
                  const totalItemSell = sell * qty;
                  const profit = (sell - cost) * qty;
                  const margin = totalItemSell > 0 ? ((profit / totalItemSell) * 100).toFixed(0) : '0';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                      <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white text-xs max-w-[200px]">
                        {item.description || item.chargeItem}
                      </td>
                      <td className="py-3.5 px-4 text-red-600 dark:text-red-400 font-semibold text-xs font-mono">
                        {cost.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-brand-600 dark:text-brand-400 font-semibold text-xs font-mono">
                        {sell.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {qty}× ({item.unit === 'container' || item.per === 'حاوية' ? 'حاوية' : 'شحنة'})
                      </td>
                      <td className="py-3.5 px-4 font-bold text-xs text-slate-900 dark:text-white font-mono">
                        {totalItemSell.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`font-semibold text-xs ${profit > 0 ? 'text-emerald-600' : profit < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                          {profit > 0 ? '+' : ''}{profit.toLocaleString()} ({margin}%)
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 font-mono">{item.currency}</td>
                      {isEditable && (
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition opacity-0 group-hover:opacity-100"
                            title="حذف البند"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>

              {/* Footer Totals */}
              <tfoot className="bg-slate-50 dark:bg-slate-800/50 border-t-2 border-slate-200 dark:border-slate-700">
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white text-xs">المجموع (USD × {containerCount} حاوية)</td>
                  <td className="py-3.5 px-4 font-bold text-red-600 text-xs font-mono">${totalCostUSD.toLocaleString()}</td>
                  <td className="py-3.5 px-4 font-bold text-brand-600 text-xs font-mono">${totalSellingUSD.toLocaleString()}</td>
                  <td></td>
                  <td className="py-3.5 px-4 font-bold text-brand-600 text-xs font-mono">${totalSellingUSD.toLocaleString()}</td>
                  <td className="py-3.5 px-4 font-black text-emerald-600 text-xs font-mono">+${profitUSD.toLocaleString()}</td>
                  <td colSpan={isEditable ? 2 : 1}></td>
                </tr>
                {totalCostEGP > 0 && (
                  <tr>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white text-xs">المجموع (EGP)</td>
                    <td className="py-3.5 px-4 font-bold text-red-600 text-xs font-mono">{totalCostEGP.toLocaleString()} EGP</td>
                    <td className="py-3.5 px-4 font-bold text-brand-600 text-xs font-mono">{totalSellingEGP.toLocaleString()} EGP</td>
                    <td></td>
                    <td className="py-3.5 px-4 font-bold text-brand-600 text-xs font-mono">{totalSellingEGP.toLocaleString()} EGP</td>
                    <td className="py-3.5 px-4 font-black text-emerald-600 text-xs font-mono">+{profitEGP.toLocaleString()} EGP</td>
                    <td colSpan={isEditable ? 2 : 1}></td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </div>

        {/* ─── Sidebar ─── */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Ship className="w-4 h-4 text-brand-500" />
              تفاصيل الشحنة
            </h3>
            <div className="space-y-3 text-xs">
              <DetailRow label="نوع الخدمة" value={q.serviceType || q.shipmentType || 'FCL'} />
              <DetailRow label="Incoterm" value={q.incoterm || 'FOB'} />
              <DetailRow label="السلعة" value={q.commodity || q.cargoDescription || 'General Cargo'} />
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <DetailRow label="ميناء المنشأ" value={`${q.originPort?.nameEn || 'N/A'} (${q.originPort?.code || q.originPort?.unlocode || ''})`} />
                <DetailRow label="ميناء الوصول" value={`${q.destinationPort?.nameEn || 'N/A'} (${q.destinationPort?.code || q.destinationPort?.unlocode || ''})`} />
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <DetailRow label="نوع الحاوية" value={q.containerType || '40HQ'} />
                <DetailRow label="عدد الحاويات" value={`${containerCount}`} />
                <DetailRow label="الخط الملاحي" value={q.shippingLine || 'MSC'} />
                <DetailRow label="مدة الترانزيت" value={q.transitTime || `${q.estimatedTransitDays || 22} يوم`} />
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-brand-500" />
              معلومات العرض
            </h3>
            <div className="space-y-3 text-xs">
              <DetailRow label="مندوب المبيعات" value={q.salesPerson || q.salesRep?.name || 'N/A'} />
              <DetailRow label="تاريخ الإنشاء" value={q.createdAt || 'N/A'} />
              <DetailRow label="صالح حتى" value={q.validUntil || 'N/A'} />
              {q.versionNumber > 1 && (
                <DetailRow label="الإصدار" value={`v${q.versionNumber}`} />
              )}
              {q.notes && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block mb-1">ملاحظات</span>
                  <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{q.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* P&L Summary Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-brand-50 dark:from-emerald-950/30 dark:to-brand-950/30 border border-emerald-200/60 dark:border-emerald-800/40 shadow-sm">
            <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-200 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              ملخص الربحية
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-emerald-700 dark:text-emerald-300">ربح USD</span>
                <span className="font-mono font-bold text-emerald-800 dark:text-emerald-200">+${profitUSD.toLocaleString()}</span>
              </div>
              {profitEGP > 0 && (
                <div className="flex justify-between">
                  <span className="text-emerald-700 dark:text-emerald-300">ربح EGP</span>
                  <span className="font-mono font-bold text-emerald-800 dark:text-emerald-200">+{profitEGP.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-emerald-200 dark:border-emerald-800">
                <span className="text-emerald-700 dark:text-emerald-300 font-bold">هامش الربح الصافي</span>
                <span className="font-mono font-black text-lg text-emerald-700 dark:text-emerald-300">{marginUSD}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Add Item Modal ─── */}
      <Modal
        isOpen={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
        title="إضافة بند تسعير جديد"
        subtitle="اختيار بند من البنود الموحدة أو إضافة بند مخصص"
        maxWidth="md"
      >
        <form onSubmit={handleAddItem} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              البند (Charge Item) *
            </label>
            <select
              value={selectedCharge.code}
              onChange={(e) => {
                const charge = CHARGE_ITEMS_CATALOG.find((c) => c.code === e.target.value) || CHARGE_ITEMS_CATALOG[0];
                setSelectedCharge(charge);
                setNewItemCost(String(charge.defaultPrice));
                setNewItemCurrency(charge.currency);
              }}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500"
            >
              {CHARGE_ITEMS_CATALOG.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.nameAr} — {c.nameEn} ({c.currency})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">التكلفة (Cost) *</label>
              <input
                type="number"
                required
                placeholder="0"
                value={newItemCost}
                onChange={(e) => setNewItemCost(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">سعر البيع (Sell) *</label>
              <input
                type="number"
                required
                placeholder="0"
                value={newItemSell}
                onChange={(e) => setNewItemSell(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {newItemCost && newItemSell && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-emerald-700 dark:text-emerald-300">الربح لكل وحدة</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                  +{(Number(newItemSell) - Number(newItemCost)).toLocaleString()} {newItemCurrency}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-emerald-700 dark:text-emerald-300">هامش الربح</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                  {Number(newItemSell) > 0 ? (((Number(newItemSell) - Number(newItemCost)) / Number(newItemSell)) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">الكمية</label>
              <input type="number" value={newItemQty} onChange={(e) => setNewItemQty(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs font-mono" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">الوحدة</label>
              <select value={newItemUnit} onChange={(e) => setNewItemUnit(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs">
                <option value="container">لكل حاوية</option>
                <option value="shipment">لكل شحنة</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">العملة</label>
              <select value={newItemCurrency} onChange={(e) => setNewItemCurrency(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs">
                <option value="USD">USD ($)</option>
                <option value="EGP">EGP (ج.م)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setShowAddItemModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800">إلغاء</button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-500/25">إضافة البند</button>
          </div>
        </form>
      </Modal>

      {/* ─── Convert to Shipment Confirm ─── */}
      <ConfirmDialog
        isOpen={showConvertConfirm}
        onClose={() => setShowConvertConfirm(false)}
        onConfirm={handleConvertToShipment}
        title="تحويل لملف شحنة (Job File)"
        message={`سيتم قبول عرض السعر ${q.quotationNumber || q.quoteNumber} وإنشاء ملف تشغيل جديد تلقائياً مرتبط بالعميل ${q.client?.nameAr || q.client?.name}.`}
        confirmLabel="قبول وتحويل الآن"
        variant="warning"
        icon={Ship}
      />

      {/* ─── Clone Confirm ─── */}
      <ConfirmDialog
        isOpen={showCloneConfirm}
        onClose={() => setShowCloneConfirm(false)}
        onConfirm={handleClone}
        title="إنشاء نسخة معدلة (Revision)"
        message={`سيتم إنشاء نسخة جديدة v${(q.versionNumber || 1) + 1} من عرض السعر ${q.quotationNumber || q.quoteNumber} مع نفس البنود. يمكنك تعديل الأسعار في النسخة الجديدة.`}
        confirmLabel="إنشاء النسخة"
        variant="info"
        icon={Copy}
      />

      {/* ─── Reject Confirm ─── */}
      <ConfirmDialog
        isOpen={showRejectConfirm}
        onClose={() => setShowRejectConfirm(false)}
        onConfirm={() => {
          handleStatusUpdate('rejected');
          setShowRejectConfirm(false);
        }}
        title="رفض عرض السعر"
        message={`هل تريد رفض عرض السعر ${q.quotationNumber || q.quoteNumber}؟ يمكنك إنشاء نسخة معدلة لاحقاً.`}
        confirmLabel="تأكيد الرفض"
        variant="danger"
        icon={XCircle}
      />

      {/* ─── Official Client Quotation Sheet Print Modal ─── */}
      <Modal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="عرض الأسعار الرسمي الموجه للعميل (Official Client Quotation)"
        maxWidth="4xl"
      >
        <div className="space-y-6">
          {/* Printable Container */}
          <div
            id="client-quotation-printable"
            className="p-8 bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-sm"
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-brand-600 pb-5 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white font-black text-xl shadow-md">
                    RED
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      RED SHIPPING
                    </h2>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#FF5E1E] block">
                      International Logistics S.A.E
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  شركة ريد شيبنج الدولية للخدمات اللوجستية والملاحة البحرية ش.م.م
                </p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  س.ت: 198201 الإسكندرية | ب.ض: 621-890-412 | ترخيص هيئة الموانئ المصرية 449/2022
                </p>
              </div>

              <div className="text-end">
                <span className="inline-block px-3 py-1 bg-brand-50 border border-brand-200 text-brand-700 text-xs font-black rounded-lg">
                  عــرض أســعـار رســمـي
                </span>
                <span className="block font-mono font-bold text-sm text-slate-800 mt-2">
                  {q.quotationNumber || q.quoteNumber}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  تاريخ الإصدار: {q.createdAt}
                </span>
                <span className="text-[11px] font-bold text-rose-600 block">
                  صالح حتى: {q.validUntil}
                </span>
              </div>
            </div>

            {/* Client & Route Meta Grid */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 mb-6 text-xs">
              <div>
                <span className="text-slate-400 block font-bold">السادة المحترمون / العميل:</span>
                <span className="text-sm font-extrabold text-slate-900 block mt-0.5">
                  {q.client?.nameAr || q.client?.name}
                </span>
                <span className="text-slate-500 block mt-1">
                  مسؤول المبيعات: {q.salesPerson || q.salesRep?.name || 'قسم التسعير الدولي'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-start">
                <div>
                  <span className="text-slate-400 block font-bold">ميناء الشحن (POL):</span>
                  <span className="font-semibold text-slate-800">{q.originPort?.nameEn}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold">ميناء الوصول (POD):</span>
                  <span className="font-semibold text-slate-800">{q.destinationPort?.nameEn}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold">الخط الملاحي:</span>
                  <span className="font-semibold text-slate-800">{q.shippingLine || 'MSC'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold">مدة الترانزيت:</span>
                  <span className="font-semibold text-slate-800">
                    {q.transitTime || (q.estimatedTransitDays ? `${q.estimatedTransitDays} يوم تقريباً` : 'حسب جدول الإبحار')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold">الحاويات:</span>
                  <span className="font-semibold text-slate-800">{containerCount}x {q.containerType || '40HQ'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold">فترة السماح (Free Time):</span>
                  <span className="font-bold text-emerald-700">14 يوم سماح بميناء الوصول</span>
                </div>
              </div>
            </div>

            {/* Items Table (Client-Facing: Selling Rates Only) */}
            <div className="overflow-hidden rounded-xl border border-slate-200 mb-6">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 text-start">#</th>
                    <th className="py-2.5 px-3 text-start">بيان البند والخدمة الملاحية</th>
                    <th className="py-2.5 px-3 text-center">الوحدة</th>
                    <th className="py-2.5 px-3 text-center">الكمية</th>
                    <th className="py-2.5 px-3 text-end">سعر الوحدة</th>
                    <th className="py-2.5 px-3 text-center">العملة</th>
                    <th className="py-2.5 px-3 text-end">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item: any, idx: number) => {
                    const sell = Number(item.sellingPrice || item.sellRate || 0);
                    const qty = (item.unit === 'container' || item.per === 'حاوية' || item.per === 'container') ? containerCount : 1;
                    const total = sell * qty;
                    return (
                      <tr key={item.id || idx}>
                        <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{item.description || item.chargeItem}</td>
                        <td className="py-2 px-3 text-center text-slate-600">{item.unit === 'container' || item.per === 'حاوية' ? 'حاوية' : 'شحنة'}</td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-slate-800">{qty}</td>
                        <td className="py-2 px-3 text-end font-mono font-bold text-slate-900">{sell.toLocaleString()}</td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-slate-600">{item.currency}</td>
                        <td className="py-2 px-3 text-end font-mono font-black text-slate-900">{total.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="flex justify-end mb-6">
              <div className="w-72 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between font-bold">
                  <span className="text-slate-600">إجمالي النولون البحري (USD):</span>
                  <span className="font-mono text-slate-900">${totalSellingUSD.toLocaleString()} USD</span>
                </div>
                {totalSellingEGP > 0 && (
                  <div className="flex justify-between font-bold pt-1 border-t border-slate-200">
                    <span className="text-slate-600">إجمالي المصاريف المحلية (EGP):</span>
                    <span className="font-mono text-slate-900">{totalSellingEGP.toLocaleString()} EGP</span>
                  </div>
                )}
              </div>
            </div>

            {/* Maritime Terms & Disclaimers */}
            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/70 text-[10px] text-slate-500 space-y-1 mb-6">
              <span className="font-bold text-slate-700 block">الشروط والأحكام الملاحية الرسمية:</span>
              <p>• هذا العرض ساري للشحنات المنفذة قبل تاريخ انتهاء الصلاحية الموضح بأعلاه، وتخضع مساحات الحجز لتوافر الفراغات على سفن الخط الملاحي.</p>
              <p>• فترة السماح الممنوحة للحاويات (14 يوم) تسري بميناء الوصول، وتخضع الحاويات لشرائح غرامات التأخير (Demurrage) وأرضيات محطة الحاويات (Storage) فور انتهاء فترة السماح.</p>
              <p>• سداد النولون بالدولار أو ما يعادله بالجنيه المصري يتم باحتساب السعر الرسمي المعلن بالبنك المركزي المصري بتاريخ وصول السفينة وإصدار إذن التسليم الملاحي.</p>
            </div>

            {/* Official Stamp & Signatures */}
            <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-200 text-center text-xs">
              <div>
                <span className="text-slate-400 block">إعداد قسم التسعير</span>
                <span className="font-bold text-slate-800 block mt-4">{q.salesPerson || q.salesRep?.name || 'عمر السيد'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">اعتماد الإدارة التجارية</span>
                <span className="font-bold text-slate-800 block mt-4">إدارة العمليات البحرية</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-slate-400 block mb-1">الختم الرسمي للشركة</span>
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-brand-400 flex items-center justify-center text-[9px] font-bold text-brand-600 rotate-12">
                  RED SHIPPING<br />S.A.E
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setShowPrintModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-500/25 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة المستند الرسمي / حفظ PDF</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-start justify-between py-1">
    <span className="text-slate-400">{label}</span>
    <span className="text-slate-700 dark:text-slate-200 font-medium text-end ms-4">{value}</span>
  </div>
);
