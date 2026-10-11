import { LoginTransition } from './login-transition';
import type { PhoneScene } from './phone';
import { skipIntro } from './account-session';
import { greenWallpaper } from './green-screen';

export async function openDashboard() {
  const background = document.querySelector<HTMLElement>('#green-background')!;
  if (!background.style.backgroundImage) background.style.backgroundImage = `url(${greenWallpaper().toDataURL()})`;
  const { mountDashboard } = await import('./dashboard');
  const workspace = document.querySelector<HTMLElement>('#dashboard')!;
  mountDashboard(workspace);
  workspace.hidden = false;
  document.querySelector<HTMLElement>('#home')!.hidden = true;
  document.querySelector<HTMLElement>('.controls')!.hidden = true;
  document.querySelector<HTMLElement>('#loading')!.hidden = true;
  document.body.dataset.stage = 'dashboard';
  document.querySelector<HTMLElement>('#status')!.textContent = 'WABuddy dashboard.';
  requestAnimationFrame(() => workspace.querySelector<HTMLElement>('#dashboard-content')?.focus({ preventScroll: true }));
}

export function homeTransition(phone: PhoneScene, onDashboardOpen: () => void = () => {}): LoginTransition {
  const home = document.querySelector<HTMLElement>('#home')!;
  const brand = document.querySelector<HTMLElement>('#brand')!;
  const controls = document.querySelector<HTMLElement>('.controls')!;
  const announcer = document.querySelector<HTMLElement>('#status')!;
  const workspace = document.querySelector<HTMLElement>('#dashboard')!;
  let splashTimer: ReturnType<typeof setTimeout> | undefined;
  // Load the workspace while the phone animates so the brief splash stays smooth.
  const dashboardModule = import('./dashboard');
  const flow = new LoginTransition({
    enter: complete => {
      if (skipIntro()) { phone.stopRendering(); complete(); return; }
      document.body.dataset.stage = 'entering';
      controls.inert = true;
      announcer.textContent = 'Opening WABuddy.';
      phone.enterHome(complete);
    },
    reveal: () => {
      if (skipIntro()) {
        onDashboardOpen();
        void openDashboard().catch(() => { announcer.textContent = 'Unable to load dashboard. Please reload.'; });
        return;
      }
      home.hidden = false;
      controls.hidden = true;
      document.body.dataset.stage = 'home';
      announcer.textContent = 'Welcome to WABuddy.';
      brand.focus({ preventScroll: true });
      // 250 ms fade in, 500 ms fully visible, 250 ms fade out.
      splashTimer = setTimeout(() => {
        void dashboardModule.then(({ mountDashboard }) => {
          if (document.body.dataset.stage !== 'home') return;
          mountDashboard(workspace);
          workspace.hidden = false;
          home.hidden = true;
          document.body.dataset.stage = 'dashboard';
          announcer.textContent = 'WABuddy dashboard. Connected WhatsApp workspace.';
          requestAnimationFrame(() => workspace.querySelector<HTMLElement>('#dashboard-content')?.focus({ preventScroll: true }));
        }).catch(() => {
          announcer.textContent = 'Unable to load the dashboard. Please reload the page.';
          brand.style.opacity = '1';
        });
      }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 500 : 1000);
    },
    reset: () => {
      clearTimeout(splashTimer);
      workspace.hidden = true;
      home.hidden = true;
      controls.hidden = false;
      controls.inert = false;
      document.body.dataset.stage = 'pairing';
      phone.cancelEntry();
    },
  });
  const dashboard = document.querySelector<HTMLButtonElement>('#enter-dashboard')!;
  dashboard.disabled = false;
  dashboard.addEventListener('click', () => {
    onDashboardOpen();
    flow.open();
  });
  return flow;
}
