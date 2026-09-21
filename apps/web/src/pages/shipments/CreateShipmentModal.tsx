import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createShipmentSchema,
  CreateShipmentInput,
  ShipmentType,
  Incoterm,
  ContainerType,
  ContainerStatus,
  ShipmentStage,
} from '@banna/shared-types';
import { Modal } from '../../components/ui/Modal';
import { Ship, Plus, Trash2, Check, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { PortSelect } from '../../components/ui/PortSelect';
import { useCreateShipment } from '../../hooks/queries/useShipments';
import { useClients } from '../../hooks/queries/useClients';

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
  const [shippingLines, setShippingLines] = useState<any[]>([]);
  const { data: clients = [] } = useClients();
  const createShipmentMutation = useCreateShipment();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateShipmentInput>({
    resolver: zodResolver(createShipmentSchema) as any,
    defaultValues: {
      clientId: '',
      shippingLineId: '',
      shipmentType: ShipmentType.FCL,
      incoterm: Incoterm.FOB,
      currentStage: ShipmentStage.BOOKING_CONFIRMED,
      originPortId: 'Shanghai (CNSHA)',
      destinationPortId: 'Alexandria (EGALY)',
      freeDaysAllowed: 14,
      blNumber: '',
      vesselName: '',
      voyageNumber: '',
      cargoDescription: '',
      notes: '',
      containers: [
        {
          containerNumber: '',
          containerType: ContainerType.HQ_40,
          tareWeightKg: 3800,
          cargoWeightKg: 22000,
          status: ContainerStatus.BOOKED,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'containers',
  });

  useEffect(() => {
    if (isOpen) {
      api.get('/masters/shipping-lines').then((res: any) => setShippingLines(res || [])).catch(() => {});
    }
  }, [isOpen]);

  const originPort = watch('originPortId') || 'Shanghai (CNSHA)';
  const destinationPort = watch('destinationPortId') || 'Alexandria (EGALY)';

  const onSubmit = async (data: CreateShipmentInput) => {
    try {
      // Filter out empty container rows
      const validContainers = (data.containers || []).filter(
        (c) => c.containerNumber && c.containerNumber.trim() !== '',
      );

      await createShipmentMutation.mutateAsync({
        ...data,
        containers: validContainers,
      });

      reset();
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err?.message || 'فشل في إنشاء ملف الشحنة');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="فتح ملف شحنة تشغيلية جديد (Job File)"
      subtitle="تسجيل تفاصيل البوليصة الملاحية B/L، الخط الملاحي، السفينة، والحاويات بعقود تحقق معتمدة"
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Row 1: Client & Shipping Line */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              العميل صاحب الشحنة *
            </label>
            <select
              {...register('clientId')}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-brand-500"
            >
              <option value="">-- اختر العميل --</option>
              {clients.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.clientId && (
              <p className="text-rose-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.clientId.message}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              الخط الملاحي (Carrier)
            </label>
            <select
              {...register('shippingLineId')}
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
              {...register('blNumber')}
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
            onChange={(code) => setValue('originPortId', code)}
            placeholder="اختر ميناء المنشأ من موانئ العالم..."
          />
          <PortSelect
            label="ميناء الوصول والمقصد (POD)"
            direction="pod"
            value={destinationPort}
            onChange={(code) => setValue('destinationPortId', code)}
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
              {...register('vesselName')}
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
              {...register('voyageNumber')}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-brand-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              نوع الشحنة والشرط
            </label>
            <div className="flex gap-2">
              <select
                {...register('shipmentType')}
                className="w-1/2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-2 text-xs focus:ring-2 focus:ring-brand-500"
              >
                <option value={ShipmentType.FCL}>FCL</option>
                <option value={ShipmentType.LCL}>LCL</option>
                <option value={ShipmentType.AIR}>Air</option>
                <option value={ShipmentType.CLEARANCE_ONLY}>Clearance</option>
              </select>
              <select
                {...register('incoterm')}
                className="w-1/2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-2 text-xs focus:ring-2 focus:ring-brand-500 font-mono"
              >
                <option value={Incoterm.FOB}>FOB</option>
                <option value={Incoterm.CIF}>CIF</option>
                <option value={Incoterm.CFR}>CFR</option>
                <option value={Incoterm.EXW}>EXW</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              أيام السماح المجانية (Free Days)
            </label>
            <input
              type="number"
              min={0}
              {...register('freeDaysAllowed', { valueAsNumber: true })}
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
              onClick={() =>
                append({
                  containerNumber: '',
                  containerType: ContainerType.HQ_40,
                  tareWeightKg: 3800,
                  cargoWeightKg: 22000,
                  status: ContainerStatus.BOOKED,
                })
              }
              className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-500"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة حاوية</span>
            </button>
          </div>

          <div className="p-3 space-y-2.5">
            {fields.map((field, idx) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-center text-xs">
                <div className="col-span-4">
                  <input
                    type="text"
                    placeholder="رقم الحاوية (مثال: MSCU9041280)"
                    {...register(`containers.${idx}.containerNumber` as const)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-1.5 px-2 text-xs font-mono uppercase focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="col-span-3">
                  <select
                    {...register(`containers.${idx}.containerType` as const)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-1.5 px-2 text-xs focus:ring-2 focus:ring-brand-500"
                  >
                    <option value={ContainerType.HQ_40}>40' High Cube (40HQ)</option>
                    <option value={ContainerType.GP_20}>20' General Purpose (20GP)</option>
                    <option value={ContainerType.GP_40}>40' General Purpose (40GP)</option>
                    <option value={ContainerType.REEFER_40}>40' Reefer (مبرد)</option>
                    <option value={ContainerType.REEFER_20}>20' Reefer (مبرد)</option>
                    <option value={ContainerType.FLAT_RACK}>Flat Rack</option>
                    <option value={ContainerType.OPEN_TOP}>Open Top</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="وزن البضاعة (كجم)"
                    {...register(`containers.${idx}.cargoWeightKg` as const, { valueAsNumber: true })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-1.5 px-2 text-xs font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="text"
                    placeholder="رقم الرصاصة (Seal #)"
                    {...register(`containers.${idx}.sealNumber` as const)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-1.5 px-2 text-xs font-mono"
                  />
                </div>
                <div className="col-span-1 text-center">
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(idx)}
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
            {...register('cargoDescription')}
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
            disabled={isSubmitting || createShipmentMutation.isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold shadow-lg shadow-brand-600/30 transition disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>
              {isSubmitting || createShipmentMutation.isPending ? 'جاري الفتح...' : 'إنشاء ملف الشحنة'}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
