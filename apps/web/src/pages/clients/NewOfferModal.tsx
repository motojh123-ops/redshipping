import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { PortOptions } from '../../components/ui/PortSelect';
import { Check, Ship } from 'lucide-react';
import { api } from '../../services/api';

interface NewOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId: string;
  clientName?: string;
  branches?: any[];
}

const SERVICES = [
  { key: 'shipping', labelAr: 'شحن (Freight)' },
  { key: 'clearance', labelAr: 'تخليص جمركي (Clearance)' },
  { key: 'transport', labelAr: 'نقل داخلي (Transport)' },
];

const CONTAINER_TYPES = ['20GP', '40GP', '40HQ', '45HQ', '20RF', '40RF', 'OPEN_TOP', 'FLAT_RACK'];

/** New Offer (وثيقة العملاء والعمليات §3/§4) — يُنشأ من داخل ملف العميل المستهدف:
 *  نوع الشحنة (شحن/تخليص/نقل — أي مجموعة) + POL/POD + ميناء التخليص وعنوان التحميل
 *  + وصف البضاعة والحاوية والكمية + ملاحظات التسعير → فريق التسعير. */
export const NewOfferModal: React.FC<NewOfferModalProps> = ({
  isOpen, onClose, onSuccess, clientId, clientName, branches = [],
}) => {
  const [loading, setLoading] = useState(false);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [form, setForm] = useState({
    originPortId: '', destinationPortId: '', clearancePortId: '',
    pickupBranchId: '', pickupAddressText: '',
    goodsDescription: '', containerType: '', containerQty: '',
    pricingNotes: '', specialRequirements: '',
  });

  const toggleService = (key: string) =>
    setServiceTypes((prev) => (prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]));

  const needsClearance = serviceTypes.includes('clearance');
  const needsPickup = serviceTypes.includes('transport') || needsClearance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (serviceTypes.length === 0) { alert('حدد نوع الشحنة: شحن و/أو تخليص و/أو نقل'); return; }
    setLoading(true);
    try {
      await api.post('/quotations', {
        clientId,
        serviceTypes,
        originPortId: form.originPortId || undefined,
        destinationPortId: form.destinationPortId || undefined,
        clearancePortId: needsClearance ? (form.clearancePortId || undefined) : undefined,
        pickupBranchId: needsPickup && form.pickupBranchId ? form.pickupBranchId : undefined,
        pickupAddressText: needsPickup && !form.pickupBranchId ? (form.pickupAddressText || undefined) : undefined,
        goodsDescription: form.goodsDescription || undefined,
        containerType: form.containerType || undefined,
        containerQty: form.containerQty ? Number(form.containerQty) : undefined,
        pricingNotes: form.pricingNotes || undefined,
        specialRequirements: form.specialRequirements || undefined,
        shipmentType: 'fcl',
        incoterm: 'FOB',
        currency: 'USD',
        items: [],
      });
      setServiceTypes([]);
      setForm({
        originPortId: '', destinationPortId: '', clearancePortId: '',
        pickupBranchId: '', pickupAddressText: '',
        goodsDescription: '', containerType: '', containerQty: '',
        pricingNotes: '', specialRequirements: '',
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'تعذر إنشاء عرض السعر — حاول مجدداً');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white';
  const labelCls = 'block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="عرض سعر جديد (New Offer)"
      subtitle={`${clientName ? clientName + ' — ' : ''}يُرسل الطلب إلى فريق التسعير، وعند القبول يُفتح ملف العملية ويُرقّى العميل تلقائياً`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* نوع الشحنة — أي مزيج من الشحن / التخليص / النقل */}
        <div>
          <label className={labelCls}>نوع الشحنة (Service Type) <span className="text-red-500">*</span></label>
          <div className="flex flex-wrap gap-2">
            {SERVICES.map((s) => (
              <button key={s.key} type="button" onClick={() => toggleService(s.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  serviceTypes.includes(s.key)
                    ? 'bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-600/20'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-brand-400'
                }`}>
                {s.labelAr}
              </button>
            ))}
          </div>
        </div>

        {/* POL / POD */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>ميناء الشحن (POL)</label>
            <select value={form.originPortId} onChange={(e) => setForm({ ...form, originPortId: e.target.value })} className={inputCls}>
              <option value="">— اختر ميناء الشحن —</option>
              <PortOptions />
            </select>
          </div>
          <div>
            <label className={labelCls}>ميناء التفريغ (POD)</label>
            <select value={form.destinationPortId} onChange={(e) => setForm({ ...form, destinationPortId: e.target.value })} className={inputCls}>
              <option value="">— اختر ميناء التفريغ —</option>
              <PortOptions />
            </select>
          </div>
        </div>

        {/* ميناء التخليص — يظهر عند اختيار خدمة التخليص */}
        {needsClearance && (
          <div>
            <label className={labelCls}>ميناء التخليص (Clearance Port)</label>
            <select value={form.clearancePortId} onChange={(e) => setForm({ ...form, clearancePortId: e.target.value })} className={inputCls}>
              <option value="">— اختر ميناء التخليص —</option>
              <PortOptions />
            </select>
          </div>
        )}

        {/* عنوان التحميل — من فروع العميل أو إدخال يدوي */}
        {needsPickup && (
          <div className="space-y-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div>
              <label className={labelCls}>عنوان التحميل (Pickup Address)</label>
              {branches.filter((b: any) => b.isActive).length > 0 ? (
                <select value={form.pickupBranchId} onChange={(e) => setForm({ ...form, pickupBranchId: e.target.value })} className={inputCls}>
                  <option value="">— إدخال يدوي —</option>
                  {branches.filter((b: any) => b.isActive).map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}{b.address ? ` — ${b.address}` : ''}</option>
                  ))}
                </select>
              ) : (
                <input dir="rtl" placeholder="مثال: مخزن العميل بالعاشر — طريق السويس" value={form.pickupAddressText}
                  onChange={(e) => setForm({ ...form, pickupAddressText: e.target.value })} className={inputCls} />
              )}
            </div>
            {branches.filter((b: any) => b.isActive).length > 0 && !form.pickupBranchId && (
              <div>
                <label className={labelCls}>العنوان تفصيلياً</label>
                <input dir="rtl" placeholder="مثال: مخزن العميل بالعاشر — طريق السويس" value={form.pickupAddressText}
                  onChange={(e) => setForm({ ...form, pickupAddressText: e.target.value })} className={inputCls} />
              </div>
            )}
          </div>
        )}

        {/* البضاعة والحاوية */}
        <div>
          <label className={labelCls}>وصف البضاعة (Description of Goods)</label>
          <textarea rows={2} placeholder="مثال: مواد غذائية معلبة — 3 حاويات 40HQ"
            value={form.goodsDescription} onChange={(e) => setForm({ ...form, goodsDescription: e.target.value })} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>نوع الحاوية (Container Type)</label>
            <select value={form.containerType} onChange={(e) => setForm({ ...form, containerType: e.target.value })} className={inputCls}>
              <option value="">— اختر —</option>
              {CONTAINER_TYPES.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>العدد (Qty)</label>
            <input type="number" min="0" step="1" placeholder="3" value={form.containerQty}
              onChange={(e) => setForm({ ...form, containerQty: e.target.value })} className={inputCls} />
          </div>
        </div>

        {/* ملاحظات التسعير — توجيه مباشر لفريق التسعير */}
        <div>
          <label className={labelCls}>ملاحظات ومتطلبات خاصة للتسعير (Pricing Notes)</label>
          <textarea rows={2} placeholder="مثال: يطلب العميل نولون شامل THC + ترخيص استيراد، الشحنة قابلة للتأجيل أسبوعين"
            value={form.pricingNotes} onChange={(e) => setForm({ ...form, pricingNotes: e.target.value })} className={inputCls} />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition cursor-pointer">
            إلغاء
          </button>
          <button type="submit" disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-600/30 transition disabled:opacity-50 cursor-pointer">
            {loading ? <Ship className="w-4 h-4 animate-pulse" /> : <Check className="w-4 h-4" />}
            <span>{loading ? 'جاري إرسال الطلب...' : 'إرسال إلى التسعير'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};


