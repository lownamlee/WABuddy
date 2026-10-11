import './style.css';
import { PairingApi, ApiError } from './api';
import { PhoneScene } from './phone';
import { qrDeadline, regenerationDisabled, RevisionGate } from './state';
import type { PairingState, Status } from './state';
import { homeTransition, openDashboard } from './home';
import { skipIntro } from './account-session';
import { pairingAccounts } from './pairing-accounts';
import type { LoginTransition } from './login-transition';

const button = document.querySelector<HTMLButtonElement>('#regenerate')!;
const feedback = document.querySelector<HTMLElement>('#feedback')!;
const announcer = document.querySelector<HTMLElement>('#status')!;
const api = new PairingApi();
const gate = new RevisionGate();
let phone: PhoneScene;
let transition: LoginTransition;
let sceneReady = false;
let busy = false;
let linked = false;
let latestState: Pick<PairingState, 'status' | 'can_regenerate'> | null = null;
let imageVersion: string | null = null;
let imageRequest: AbortController | null = null;
let expiryTimer: ReturnType<typeof setTimeout> | undefined;
let pollTimer: ReturnType<typeof setTimeout> | undefined;
let deadline = 0;
let disposed = false;
let dashboardOpened = false;

function clearImage() {
  imageRequest?.abort();
  imageRequest = null;
  imageVersion = null;
  clearTimeout(expiryTimer);
}

function show(status: Status, detail: string) {
  announcer.textContent = detail;
  button.title = detail;
  phone.setStatus(status, detail);
}

function updateButton() { button.disabled = regenerationDisabled(busy, latestState); }

async function applyState(state: PairingState, generation: number, roundTrip: number) {
  if (dashboardOpened) return;
  if (!gate.accept(generation, state.revision)) return;
  feedback.hidden = true;
  latestState = state;
  linked = state.status === 'connected' || state.status === 'paired';
  if (linked) phone.setLoginRequired(false);
  else if (state.status === 'qr') phone.setLoginRequired(true);
  updateButton();
  if (transition.accept(state.status)) {
    clearImage();
    return;
  }
  announcer.textContent = state.detail;
  button.title = state.detail;
  if (state.status !== 'qr' || !state.qr_url || !state.qr_version) {
    clearImage();
    show(state.status, state.detail);
    return;
  }
  deadline = qrDeadline(state, performance.now(), roundTrip);
  clearTimeout(expiryTimer);
  const expire = () => {
    clearImage();
    latestState = { ...state, status: 'refreshing', can_regenerate: false };
    updateButton();
    show('refreshing', 'Refreshing your WhatsApp QR…');
  };
  if (deadline <= performance.now()) { expire(); return; }
  expiryTimer = setTimeout(expire, deadline - performance.now());
  if (imageVersion === state.qr_version) return;
  imageRequest?.abort();
  const controller = new AbortController();
  imageRequest = controller;
  imageVersion = state.qr_version;
  show('connecting', 'Preparing your WhatsApp QR…');
  try {
    const image = await api.image(state.qr_url, controller.signal);
    if (!controller.signal.aborted && gate.accept(generation, state.revision) && deadline > performance.now()) {
      phone.setQr(image);
      announcer.textContent = state.detail;
    }
    image.close();
  } catch (error) {
    if (controller.signal.aborted || generation !== gate.current()) return;
    imageVersion = null;
    if (error instanceof ApiError && error.status === 410) expire();
    else show('error', 'Unable to load the QR. Select Regenerate QR to retry.');
  }
}

async function poll() {
  if (disposed || dashboardOpened) return;
  if (!busy) {
    const generation = gate.current();
    const started = performance.now();
    try {
      const state = await api.request('state');
      await applyState(state, generation, performance.now() - started);
    } catch {
      if (!dashboardOpened && generation === gate.current()) {
        clearImage();
        transition.reset();
        linked = false;
        latestState = { status: 'error', can_regenerate: true };
        updateButton();
        show('error', 'Connection lost. Start WABuddy again, then regenerate the QR.');
      }
    }
  }
  if (!disposed && !dashboardOpened) pollTimer = setTimeout(poll, 750);
}

async function connect(regenerate: boolean) {
  if (dashboardOpened || busy || linked || (regenerate && regenerationDisabled(false, latestState))) return;
  busy = true;
  updateButton();
  const generation = gate.invalidate();
  clearImage();
  show('connecting', 'Connecting to WhatsApp…');
  if (regenerate) phone.restart();
  const started = performance.now();
  try {
    const state = await api.request(regenerate ? 'regenerate' : 'connect', 'POST');
    await applyState(state, generation, performance.now() - started);
  } catch (error) {
    if (dashboardOpened) return;
    transition.reset();
    latestState = { status: 'error', can_regenerate: true };
    show('error', error instanceof Error ? error.message : 'Could not connect. Try again.');
  } finally {
    busy = false;
    updateButton();
  }
}

button.addEventListener('click', () => void connect(true));
window.addEventListener('pagehide', () => {
  disposed = true;
  clearTimeout(pollTimer);
  clearImage();
});
window.addEventListener('pageshow', event => {
  if (event.persisted) { disposed = false; void poll(); }
});

try {
  await api.bootstrap();
  const savedLogin = await pairingAccounts();
  if (skipIntro() && savedLogin) {
    await openDashboard();
    dashboardOpened = true;
  } else {
  phone = new PhoneScene(document.querySelector<HTMLCanvasElement>('#scene')!, !savedLogin);
  await phone.load();
  transition = homeTransition(phone, () => {
    dashboardOpened = true;
    clearTimeout(pollTimer);
    clearImage();
  });
  sceneReady = true;
  await connect(false);
  void poll();
  }
} catch (error) {
  document.querySelector<HTMLElement>('#loading')!.hidden = true;
  const message = error instanceof Error ? error.message : 'Unable to open WABuddy.';
  if (sceneReady && !dashboardOpened) {
    show('error', message);
    button.disabled = false;
    void poll();
  } else if (!dashboardOpened) {
    feedback.hidden = false;
    feedback.textContent = message;
  }
}
