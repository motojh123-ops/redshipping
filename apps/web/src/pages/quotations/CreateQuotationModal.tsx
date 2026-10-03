import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Plus, Trash2, Calculator, Check } from 'lucide-react';
import { api } from '../../services/api';
import { PortSelect } from '../../components/ui/PortSelect';
import { calculateSeaTransitDays } from '../../utils/maritime';

interface CreateQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface QuoteItemInput {
  chargeItemId?: string;
  description: string;
  currency: string;
  costRate: number;
  sellRate: number;
  quantity: number;
  unit: string;
}

export const CreateQuotationModal: React.FC<CreateQuotationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [clients, setClients] = useState<any[]>([]);
  const [ports, setPorts] = useState<any[]>([]);
  const [chargeItems, setChargeItems] = useState<any[]>([]);
  const [itemRates, setItemRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [clientId, setClientId] = useState('');
  const [shipmentType, setShipmentType] = useState('fcl');
  const [incoterm, setIncoterm] = useState('FOB');
  const [originPortId, setOriginPortId] = useState('CNSHA');
  const [destinationPortId, setDestinationPortId] = useState('EGALY');
  const [currency, setCurrency] = useState('USD');
  const [validDays, setValidDays] = useState(14);
  const [transitDays, setTransitDays] = useState(25);
  const [notes, setNotes] = useState('');

  // Items State
  const [items, setItems] = useState<QuoteItemInput[]>([
    {
      description: 'نولون شحن بحري (Ocean Freight)',
      currency: 'USD',
      costRate: 2400,
      sellRate: 2800,
      quantity: 1,
      unit: 'container',
    },
    {
      description: 'مصاريف تفريغ ومناولة الميناء (THC Destination)',
      currency: 'USD',
      costRate: 250,
      sellRate: 320,
      quantity: 1,
      unit: 'container',
    },
    {
      description: 'أتعاب التخليص الجمركي (Customs Agency)',
      currency: 'USD',
      costRate: 80,
      sellRate: 150,
      quantity: 1,
      unit: 'shipment',
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      // Fetch available clients, ports and the standard charge-items registry
      api.get('/clients').then((res: any) => setClients(Array.isArray(res) ? res : res?.data || [])).catch(() => {});
      api.get('/masters/ports').then((res: any) => setPorts(Array.isArray(res) ? res : res?.data || [])).catch(() => {});
      api.get('/masters/charge-items', { params: { context: 'quotation' } }).then((res: any) => {
        setChargeItems(Array.isArray(res) ? res : res?.data || []);
      }).catch(() => {});
      // Default rates are owned by the PRICING module (فصل التسعير عن المرجعيات)
      api.get('/pricing/item-rates').then((res: any) => {
        setItemRates(Array.isArray(res) ? res : res?.data || []);
      }).catch(() => {});
    }
  }, [isOpen]);

  // Calculations
  const totalCost = items.reduce((sum, item) => sum + item.costRate * item.quantity, 0);
  const totalSell = items.reduce((sum, item) => sum + item.sellRate * item.quantity, 0);
  const netProfit = totalSell - totalCost;
  const profitMarginPercent = totalSell > 0 ? ((netProfit / totalSell) * 100).toFixed(1) : '0';

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        description: '',
        currency,
        costRate: 0,
        sellRate: 0,
        quantity: 1,
        unit: 'container',
      },
    ]);
  };

  // Pick a standard charge item from the masters registry → autofill the line
  const handleSelectChargeItem = (index: number, chargeItemId: string) => {
    const ci = chargeItems.find((c: any) => c.id === chargeItemId);
    if (!ci) {
      handleItemChange(index, 'chargeItemId', undefined);
      return;
    }
    const rate = itemRates.find((r: any) => r.chargeItemId === chargeItemId);
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      chargeItemId,
      description: ci.nameAr || ci.nameEn || updated[index].description,
      currency: rate?.currency || updated[index].currency,
      costRate: Number(rate?.buyRate ?? 0) || updated[index].costRate,
      sellRate: Number(rate?.sellRate ?? rate?.buyRate ?? 0) || updated[index].sellRate,
    };
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof QuoteItemInput, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      alert('برجاء اختيار العميل أولاً');
      return;
    }

    setLoading(true);
    try {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + Number(validDays));

      await api.post('/quotations', {
        clientId,
        shipmentType,
        incoterm,
        originPortId: originPortId || undefined,
        destinationPortId: destinationPortId || undefined,
        currency,
        validUntil: validUntil.toISOString(),
        estimatedTransitDays: transitDays,
        notes,
        items: items.map((it) => ({ ...it, chargeItemId: it.chargeItemId || undefined })),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err?.message || 'فشل في حفظ عرض السعر');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="إعداد عرض سعر شحن ونولون جديد"
      subtitle="حساب تكلفة الشحن، أسعار البيع للعميل، وهوامش الربحية بالدولار والعملات المختلفة"
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Row 1: Client & Shipment Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              العميل المستهدف *
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-brand-500"
            >
              <option value="">-- اختر العميل --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              نوع الشحنة
            </label>
            <select
              value={shipmentType}
              onChange={(e) => setShipmentType(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-brand-500"
            >
              <option value="fcl">شحن بحري حاويات كاملة (FCL)</option>
              <option value="lcl">شحن بحري مجزأ (LCL)</option>
              <option value="air">شحن جوي (Air Freight)</option>
              <option value="land">نقل بري دولي (Land)</option>
              <option value="clearance_only">تخليص جمركي فقط</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              شرط الشحن الدولي (Incoterm)
            </label>
            <select
              value={incoterm}
              onChange={(e) => setIncoterm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-brand-500"
            >
              <option value="FOB">FOB — Free on Board</option>
              <option value="CIF">CIF — Cost, Insurance & Freight</option>
              <option value="CFR">CFR — Cost & Freight</option>
              <option value="EXW">EXW — Ex Works</option>
              <option value="DDP">DDP — Delivered Duty Paid</option>
              <option value="DAP">DAP — Delivered at Place</option>
            </select>
          </div>
        </div>

        {/* Row 2: Ports & Details */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <PortSelect
              label="ميناء الشحن (POL)"
              direction="pol"
              value={originPortId}
              onChange={(code) => {
                setOriginPortId(code);
                if (destinationPortId) {
                  const est = calculateSeaTransitDays(code, destinationPortId);
                  if (est > 0) setTransitDays(est);
                }
              }}
              placeholder="اختر ميناء المنشأ بالعالم..."
            />
          </div>

          <div>
            <PortSelect
              label="ميناء الوصول (POD)"
              direction="pod"
              value={destinationPortId}
              onChange={(code) => {
                setDestinationPortId(code);
                if (originPortId) {
                  const est = calculateSeaTransitDays(originPortId, code);
                  if (est > 0) setTransitDays(est);
                }
              }}
              placeholder="اختر ميناء المقصد بالعالم..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              صلاحية العرض (أيام)
            </label>
            <input
              type="number"
              value={validDays}
              onChange={(e) => setValidDays(Number(e.target.value))}
              min={1}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-brand-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              مدة الإبحار المتوقعة (أيام)
            </label>
            <input
              type="number"
              value={transitDays}
              onChange={(e) => setTransitDays(Number(e.target.value))}
              min={1}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-brand-500 font-mono"
            />
          </div>
        </div>

        {/* Dynamic Items Table */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-950/60 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              بنود التسعير والنولون والمصاريف (Line Items)
            </span>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-500"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة بند</span>
            </button>
          </div>

          <div className="p-3 space-y-2.5 overflow-x-auto">
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center text-xs">
                <div className="col-span-4">
                  <select
                    value={item.chargeItemId || ''}
                    onChange={(e) => handleSelectChargeItem(idx, e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-1.5 px-2 text-xs focus:ring-2 focus:ring-brand-500 mb-1"
                    title="اختيار بند معياري من السجل الرئيسي (Charges)"
                  >
                    <option value="">— بند حر (بدون ربط بالسجل) —</option>
                    {chargeItems.map((ci: any) => (
                      <option key={ci.id} value={ci.id}>
                        {ci.code} — {ci.nameAr || ci.nameEn}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="وصف البند"
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-1.5 px-2 text-xs focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="التكلفة (Cost)"
                    value={item.costRate || ''}
                    onChange={(e) => handleItemChange(idx, 'costRate', Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-1.5 px-2 text-xs font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="سعر البيع (Sell)"
                    value={item.sellRate || ''}
                    onChange={(e) => handleItemChange(idx, 'sellRate', Number(e.target.value))}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-1.5 px-2 text-xs font-mono font-bold"
                  />
                </div>
                <div className="col-span-1">
                  <input
                    type="number"
                    placeholder="الكمية"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                    min={1}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-1.5 px-2 text-xs font-mono text-center"
                  />
                </div>
                <div className="col-span-2 text-end font-mono font-bold text-emerald-600">
                  +${((item.sellRate - item.costRate) * item.quantity).toLocaleString()}
                </div>
                <div className="col-span-1 text-center">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Profit Summary Card */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-brand-900/10 via-slate-900/5 to-emerald-900/10 border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <span className="text-[11px] text-slate-500 block">إجمالي التكلفة</span>
            <span className="text-base font-bold text-slate-700 dark:text-slate-300 font-mono">
              ${totalCost.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">سعر البيع للعميل</span>
            <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
              ${totalSell.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">صافي الربح المتوقع</span>
            <span className="text-base font-extrabold text-emerald-600 font-mono">
              +${netProfit.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">هامش الربحية</span>
            <span className="text-base font-extrabold text-brand-600 font-mono">
              {profitMarginPercent}%
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold shadow-lg shadow-brand-600/30 transition disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{loading ? 'جاري الحفظ...' : 'حفظ وإصدار عرض السعر'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
