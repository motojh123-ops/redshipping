import fs from 'fs/promises';
import path from 'path';
import { Job } from 'bullmq';
import { config } from '../config/index.js';
import { PdfJobData, PdfJobResult } from '../queues/queue.types.js';
import { TemplateService } from '../services/template.service.js';
import { GotenbergService } from '../services/gotenberg.service.js';

export async function processPdfJob(job: Job<PdfJobData, PdfJobResult>): Promise<PdfJobResult> {
  const data = job.data;
  if (!data || !data.documentId) {
    throw new Error('Invalid PDF job: documentId is required.');
  }

  const fileName = data.fileName || `${data.documentType}_${data.documentId}_${Date.now()}.pdf`;
  const html = TemplateService.render(data);

  // Convert via Gotenberg
  const pdfBuffer = await GotenbergService.convertHtmlToPdf(html);

  // Ensure documents directory exists
  const targetDir = config.storage.documentsDir;
  await fs.mkdir(targetDir, { recursive: true });

  const filePath = path.join(targetDir, fileName);
  await fs.writeFile(filePath, pdfBuffer);

  return {
    success: true,
    filePath,
    fileName,
    sizeBytes: pdfBuffer.length,
    generatedAt: new Date().toISOString(),
  };
}
