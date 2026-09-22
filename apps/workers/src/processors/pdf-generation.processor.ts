import fs from 'fs/promises';
import path from 'path';
import { Job } from 'bullmq';
import { PdfJobData, PdfJobResult } from '../queues/queue.types.js';
import { TemplateService } from '../services/template.service.js';
import { GotenbergService } from '../services/gotenberg.service.js';

export async function processPdfJob(job: Job<PdfJobData, PdfJobResult>): Promise<PdfJobResult> {
  const jobData = job.data;
  const fileName = jobData.fileName || `${jobData.documentType}_${jobData.documentId}.pdf`;
  const uploadDir = 'uploads/documents';
  const filePath = path.join(uploadDir, fileName);

  const html = TemplateService.render(jobData);
  const pdfBuffer = await GotenbergService.convertHtmlToPdf(html);

  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(filePath, pdfBuffer);

  return {
    success: true,
    documentId: jobData.documentId,
    fileName,
    filePath,
    sizeBytes: pdfBuffer.length,
    generatedAt: new Date().toISOString(),
  };
}
