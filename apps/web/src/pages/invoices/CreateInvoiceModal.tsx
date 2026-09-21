import React, { useState } from 'react';
import { Plus, Trash2, Calculator, Receipt, ShieldCheck } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newInvoice: any) => void;
}

interface InvoiceLineItem {
  id: string;
  description: string;
  chargeType: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  exchangeRate: number;
  isTaxable: boolean;
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [clientId, setClientId] = useState('1');
  const [shipmentId, setShipmentId] = useState('RED-2026-0001');
  const [invoiceType, setInvoiceType] = useState('client_freight');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [etaSubmission, setEtaSubmission] = useState(true);

  const [items, setItems] = useState<InvoiceLineItem[]>([
    {
      id: '1',
      description: 'نولون شحن بحري (Ocean Freight - 40HC)',
      chargeType: 'ocean_freight',
      quantity: 1,
      unitPrice: 3200,
      currency: 'USD',
      exchangeRate: 48.5,
      isTaxable: false, // International freight is 0% VAT
    },
    {
      id: '2',
      description: 'أتعاب تخليص جمركي ميناء الإسكندرية',
      chargeType: 'customs_clearance',
      quantity: 1,
      unitPrice: 7500,
      currency: 'EGP',
      exchangeRate: 1,
      isTaxable: true, // Local service is 14% VAT
    },
    {
      id: '3',
      description: 'نقل بري شاحنة ثقيلة إلى العاشر من رمضان',
      chargeType: 'inland_haulage',
      quantity: 1,
      unitPrice: 12000,
      currency: 'EGP',
      exchangeRate: 1,
      isTaxable: true,
    },
  ]);

  const addItem = () => {
    setItems([
      ...items,
      {
        id: String(Date.now()),
        description: 'بند جديد',
        chargeType: 'other',
        quantity: 1,
        unitPrice: 0,
        currency: 'EGP',
        exchangeRate: 1,
        isTaxable: true,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, updates: Partial<InvoiceLineItem>) => {
    setItems(items.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  };

  // Calculations in EGP
  const subtotalEGP = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice * (item.currency === 'USD' ? item.exchangeRate : 1),
    0
  );

  const taxableAmountEGP = items.reduce(
    (sum, item) =>
      item.isTaxable
        ? sum + item.quantity * item.unitPrice * (item.currency === 'USD' ? item.exchangeRate : 1)
        : sum,
    0
  );

  const vatAmountEGP = taxableAmountEGP * 0.14;
  const whtAmountEGP = taxableAmountEGP * 0.01; // 1% Withholding Tax
  const totalEGP = subtotalEGP + vatAmountEGP - whtAmountEGP;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newInvoice = {
      id: String(Date.now()),
      invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      clientId,
      clientName: clientId === '1' ? 'شركة الأهرام للصناعات الغذائية' : 'مجموعة القاهرة للكيماويات',
      shipmentFile: shipmentId,
      invoiceType,
      subtotal: subtotalEGP,
      taxAmount: vatAmountEGP,
      total: totalEGP,
      status: etaSubmission ? 'submitted_eta' : 'draft',
      etaUuid: etaSubmission ? `ETA-${Math.random().toString(36).substring(2, 10).toUpperCase()}` : null,
      issueDate,
      dueDate,
      items,
    };
    onSuccess(newInvoice);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إصدار فاتورة ضريبية جديدة (ETA eInvoicing)" maxWidth="4xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              العميل
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              <option value="1">شركة الأهرام للصناعات الغذائية (EG-TAX-28394721)</option>
              <option value="2">مجموعة القاهرة للكيماويات (EG-TAX-98214301)</option>
              <option value="3">العالمية للاستيراد والتصدير (EG-TAX-44321908)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ملف الشحنة المرتبط
            </label>
            <input
              type="text"
              value={shipmentId}
              onChange={(e) => setShipmentId(e.target.value)}
              placeholder="RED-2026-0001"
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              نوع الفاتورة
            </label>
            <select
              value={invoiceType}
              onChange={(e) => setInvoiceType(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              <option value="client_freight">فاتورة شحن وتخليص (Freight & Clearance)</option>
              <option value="demurrage">غرامات تأخير وأرضيات (Demurrage & Storage)</option>
              <option value="reimbursement">مطالبة مصروفات ونثريات (Reimbursement)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              تاريخ الاستحقاق
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* ETA Compliance Banner */}
        <div className="p-4 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/20 dark:border-emerald-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 block">
                التكامل المباشر مع مصلحة الضرائب المصرية (ETA eInvoicing API v1.0)
              </span>
              <span className="text-[11px] text-emerald-800 dark:text-emerald-300/80 block mt-0.5">
                تطبيق ضريبة القيمة المضافة 14% مع الإعفاء القانوني للنولون البحري الدولي وإصدار رمز الاستجابة السريع (QR Code)
              </span>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-emerald-950 dark:text-emerald-200 cursor-pointer">
            <input
              type="checkbox"
              checked={etaSubmission}
              onChange={(e) => setEtaSubmission(e.target.checked)}
              className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>إرسال فوري للمنظومة</span>
          </label>
        </div>

        {/* Line Items Table */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              بنود المطالبة والخدمات (Charge Items)
            </span>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-500 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة بند</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-100/60 dark:bg-slate-800/40 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 text-start">الوصف / البند</th>
                  <th className="py-2.5 px-3 text-center w-20">الكمية</th>
                  <th className="py-2.5 px-3 text-center w-28">السعر</th>
                  <th className="py-2.5 px-3 text-center w-20">العملة</th>
                  <th className="py-2.5 px-3 text-center w-24">سعر الصرف</th>
                  <th className="py-2.5 px-3 text-center w-20">خاضع 14%</th>
                  <th className="py-2.5 px-3 text-end w-32">المبلغ (EGP)</th>
                  <th className="py-2.5 px-2 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {items.map((item) => {
                  const lineTotalEGP =
                    item.quantity * item.unitPrice * (item.currency === 'USD' ? item.exchangeRate : 1);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(item.id, { description: e.target.value })}
                          className="w-full border border-slate-200 dark:border-slate-700 rounded-lg py-1 px-2 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })}
                          className="w-16 text-center border border-slate-200 dark:border-slate-700 rounded-lg py-1 px-1 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.id, { unitPrice: Number(e.target.value) })}
                          className="w-24 text-center border border-slate-200 dark:border-slate-700 rounded-lg py-1 px-1 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <select
                          value={item.currency}
                          onChange={(e) =>
                            updateItem(item.id, {
                              currency: e.target.value,
                              exchangeRate: e.target.value === 'USD' ? 48.5 : 1,
                            })
                          }
                          className="border border-slate-200 dark:border-slate-700 rounded-lg py-1 px-1 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                        >
                          <option value="EGP">EGP</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                        </select>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {item.currency !== 'EGP' ? (
                          <input
                            type="number"
                            step="0.01"
                            value={item.exchangeRate}
                            onChange={(e) => updateItem(item.id, { exchangeRate: Number(e.target.value) })}
                            className="w-20 text-center border border-slate-200 dark:border-slate-700 rounded-lg py-1 px-1 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                          />
                        ) : (
                          <span className="text-slate-400 font-mono">1.0</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={item.isTaxable}
                          onChange={(e) => updateItem(item.id, { isTaxable: e.target.checked })}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                      </td>
                      <td className="py-2 px-3 text-end font-mono font-bold text-slate-800 dark:text-slate-200">
                        {lineTotalEGP.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-1 text-slate-400 hover:text-red-600 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Calculation Summary Card */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="text-xs text-slate-500 space-y-1">
            <div>• النولون البحري الدولي معفى من ضريبة القيمة المضافة بنص المادة (6) من القانون.</div>
            <div>• تطبق ضريبة القيمة المضافة 14% فقط على الخدمات المحلية وأتعاب التخليص والنقل.</div>
            <div>• يخصم 1% خصم تحصيل تحت حساب الضريبة (WHT) للشركات المسجلة.</div>
          </div>

          <div className="w-full md:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>المجموع قبل الضريبة:</span>
              <span className="font-mono font-bold">{subtotalEGP.toLocaleString()} EGP</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>ض.ق.م (14% على الخدمات المحلية):</span>
              <span className="font-mono font-bold text-emerald-600">+{vatAmountEGP.toLocaleString()} EGP</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>خصم أرباح تجارية (1% WHT):</span>
              <span className="font-mono font-bold text-amber-600">-{whtAmountEGP.toLocaleString()} EGP</span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-sm font-extrabold text-slate-900 dark:text-white">
              <span>صافي المستحق للمطالبة:</span>
              <span className="font-mono text-brand-600 dark:text-brand-400">
                {totalEGP.toLocaleString()} EGP
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-md shadow-brand-500/20 transition"
          >
            <Receipt className="w-4 h-4" />
            <span>حفظ وإصدار الفاتورة</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
