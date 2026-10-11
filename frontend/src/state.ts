export type Status = 'idle' | 'connecting' | 'qr' | 'refreshing' | 'paired' | 'connected' | 'expired' | 'disconnected' | 'error';
export interface PairingState {
  status: Status;
  detail: string;
  revision: number;
  server_time: number;
  qr_version: string | null;
  expires_at: number | null;
  qr_url: string | null;
  can_regenerate: boolean;
}

export function regenerationDisabled(submitting: boolean, state: Pick<PairingState, 'status' | 'can_regenerate'> | null): boolean {
  return submitting || !state || !state.can_regenerate
    || ['connecting', 'refreshing', 'paired', 'connected'].includes(state.status);
}

/** Local monotonic deadline: a user's incorrectly set clock cannot prolong a QR. */
export function qrDeadline(state: PairingState, receivedAt: number, roundTrip = 0): number {
  if (state.status !== 'qr' || state.expires_at === null) return 0;
  return receivedAt + Math.max(0, (state.expires_at - state.server_time) * 1000 - roundTrip);
}

/** An old image request must never replace a newer QR or a connected screen. */
export class RevisionGate {
  private generation = 0;
  private revision = -1;
  invalidate(): number { this.revision = -1; return ++this.generation; }
  current(): number { return this.generation; }
  accept(generation: number, revision: number): boolean {
    if (generation !== this.generation || revision < this.revision) return false;
    this.revision = revision;
    return true;
  }
}
