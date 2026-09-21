import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Ship, Plus, Trash2, Check } from 'lucide-react';
import { api } from '../../services/api';
import { PortSelect } from '../../components/ui/PortSelect';

interface CreateShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateShipmentModal: React.FC<CreateShipmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [clients, setClients] = useState<any[]>([]);
  const [shippingLines, setShippingLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [clientId, setClientId] = useState('');
  const [shippingLineId, setShippingLineId] = useState('');
  const [shipmentType, setShipmentType] = useState('fcl');
  const [incoterm, setIncoterm] = useState('FOB');
  const [blNumber, setBlNumber] = useState('');
  const [vesselName, setVesselName] = useState('');
  const [voyageNumber, setVoyageNumber] = useState('');
  const [originPort, setOriginPort] = useState('Shanghai (CNSHA)');
  const [destinationPort, setDestinationPort] = useState('Alexandria (EGALY)');
  const [freeDaysAllowed, setFreeDaysAllowed] = useState(14);
  const [cargoDescription, setCargoDescription] = useState('');
  const [notes, setNotes] = useState('');

  // Containers
  const [containers, setContainers] = useState<any[]>([
    { containerNumber: '', containerType: '40HQ', tareWeightKg: 3800, cargoWeightKg: 22000 },
  ]);

  useEffect(() => {
    if (isOpen) {
      api.get('/clients').then((res: any) => setClients(res || [])).catch(() => {});
      api.get('/masters/shipping-lines').then((res: any) => setShippingLines(res || [])).catch(() => {});
    }
  }, [isOpen]);

  const handleAddContainer = () => {
    setContainers([
      ...containers,
      { containerNumber: '', containerType: '40HQ', tareWeightKg: 3800, cargoWeightKg: 22000 },
    ]);
  };

  const handleRemoveContainer = (index: number) => {
    setContainers(containers.filter((_, i) => i !== index));
  };

  const handleContainerChange = (index: number, field: string, value: any) => {
    const updated = [...containers];
    updated[index] = { ...updated[index], [field]: value };
    setContainers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      alert('برجاء اختيار العميل أولاً');
      return;
    }

    setLoading(true);
    try {
      await api.post('/shipments', {
        clientId,
        shippingLineId: shippingLineId || undefined,
        shipmentType,
        incoterm,
        blNumber,
        vesselName,
        voyageNumber,
        freeDaysAllowed: Number(freeDaysAllowed),
        cargoDescription,
        notes,
        originPortId: originPort,
        destinationPortId: destinationPort,
        containers: containers.filter((c) => c.containerNumber.trim() !== ''),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err?.message || 'فشل في إنشاء ملف الشحنة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="فتح ملف شحنة تشغيلية جديد (Job File)"
      subtitle="تسجيل تفاصيل البوليصة الملاحية B/L، الخط الملاحي، السفينة، والحاويات"
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Row 1: Client & Shipping Line */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              العميل صاحب الشحنة *
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
              الخط الملاحي (Carrier)
            </label>
            <select
              value={shippingLineId}
              onChange={(e) => setShippingLineId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-brand-500"
            >
              <option value="">-- اختر الخط الملاحي --</option>
              {shippingLines.map((sl) => (
                <option key={sl.id} value={sl.id}>
                  {sl.name} ({sl.scac})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              رقم بوليصة الشحن (B/L Number)
            </label>
            <input
              type="text"
              placeholder="مثال: MSCU1892819"
              value={blNumber}
              onChange={(e) => setBlNumber(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-brand-500 font-mono font-bold"
            />
          </div>
        </div>

        {/* Row: Global Ports Selection (POL & POD) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PortSelect
            label="ميناء الشحن والمنشأ (POL)"
            direction="pol"
            value={originPort}
            onChange={(code) => setOriginPort(code)}
            placeholder="اختر ميناء المنشأ من موانئ العالم..."
          />
          <PortSelect
            label="ميناء الوصول والمقصد (POD)"
            direction="pod"
            value={destinationPort}
            onChange={(code) => setDestinationPort(code)}
            placeholder="اختر ميناء المقصد من موانئ العالم..."
          />
        </div>

        {/* Row 2: Vessel, Details & Free Days */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              اسم السفينة (Vessel)
            </label>
            <input
              type="text"
              placeholder="مثال: MSC OSCAR"
              value={vesselName}
              onChange={(e) => setVesselName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              رقم الرحلة (Voyage)
            </label>
            <input
              type="text"
              placeholder="مثال: 2601W"
              value={voyageNumber}
              onChange={(e) => setVoyageNumber(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-brand-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              نوع الشحنة والشرط
            </label>
            <div className="flex gap-2">
              <select
                value={shipmentType}
                onChange={(e) => setShipmentType(e.target.value)}
                className="w-1/2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-2 text-xs focus:ring-2 focus:ring-brand-500"
              >
                <option value="fcl">FCL</option>
                <option value="lcl">LCL</option>
                <option value="air">Air</option>
                <option value="clearance_only">Clearance</option>
              </select>
              <select
                value={incoterm}
                onChange={(e) => setIncoterm(e.target.value)}
                className="w-1/2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-2 text-xs focus:ring-2 focus:ring-brand-500 font-mono"
              >
                <option value="FOB">FOB</option>
                <option value="CIF">CIF</option>
                <option value="CFR">CFR</option>
                <option value="EXW">EXW</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              أيام السماح المجانية (Free Days)
            </label>
            <input
              type="number"
              value={freeDaysAllowed}
              onChange={(e) => setFreeDaysAllowed(Number(e.target.value))}
              min={0}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-brand-500 font-mono"
            />
          </div>
        </div>

        {/* Containers Table */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-950/60 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              الحاويات التابعة للشحنة (Containers Equipment)
            </span>
            <button
              type="button"
              onClick={handleAddContainer}
              className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-500"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة حاوية</span>
            </button>
          </div>

          <div className="p-3 space-y-2.5">
            {containers.map((c, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center text-xs">
                <div className="col-span-4">
                  <input
                    type="text"
                    placeholder="رقم الحاوية (مثال: MSCU8912830)"
                    value={c.containerNumber}
                    onChange={(e) => handleContainerChange(idx, 'containerNumber', e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-1.5 px-2 text-xs font-mono uppercase focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="col-span-3">
                  <select
                    value={c.containerType}
                    onChange={(e) => handleContainerChange(idx, 'containerType', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-1.5 px-2 text-xs focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="40HQ">40' High Cube (40HQ)</option>
                    <option value="20GP">20' General Purpose (20GP)</option>
                    <option value="40GP">40' General Purpose (40GP)</option>
                    <option value="40RF">40' Reefer (مبرد)</option>
                    <option value="20RF">20' Reefer (مبرد)</option>
                    <option value="FLAT_RACK">Flat Rack</option>
                    <option value="OPEN_TOP">Open Top</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="وزن البضاعة (كجم)"
                    value={c.cargoWeightKg || ''}
                    onChange={(e) => handleContainerChange(idx, 'cargoWeightKg', Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-1.5 px-2 text-xs font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="text"
                    placeholder="رقم الرصاصة (Seal #)"
                    value={c.sealNumber || ''}
                    onChange={(e) => handleContainerChange(idx, 'sealNumber', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-1.5 px-2 text-xs font-mono"
                  />
                </div>
                <div className="col-span-1 text-center">
                  {containers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveContainer(idx)}
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

        {/* Cargo Description */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            وصف البضاعة وطبيعتها (Cargo Description)
          </label>
          <textarea
            rows={2}
            placeholder="مثال: مواد غذائية معلبة، قطع غيار سيارات، كيماويات صناعية غير خطرة..."
            value={cargoDescription}
            onChange={(e) => setCargoDescription(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-brand-500"
          />
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
            <span>{loading ? 'جاري الفتح...' : 'إنشاء ملف الشحنة'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
