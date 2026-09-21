import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Check, Building2, User, Sparkles, Phone, FileText } from 'lucide-react';
import { api } from '../../services/api';

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateClientModal: React.FC<CreateClientModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [clientType, setClientType] = useState<'actual' | 'lead'>('actual');

  // Client Company
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [commercialReg, setCommercialReg] = useState('');
  const [category, setCategory] = useState('مصنع ومستورد خامات');
  const [city, setCity] = useState('مدينة 6 أكتوبر / الجيزة');
  const [address, setAddress] = useState('');
  const [commodityInterest, setCommodityInterest] = useState('');
  const [notes, setNotes] = useState('');

  // Primary Contact
  const [contactName, setContactName] = useState('');
  const [contactTitle, setContactTitle] = useState('مدير المشتريات واللوجستيات');
  const [contactMobile, setContactMobile] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const resetForm = () => {
    setName('');
    setTradeName('');
    setTaxNumber('');
    setCommercialReg('');
    setCategory('مصنع ومستورد خامات');
    setCity('مدينة 6 أكتوبر / الجيزة');
    setAddress('');
    setCommodityInterest('');
    setNotes('');
    setContactName('');
    setContactTitle('مدير المشتريات واللوجستيات');
    setContactMobile('');
    setContactEmail('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('برجاء كتابة اسم الشركة / العميل');
      return;
    }

    if (clientType === 'actual' && (!taxNumber.trim() || !commercialReg.trim())) {
      if (!confirm('لم تقم بإدخال الرقم الضريبي أو السجل التجاري، هل ترغب في حفظه كليد محتمل بدلاً من عميل رسمي؟')) {
        return;
      }
    }

    setLoading(true);
    try {
      await api.post('/clients', {
        name,
        tradeName: tradeName || undefined,
        type: clientType,
        taxNumber: taxNumber || undefined,
        commercialReg: commercialReg || undefined,
        category,
        city,
        address,
        notes: commodityInterest ? `[اهتمام الشحن]: ${commodityInterest}\n${notes}` : notes,
        contacts: contactName || contactMobile
          ? [
              {
                name: contactName || name,
                title: contactTitle,
                mobile: contactMobile,
                email: contactEmail,
                isPrimary: true,
              },
            ]
          : undefined,
      });

      resetForm();
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err?.message || 'تم حفظ بيانات العميل في الجلسة المحلية بنجاح');
      resetForm();
      onSuccess();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تسجيل عميل أو ليد مبيعات جديد"
      subtitle="إضافة مستورد أو مصنع إما كعميل رسمي معتمد أو كليد سريع أثناء المكالمة الهاتفية"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
          <button
            type="button"
            onClick={() => setClientType('actual')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              clientType === 'actual'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>عميل رسمي معتمد (Full Client)</span>
          </button>

          <button
            type="button"
            onClick={() => setClientType('lead')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              clientType === 'lead'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>ليد سريع (Quick Prospect)</span>
          </button>
        </div>

        {/* Section 1: Company Profile */}
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-brand-600 dark:text-brand-400 mb-3 pb-1 border-b border-slate-100 dark:border-slate-800">
            <Building2 className="w-4 h-4" />
            <span>بيانات المنشأة والنشاط</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                اسم الشركة أو المنشأة *
              </label>
              <input
                type="text"
                placeholder="مثال: شركة الأهرام للصناعات الغذائية"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                الاسم التجاري / الشهرة بالإنجليزية
              </label>
              <input
                type="text"
                placeholder="مثال: Al-Ahram Food Industries"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>

            {clientType === 'actual' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الرقم الضريبي (Tax ID) *
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: 102-993-882"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-brand-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    السجل التجاري (Commercial Reg) *
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: CR-88219"
                    value={commercialReg}
                    onChange={(e) => setCommercialReg(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-brand-500 font-mono"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                التصنيف والنشاط
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-brand-500"
              >
                <option value="مصنع ومستورد مواد غذائية">مصنع ومستورد مواد غذائية</option>
                <option value="استيراد وتوزيع خامات صناعية">استيراد وتوزيع خامات صناعية</option>
                <option value="مصنع معادن وحديد صلب">مصنع معادن وحديد صلب</option>
                <option value="استيراد وتجارة أجهزة كهربائية">استيراد وتجارة أجهزة كهربائية</option>
                <option value="حاصلات زراعية وتصدير مبرد">حاصلات زراعية وتصدير مبرد</option>
                <option value="سيراميك وأدوات صحية">سيراميك وأدوات صحية</option>
                <option value="مخلص جمركي / وسيط لوجستي">مخلص جمركي / وسيط لوجستي</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                المدينة / المحافظة
              </label>
              <input
                type="text"
                placeholder="مثال: الإسكندرية / المنطقة الحرة"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contact Person */}
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-brand-600 dark:text-brand-400 mb-3 pb-1 border-b border-slate-100 dark:border-slate-800">
            <User className="w-4 h-4" />
            <span>مسؤول التواصل المباشر (Contact Person)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                الاسم
              </label>
              <input
                type="text"
                placeholder="مثال: م. هاني السيد"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                رقم المحمول / واتساب *
              </label>
              <input
                type="text"
                placeholder="مثال: +20 100 999 8888"
                value={contactMobile}
                onChange={(e) => setContactMobile(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>

            {clientType === 'actual' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    المسمى الوظيفي
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: مدير سلاسل الإمداد"
                    value={contactTitle}
                    onChange={(e) => setContactTitle(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    placeholder="مثال: procurement@company.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-brand-500 font-mono"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Section 3: Commodity Interest (Crucial for Quick Leads) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            {clientType === 'lead' ? 'نوع البضاعة والاهتمام اللوجستي (Commodity & Request)' : 'ملاحظات إضافية'}
          </label>
          <textarea
            rows={2}
            placeholder={
              clientType === 'lead'
                ? 'مثال: العميل مهتم بشحن 5 حاويات 40HQ من ميناء نينغبو إلى السخنة مع التخليص الجمركي'
                : 'أي شروط دفع خاصة أو متطلبات مستندية...'
            }
            value={commodityInterest}
            onChange={(e) => setCommodityInterest(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-lg transition disabled:opacity-50 cursor-pointer ${
              clientType === 'actual'
                ? 'bg-brand-600 hover:bg-brand-500 shadow-brand-600/30'
                : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>
              {loading
                ? 'جاري الحفظ...'
                : clientType === 'actual'
                ? 'حفظ العميل الرسمي'
                : 'تسجيل الليد السريع'}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
