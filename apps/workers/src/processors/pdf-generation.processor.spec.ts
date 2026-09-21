import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import { TemplateService } from '../services/template.service.js';
import { GotenbergService } from '../services/gotenberg.service.js';
import { processPdfJob } from './pdf-generation.processor.js';
import { PdfJobData } from '../queues/queue.types.js';

describe('PDF Generation Processor & Templates', () => {
  describe('TemplateService', () => {
    it('generates an invoice HTML document with logistics and financial fields', () => {
      const jobData: PdfJobData = {
        documentType: 'invoice',
        documentId: 'INV-2026-0042',
        data: {
          number: 'INV-2026-0042',
          date: '2026-09-21',
          clientName: 'Suez Canal Container Terminal',
          acidNumber: '445566778899',
          origin: 'EGPSD',
          destination: 'NLRTM',
          currency: 'USD',
          items: [
            { description: '20ft General Purpose Freight', quantity: 2, unitPrice: 1400, total: 2800 },
            { description: 'Terminal Handling Charges (THC)', quantity: 2, unitPrice: 150, total: 300 },
          ],
          subtotal: 3100,
          taxAmount: 434,
          totalAmount: 3534,
          notes: 'Payable within 15 days upon B/L release.',
        },
      };

      const html = TemplateService.render(jobData);
      expect(html).toContain('INV-2026-0042');
      expect(html).toContain('Suez Canal Container Terminal');
      expect(html).toContain('445566778899');
      expect(html).toContain('3534.00 USD');
      expect(html).toContain('Terminal Handling Charges (THC)');
    });

    it('returns custom htmlContent directly when provided', () => {
      const customHtml = '<html><body><h1>Custom B/L Document</h1></body></html>';
      const jobData: PdfJobData = {
        documentType: 'bill_of_lading',
        documentId: 'BL-999',
        htmlContent: customHtml,
      };

      const rendered = TemplateService.render(jobData);
      expect(rendered).toBe(customHtml);
    });
  });

  describe('processPdfJob with Gotenberg integration', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(async () => {
      // Clean up any test generated file
      try {
        await fs.rm('uploads/documents/test_invoice.pdf', { force: true });
      } catch {}
    });

    it('successfully processes job and writes PDF file when Gotenberg converts HTML', async () => {
      const fakePdfBuffer = Buffer.from('%PDF-1.4 Fake PDF Content');
      vi.spyOn(GotenbergService, 'convertHtmlToPdf').mockResolvedValue(fakePdfBuffer);

      const job = {
        data: {
          documentType: 'invoice',
          documentId: 'TEST-001',
          fileName: 'test_invoice.pdf',
          data: {
            title: 'Test Commercial Invoice',
            totalAmount: 500,
          },
        } as PdfJobData,
      } as any;

      const result = await processPdfJob(job);

      expect(result.success).toBe(true);
      expect(result.fileName).toBe('test_invoice.pdf');
      expect(result.sizeBytes).toBe(fakePdfBuffer.length);
      expect(GotenbergService.convertHtmlToPdf).toHaveBeenCalledOnce();
    });

    it('fails fast and throws when Gotenberg engine reports failure', async () => {
      vi.spyOn(GotenbergService, 'convertHtmlToPdf').mockRejectedValue(
        new Error('Gotenberg HTTP 500: Chromium crash')
      );

      const job = {
        data: {
          documentType: 'invoice',
          documentId: 'FAIL-001',
        } as PdfJobData,
      } as any;

      await expect(processPdfJob(job)).rejects.toThrow('Gotenberg HTTP 500');
    });
  });
});
