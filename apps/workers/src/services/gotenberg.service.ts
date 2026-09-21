import { config } from '../config/index.js';

export class GotenbergService {
  /**
   * Sends an HTML string to Gotenberg's Chromium HTML conversion endpoint.
   * Returns a Buffer containing the rendered PDF.
   */
  public static async convertHtmlToPdf(html: string): Promise<Buffer> {
    const url = `${config.gotenberg.url}/forms/chromium/convert/html`;

    const formData = new FormData();
    const blob = new Blob([html], { type: 'text/html' });
    formData.append('files', blob, 'index.html');

    // Gotenberg Chromium conversion parameters
    formData.append('marginTop', '0.4');
    formData.append('marginBottom', '0.4');
    formData.append('marginLeft', '0.4');
    formData.append('marginRight', '0.4');
    formData.append('preferCssPageSize', 'true');
    formData.append('printBackground', 'true');

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(config.gotenberg.timeoutMs),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown Gotenberg error');
        throw new Error(`Gotenberg HTTP ${response.status}: ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err: any) {
      if (err.name === 'TimeoutError') {
        throw new Error(`Gotenberg conversion timed out after ${config.gotenberg.timeoutMs}ms`);
      }
      throw err;
    }
  }

  /**
   * Health check to ensure Gotenberg service is reachable.
   */
  public static async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${config.gotenberg.url}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
