import { bindAccount, accountId } from './account-session';
import type { PairingState } from './state';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export class PairingApi {
  private csrf = '';
  private async fetch(path: string, options: RequestInit = {}, timeoutMs = 10000): Promise<Response> {
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
    try {
      return await fetch(path, { ...options, signal, credentials: 'same-origin', cache: 'no-store' });
    } catch (error) {
      if (timeout.aborted) throw new Error('The connection took too long. Please try again.');
      throw error;
    }
  }
  async bootstrap(): Promise<void> {
    const response = await this.fetch('/api/bootstrap');
    if (!response.ok) throw new Error('Cannot reach WABuddy. Restart the local app.');
    const session = await response.json();
    bindAccount(session);
    this.csrf = session.csrf_token;
  }
  async request(path: string, method = 'GET', retry = true): Promise<PairingState> {
    const response = await this.fetch(`/api/whatsapp/${path}`, {
      method,
      headers: { 'X-WABuddy-Account': accountId(), ...(method === 'POST' ? { 'X-CSRF-Token': this.csrf } : {}) },
    }, method === 'POST' ? 15000 : 10000);
    if (response.status === 401 && retry) {
      await this.bootstrap();
      return this.request(path, method, false);
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new ApiError(response.status, body.detail || 'Cannot reach WhatsApp. Try regenerating the QR.');
    }
    return response.json();
  }
  async image(url: string, signal: AbortSignal): Promise<ImageBitmap> {
    const response = await this.fetch(url, { signal, headers: {'X-WABuddy-Account': accountId()} });
    if (!response.ok) throw new ApiError(response.status, 'Pairing QR expired. Request a fresh code.');
    return createImageBitmap(await response.blob());
  }
}
