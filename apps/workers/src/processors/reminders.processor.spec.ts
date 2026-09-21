import { describe, it, expect } from 'vitest';
import { processReminderJob } from './reminders.processor.js';
import { ReminderJobData } from '../queues/queue.types.js';

describe('processReminderJob', () => {
  describe('Egyptian ACID Expiry Reminders', () => {
    it('returns info status when ACID expiry is far in the future (>14 days)', async () => {
      const futureDate = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString();
      const job = {
        data: {
          type: 'acid_expiry',
          acidData: {
            dossierId: 'dossier-1',
            acidNumber: 'EGY-2026-987654321',
            expiryDate: futureDate,
            clientName: 'Al-Banna Logistics',
          },
        } as ReminderJobData,
      } as any;

      const result = await processReminderJob(job);
      expect(result.type).toBe('acid_expiry');
      expect(result.alertLevel).toBe('info');
      expect(result.daysRemaining).toBeGreaterThan(14);
      expect(result.message).toContain('active');
    });

    it('returns warning when ACID expiry is within 14 days', async () => {
      const warningDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
      const job = {
        data: {
          type: 'acid_expiry',
          acidData: {
            dossierId: 'dossier-2',
            acidNumber: 'EGY-2026-112233445',
            expiryDate: warningDate,
            clientName: 'Cairo Trading',
          },
        } as ReminderJobData,
      } as any;

      const result = await processReminderJob(job);
      expect(result.alertLevel).toBe('warning');
      expect(result.message).toContain('Notice: ACID');
    });

    it('returns critical when ACID expiry is within 3 days', async () => {
      const urgentDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      const job = {
        data: {
          type: 'acid_expiry',
          acidData: {
            dossierId: 'dossier-3',
            acidNumber: 'EGY-2026-999999999',
            expiryDate: urgentDate,
          },
        } as ReminderJobData,
      } as any;

      const result = await processReminderJob(job);
      expect(result.alertLevel).toBe('critical');
      expect(result.message).toContain('URGENT: ACID');
    });

    it('returns critical when ACID has already expired', async () => {
      const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const job = {
        data: {
          type: 'acid_expiry',
          acidData: {
            dossierId: 'dossier-4',
            acidNumber: 'EGY-2026-000000000',
            expiryDate: pastDate,
          },
        } as ReminderJobData,
      } as any;

      const result = await processReminderJob(job);
      expect(result.alertLevel).toBe('critical');
      expect(result.message).toContain('EXPIRED');
    });
  });

  describe('Demurrage & Free Time Reminders', () => {
    it('calculates within free time properly (tier 0, $0 cost)', async () => {
      const job = {
        data: {
          type: 'demurrage_warning',
          demurrageData: {
            containerNumber: 'MSKU1234567',
            shipmentRef: 'SHP-2026-001',
            dischargeDate: '2026-09-10T00:00:00.000Z',
            freeDays: 14,
            currentDate: '2026-09-18T00:00:00.000Z', // 8 days elapsed, 6 free remaining
          },
        } as ReminderJobData,
      } as any;

      const result = await processReminderJob(job);
      expect(result.type).toBe('demurrage_warning');
      expect(result.demurrageTier).toBe(0);
      expect(result.demurrageEstimatedCost).toBe(0);
      expect(result.daysRemaining).toBe(6);
      expect(result.alertLevel).toBe('normal');
    });

    it('calculates Tier 1 demurrage when overdue by 4 days', async () => {
      const job = {
        data: {
          type: 'demurrage_warning',
          demurrageData: {
            containerNumber: 'MSKU7654321',
            shipmentRef: 'SHP-2026-002',
            dischargeDate: '2026-09-01T00:00:00.000Z',
            freeDays: 14,
            tier1DailyRate: 30,
            tier2DailyRate: 60,
            currentDate: '2026-09-19T00:00:00.000Z', // 18 days elapsed, 4 days overdue
          },
        } as ReminderJobData,
      } as any;

      const result = await processReminderJob(job);
      expect(result.daysOverdue).toBe(4);
      expect(result.demurrageTier).toBe(1);
      expect(result.demurrageEstimatedCost).toBe(120); // 4 * $30
      expect(result.alertLevel).toBe('warning');
    });

    it('calculates Tier 2 demurrage when overdue by 10 days', async () => {
      const job = {
        data: {
          type: 'demurrage_warning',
          demurrageData: {
            containerNumber: 'CMAU9988776',
            shipmentRef: 'SHP-2026-003',
            dischargeDate: '2026-08-25T00:00:00.000Z',
            freeDays: 14,
            tier1DailyRate: 30,
            tier2DailyRate: 60,
            currentDate: '2026-09-18T00:00:00.000Z', // 24 days elapsed, 10 days overdue
          },
        } as ReminderJobData,
      } as any;

      const result = await processReminderJob(job);
      expect(result.daysOverdue).toBe(10);
      expect(result.demurrageTier).toBe(2);
      // 7 days @ 30 ($210) + 3 days @ 60 ($180) = $390
      expect(result.demurrageEstimatedCost).toBe(390);
      expect(result.alertLevel).toBe('critical');
    });
  });

  describe('ETA Arrival Alerts', () => {
    it('flags critical alert when shipment arrives in <= 24 hours', async () => {
      const imminentEta = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
      const job = {
        data: {
          type: 'eta_alert',
          etaData: {
            shipmentId: 'shp-100',
            trackingNumber: 'TRK-EGY-001',
            portOfDischarge: 'Alexandria Port (EGALY)',
            eta: imminentEta,
            clientName: 'Nile Logistics',
          },
        } as ReminderJobData,
      } as any;

      const result = await processReminderJob(job);
      expect(result.type).toBe('eta_alert');
      expect(result.alertLevel).toBe('critical');
      expect(result.message).toContain('Alexandria Port');
    });
  });
});
