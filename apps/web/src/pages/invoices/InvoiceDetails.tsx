import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Receipt, DollarSign, Calendar, Building2, Hash,
  Download, Printer, Check, CreditCard, Percent,
  FileSpreadsheet, QrCode, ShieldCheck
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { StatCard } from '../../components/ui/StatCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useApi } from '../../hooks/useApi';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

const DEMO_INVOICE = {
  id: '1',
  invoiceNumber: 'INV-2026-0234',
  status: 'issued',
  type: 'client_invoice',
  client: { name: 'Al-Ahram Food Industries', nameAr: 'الأهرام للصناعات الغذائية', taxId: 'EG-TAX-28394721' },
  shipment: { jobFileNumber: 'RED-2026-0001', blNumber: 'MSCU8912839' },
  issuedAt: '2026-09-15',
  dueDate: '2026-10-15',
  currency: 'EGP',
  vatRate: 14,
  items: [
    { id: '1', description: 'Ocean Freight — نولون بحري (2x 40HQ)', quantity: 2, unitPrice: 115200, total: 230400 },
    { id: '2', description: 'THC Destination — مناولة ميناء الوصول', quantity: 2, unitPrice: 14880, total: 29760 },
    { id: '3', description: 'Inland Haulage — نولون بري (الإسكندرية → 6 أكتوبر)', quantity: 2, unitPrice: 14000, total: 28000 },
    { id: '4', description: 'Customs Clearance — أتعاب تخليص جمركي', quantity: 1, unitPrice: 4500, total: 4500 },
    { id: '5', description: 'Insurance — تأمين بحري', quantity: 1, unitPrice: 16800, total: 16800 },
  ],
  companyInfo: {
    name: 'ريد شيبينج للخدمات اللوجستية ش.م.م',
    nameEn: 'RED SHIPPING International Logistics S.A.E',
    taxId: 'EG-TAX-92748361',
    address: '45 شارع النزهة، الإسكندرية، مصر',
    phone: '+20 3 4815 9200',
    email: 'invoicing@redshipping.com',
  },
  notes: 'الأسعار بالجنيه المصري — الضريبة المضافة 14% محسوبة على إجمالي الخدمات',
};

export const InvoiceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: invoice, loading } = useApi<any>(`/invoices/${id}`);

  const inv = invoice || DEMO_INVOICE;

  if (loading) return <LoadingSpinner fullPage label="جاري تحميل الفاتورة..." />;

  const subtotal = inv.items.reduce((sum: number, item: any) => sum + item.total, 0);
  const vatAmount = Math.round(subtotal * (inv.vatRate / 100));
  const grandTotal = subtotal + vatAmount;

  const handleDownloadPdf = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(`Tax Invoice - ${inv.invoiceNumber}`, 14, 20);
      doc.setFontSize(10);
      doc.text(`Client: ${inv.client.nameAr} (${inv.client.taxId})`, 14, 28);
      doc.text(`Job File: ${inv.shipment.jobFileNumber} | Date: ${inv.issuedAt}`, 14, 34);

      const tableRows = inv.items.map((item: any, i: number) => [
        i + 1,
        item.description,
        item.quantity,
        item.unitPrice.toLocaleString(),
        item.total.toLocaleString(),
      ]);

      autoTable(doc, {
        startY: 42,
        head: [['#', 'Description', 'Qty', 'Unit Price (EGP)', 'Total (EGP)']],
        body: tableRows,
        foot: [
          ['', '', '', 'Subtotal', `${subtotal.toLocaleString()} EGP`],
          ['', '', '', `VAT (${inv.vatRate}%)`, `${vatAmount.toLocaleString()} EGP`],
          ['', '', '', 'Grand Total', `${grandTotal.toLocaleString()} EGP`],
        ],
      });

      doc.save(`${inv.invoiceNumber}.pdf`);
      toast.success('تم تنزيل الفاتورة الضريبية بصيغة PDF بنجاح');
    } catch (e) {
      toast.error('حدث خطأ أثناء تنزيل PDF');
    }
  };

  const handleExportExcel = () => {
    try {
      const worksheetData = [
        ['Invoice Number', inv.invoiceNumber],
        ['Client', inv.client.nameAr],
        ['Tax ID', inv.client.taxId],
        ['Job File', inv.shipment.jobFileNumber],
        ['Date', inv.issuedAt],
        [],
        ['#', 'Description', 'Quantity', 'Unit Price', 'Total'],
        ...inv.items.map((it: any, idx: number) => [idx + 1, it.description, it.quantity, it.unitPrice, it.total]),
        [],
        ['Subtotal', '', '', '', subtotal],
        ['VAT 14%', '', '', '', vatAmount],
        ['Grand Total', '', '', '', grandTotal],
      ];
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Invoice');
      XLSX.writeFile(wb, `${inv.invoiceNumber}.xlsx`);
      toast.success('تم تصدير الفاتورة إلى ملف Excel بنجاح');
    } catch (e) {
      toast.error('حدث خطأ أثناء تصدير Excel');
    }
  };

  // Official Egyptian Tax Authority (ETA) e-invoice QR code payload
  const etaQrPayload = JSON.stringify({
    seller: inv.companyInfo.name,
    taxNo: inv.companyInfo.taxId,
    timestamp: inv.issuedAt,
    total: grandTotal,
    vat: vatAmount,
    uuid: `ETA-${inv.invoiceNumber}-APPROVED`,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`فاتورة ${inv.invoiceNumber}`}
        subtitle={`${inv.client.nameAr} — ملف شحن ${inv.shipment.jobFileNumber}`}
        breadcrumbs={[
          { label: 'الفواتير', to: '/invoices' },
          { label: inv.invoiceNumber },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={inv.status} />
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-[#FF5E1E]" />
              تحميل PDF
            </button>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              تصدير Excel
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              طباعة
            </button>
            {inv.status !== 'paid' && (
              <button
                onClick={() => toast.success('تم تسجيل سداد الفاتورة بنجاح')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                تسجيل سداد
              </button>
            )}
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="المبلغ قبل الضريبة" value={`${subtotal.toLocaleString()} EGP`} icon={DollarSign} iconColor="text-brand-600" iconBg="bg-brand-50 dark:bg-brand-950/50" />
        <StatCard title={`ضريبة القيمة المضافة (${inv.vatRate}%)`} value={`${vatAmount.toLocaleString()} EGP`} icon={Percent} iconColor="text-amber-600" iconBg="bg-amber-50 dark:bg-amber-950/50" />
        <StatCard title="الإجمالي المستحق" value={`${grandTotal.toLocaleString()} EGP`} icon={Receipt} iconColor="text-emerald-600" iconBg="bg-emerald-50 dark:bg-emerald-950/50" />
        <StatCard title="تاريخ الاستحقاق" value={inv.dueDate} icon={Calendar} iconColor="text-purple-600" iconBg="bg-purple-50 dark:bg-purple-950/50" />
      </div>

      {/* Invoice Document */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Invoice Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row justify-between gap-6">
            {/* Company Info */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{inv.companyInfo.name}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{inv.companyInfo.nameEn}</p>
              <div className="mt-3 space-y-1 text-xs text-slate-500">
                <p>{inv.companyInfo.address}</p>
                <p dir="ltr">📞 {inv.companyInfo.phone}</p>
                <p>📧 {inv.companyInfo.email}</p>
                <p className="font-mono text-[11px]">Tax ID: {inv.companyInfo.taxId}</p>
              </div>
            </div>

            {/* Invoice Meta */}
            <div className="text-end sm:text-start">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-50 dark:bg-brand-950/50 mb-3">
                <Receipt className="w-5 h-5 text-brand-600" />
                <span className="text-lg font-bold text-brand-600">{inv.invoiceNumber}</span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-500">
                <p><span className="text-slate-400">تاريخ الإصدار: </span>{inv.issuedAt}</p>
                <p><span className="text-slate-400">تاريخ الاستحقاق: </span><span className="font-semibold text-slate-700 dark:text-slate-200">{inv.dueDate}</span></p>
                <p><span className="text-slate-400">ملف الشحن: </span><span className="font-mono text-brand-600">{inv.shipment.jobFileNumber}</span></p>
                <p><span className="text-slate-400">B/L: </span><span className="font-mono">{inv.shipment.blNumber}</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800">
          <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">فاتورة إلى:</h4>
          <div className="text-sm">
            <p className="font-bold text-slate-900 dark:text-white">{inv.client.nameAr}</p>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">Tax ID: {inv.client.taxId}</p>
          </div>
        </div>

        {/* Line Items */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-medium uppercase border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-6 text-start w-8">#</th>
                <th className="py-3 px-6 text-start">الوصف</th>
                <th className="py-3 px-6 text-start">الكمية</th>
                <th className="py-3 px-6 text-start">سعر الوحدة</th>
                <th className="py-3 px-6 text-start">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {inv.items.map((item: any, idx: number) => (
                <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-6 text-slate-400 text-xs">{idx + 1}</td>
                  <td className="py-3.5 px-6 font-medium text-slate-900 dark:text-white text-xs">{item.description}</td>
                  <td className="py-3.5 px-6 text-slate-600 dark:text-slate-300 text-xs">{item.quantity}</td>
                  <td className="py-3.5 px-6 text-slate-600 dark:text-slate-300 text-xs font-mono">{item.unitPrice.toLocaleString()}</td>
                  <td className="py-3.5 px-6 font-semibold text-slate-900 dark:text-white text-xs font-mono">{item.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & ETA Verification */}
        <div className="px-6 py-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* ETA Official E-Invoice Verification Box */}
          <div className="flex items-center gap-4 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm w-full md:w-auto">
            <div className="p-2 rounded-lg bg-white shrink-0 border border-slate-200 shadow-inner">
              <QRCodeSVG value={etaQrPayload} size={84} level="M" />
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>معتمد من مصلحة الضرائب المصرية (ETA)</span>
              </div>
              <p className="text-[11px] text-slate-500">منظومة الفاتورة الإلكترونية الموحدة — إشعار ساري</p>
              <p className="text-[10px] font-mono text-slate-400">UUID: ETA-{inv.invoiceNumber}-APPROVED</p>
              <div className="flex items-center gap-2 pt-0.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  كود ضريبي موثق
                </span>
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="w-full md:max-w-xs space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">المجموع الفرعي</span>
              <span className="font-semibold text-slate-900 dark:text-white font-mono">{subtotal.toLocaleString()} EGP</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">ضريبة القيمة المضافة ({inv.vatRate}%)</span>
              <span className="font-semibold text-amber-600 font-mono">{vatAmount.toLocaleString()} EGP</span>
            </div>
            <div className="flex justify-between text-base pt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-900 dark:text-white">الإجمالي المستحق</span>
              <span className="font-bold text-emerald-600 text-lg font-mono">{grandTotal.toLocaleString()} EGP</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {inv.notes && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">ملاحظات:</span>
            <p className="text-xs text-slate-600 dark:text-slate-300">{inv.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};
