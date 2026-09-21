import { Job } from 'bullmq';
import { ReminderJobData, ReminderJobResult } from '../queues/queue.types.js';

export async function processReminderJob(job: Job<ReminderJobData, ReminderJobResult>): Promise<ReminderJobResult> {
  const data = job.data;
  const now = new Date();

  switch (data.type) {
    case 'acid_expiry': {
      if (!data.acidData) {
        throw new Error('Missing acidData for acid_expiry reminder.');
      }
      const { acidNumber, expiryDate, clientName, shipmentRef } = data.acidData;
      const expiry = new Date(expiryDate);
      const diffMs = expiry.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      let alertLevel: ReminderJobResult['alertLevel'] = 'normal';
      let message = '';

      if (daysRemaining <= 0) {
        alertLevel = 'critical';
        message = `ACID ${acidNumber} (${clientName || 'Client'}, Ref: ${shipmentRef || 'N/A'}) has EXPIRED! Cargo cannot be cleared.`;
      } else if (daysRemaining <= 3) {
        alertLevel = 'critical';
        message = `URGENT: ACID ${acidNumber} expires in ${daysRemaining} day(s)! Expedite customs declaration.`;
      } else if (daysRemaining <= 14) {
        alertLevel = 'warning';
        message = `Notice: ACID ${acidNumber} expires in ${daysRemaining} days. Prepare shipping documents.`;
      } else {
        alertLevel = 'info';
        message = `ACID ${acidNumber} is active with ${daysRemaining} days remaining.`;
      }

      return {
        type: 'acid_expiry',
        alertLevel,
        daysRemaining,
        message,
        notifiedAt: now.toISOString(),
      };
    }

    case 'demurrage_warning': {
      if (!data.demurrageData) {
        throw new Error('Missing demurrageData for demurrage_warning reminder.');
      }
      const {
        containerNumber,
        shipmentRef,
        dischargeDate,
        freeDays,
        tier1DailyRate = 30,
        tier2DailyRate = 60,
        currentDate,
      } = data.demurrageData;

      const evalDate = currentDate ? new Date(currentDate) : now;
      const discharge = new Date(dischargeDate);
      const elapsedDays = Math.floor((evalDate.getTime() - discharge.getTime()) / (1000 * 60 * 60 * 24));
      const daysOverdue = elapsedDays - freeDays;

      if (daysOverdue <= 0) {
        const remainingFree = Math.abs(daysOverdue);
        return {
          type: 'demurrage_warning',
          alertLevel: remainingFree <= 3 ? 'warning' : 'normal',
          daysRemaining: remainingFree,
          daysOverdue: 0,
          demurrageTier: 0,
          demurrageEstimatedCost: 0,
          message: `Container ${containerNumber} (Shipment ${shipmentRef}) is within free time (${remainingFree} free day(s) remaining).`,
          notifiedAt: now.toISOString(),
        };
      }

      // Demurrage has begun
      let tier = 1;
      let cost = 0;

      if (daysOverdue <= 7) {
        tier = 1;
        cost = daysOverdue * tier1DailyRate;
      } else {
        tier = 2;
        const tier1Cost = 7 * tier1DailyRate;
        const tier2Days = daysOverdue - 7;
        cost = tier1Cost + (tier2Days * tier2DailyRate);
      }

      const alertLevel = daysOverdue >= 5 ? 'critical' : 'warning';
      const message = `Demurrage Alert: Container ${containerNumber} is ${daysOverdue} days past free time. Tier ${tier} applied. Est penalty: $${cost}.`;

      return {
        type: 'demurrage_warning',
        alertLevel,
        daysOverdue,
        demurrageTier: tier,
        demurrageEstimatedCost: cost,
        message,
        notifiedAt: now.toISOString(),
      };
    }

    case 'eta_alert': {
      if (!data.etaData) {
        throw new Error('Missing etaData for eta_alert reminder.');
      }
      const { trackingNumber, portOfDischarge, eta, clientName } = data.etaData;
      const etaDate = new Date(eta);
      const hoursRemaining = Math.round((etaDate.getTime() - now.getTime()) / (1000 * 60 * 60));

      let alertLevel: ReminderJobResult['alertLevel'] = 'info';
      if (hoursRemaining <= 24 && hoursRemaining > 0) {
        alertLevel = 'critical';
      } else if (hoursRemaining <= 72 && hoursRemaining > 0) {
        alertLevel = 'warning';
      }

      const message = hoursRemaining <= 0
        ? `Shipment ${trackingNumber} arrived at ${portOfDischarge}. Initiate clearance dossiers immediately.`
        : `Shipment ${trackingNumber} (${clientName || 'Client'}) arriving at ${portOfDischarge} in ~${hoursRemaining} hours.`;

      return {
        type: 'eta_alert',
        alertLevel,
        daysRemaining: Math.max(0, Math.ceil(hoursRemaining / 24)),
        message,
        notifiedAt: now.toISOString(),
      };
    }

    default:
      throw new Error(`Unsupported reminder job type: ${(data as any).type}`);
  }
}
