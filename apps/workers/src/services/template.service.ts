import { PdfJobData } from '../queues/queue.types';

export class TemplateService {
  public static render(job: PdfJobData): string {
    if (job.htmlContent) {
      return job.htmlContent;
    }

    const d = job.data || {};
    const title = d.title || job.documentType.toUpperCase().replace('_', ' ');
    const docNumber = d.number || job.documentId;
    const dateStr = d.date || new Date().toISOString().split('T')[0];
    const currency = d.currency || 'USD';
    const items = d.items || [];
    const subtotal = d.subtotal ?? items.reduce((acc, it) => acc + (it.total || 0), 0);
    const taxAmount = d.taxAmount ?? 0;
    const totalAmount = d.totalAmount ?? (subtotal + taxAmount);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title} - ${docNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      padding: 40px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .brand h1 {
      color: #0f172a;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .brand p {
      color: #64748b;
      font-size: 13px;
      margin-top: 4px;
    }
    .meta {
      text-align: right;
    }
    .meta .doc-badge {
      display: inline-block;
      background: #f1f5f9;
      color: #0284c7;
      font-size: 12px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 4px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .meta h2 {
      font-size: 18px;
      color: #334155;
    }
    .meta p {
      color: #64748b;
      font-size: 13px;
    }
    .details-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
      margin-bottom: 30px;
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .details-col h3 {
      font-size: 12px;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .details-col p {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
    }
    .table-container {
      margin-bottom: 30px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    th {
      background: #0f172a;
      color: #ffffff;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 12px 16px;
    }
    td {
      padding: 12px 16px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px;
    }
    tr:nth-child(even) {
      background: #f8fafc;
    }
    .numeric {
      text-align: right;
    }
    .totals {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
    }
    .totals-box {
      width: 300px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;
      color: #475569;
    }
    .totals-row.grand-total {
      border-top: 2px solid #cbd5e1;
      padding-top: 10px;
      margin-top: 10px;
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
      font-size: 12px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <h1>RED SHIPPING & BANNA ERP</h1>
      <p>International Freight Forwarding & Customs Clearance</p>
      ${d.acidNumber ? `<p style="color:#0284c7; font-weight:600; margin-top:4px;">Egyptian ACID: ${d.acidNumber}</p>` : ''}
    </div>
    <div class="meta">
      <div class="doc-badge">${job.documentType}</div>
      <h2># ${docNumber}</h2>
      <p>Date: ${dateStr}</p>
    </div>
  </div>

  <div class="details-grid">
    <div class="details-col">
      <h3>Client / Consignee</h3>
      <p>${d.clientName || 'Valued Client'}</p>
      ${d.clientEmail ? `<p style="font-weight:normal; font-size:12px; color:#64748b;">${d.clientEmail}</p>` : ''}
    </div>
    <div class="details-col">
      <h3>Routing & Transit</h3>
      <p>${d.origin || 'Origin Port'} &rarr; ${d.destination || 'Destination Port'}</p>
      ${d.containerCount ? `<p style="font-weight:normal; font-size:12px; color:#64748b;">Containers: ${d.containerCount}</p>` : ''}
    </div>
  </div>

  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Description</th>
          <th class="numeric">Qty</th>
          <th class="numeric">Unit Price (${currency})</th>
          <th class="numeric">Total (${currency})</th>
        </tr>
      </thead>
      <tbody>
        ${items.length > 0 ? items.map((it, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${it.description}</td>
            <td class="numeric">${it.quantity}</td>
            <td class="numeric">${it.unitPrice.toFixed(2)}</td>
            <td class="numeric">${it.total.toFixed(2)}</td>
          </tr>
        `).join('') : `
          <tr>
            <td>1</td>
            <td>Ocean Freight & Port Logistics Services</td>
            <td class="numeric">1</td>
            <td class="numeric">${totalAmount.toFixed(2)}</td>
            <td class="numeric">${totalAmount.toFixed(2)}</td>
          </tr>
        `}
      </tbody>
    </table>
  </div>

  <div class="totals">
    <div class="totals-box">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>${subtotal.toFixed(2)} ${currency}</span>
      </div>
      <div class="totals-row">
        <span>Tax / VAT</span>
        <span>${taxAmount.toFixed(2)} ${currency}</span>
      </div>
      <div class="totals-row grand-total">
        <span>Total Due</span>
        <span>${totalAmount.toFixed(2)} ${currency}</span>
      </div>
    </div>
  </div>

  ${d.notes ? `
    <div style="background:#f1f5f9; padding:12px 16px; border-radius:6px; font-size:12px; color:#475569; margin-bottom:30px;">
      <strong>Terms & Notes:</strong> ${d.notes}
    </div>
  ` : ''}

  <div class="footer">
    <span>Generated by Banna ERP Gotenberg Pipeline</span>
    <span>Page 1 of 1</span>
  </div>
</body>
</html>`;
  }
}
